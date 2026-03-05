import { create } from 'zustand'
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithRedirect,
  deleteUser,
  reload
} from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  collection,
  where,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { subscribeUserPreferences } from '@/lib/userPreferencesService'

// ─── Public Types ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user'
export type UserStatus = 'pending' | 'approved' | 'rejected'

/**
 * Mirror of the Firestore `users/{uid}` document structure.
 */
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  role: UserRole
  status: UserStatus
  /** Set by an admin when the account is rejected. */
  rejectionReason?: string
  createdAt: Timestamp
  /** User preferences synced from Firestore (theme, notifications, etc.) */
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  colorTheme?: string
  notifications?: {
    updateAvailable?: boolean
    newUserApproval?: boolean
  }
  autoUpdate?: boolean
}

export interface AuthError {
  code: string
  message: string
}

interface AuthState {
  user: FirebaseUser | null
  profile: UserProfile | null
  /** True while onAuthStateChanged has not yet fired for the first time. */
  loading: boolean
  /** True while the Firestore profile document is being fetched. */
  profileLoading: boolean
  error: AuthError | null

  // ── Actions ──────────────────────────────────────────────────────────────
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /**
   * Reloads the Firebase user object to pick up the latest emailVerified flag.
   * @returns `true` if the email is now verified.
   */
  refreshUser: () => Promise<boolean>
  /**
   * Re-fetches the Firestore profile for the current user and updates the store.
   * Call this when an external change (e.g. admin approval) may have occurred.
   */
  refreshProfile: () => Promise<void>
  resendVerificationEmail: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  /**
   * Permanently deletes the current user's Auth account and archives the shop.
   * Requires a recent Google re-authentication for Google users.
   */
  deleteAccount: () => Promise<void>
  clearError: () => void
}

// ─── Error Formatter ─────────────────────────────────────────────────────────

/**
 * Maps Firebase Auth error codes to human-readable messages.
 *
 * @param code - The Firebase error code string (e.g. `auth/wrong-password`).
 * @returns A user-friendly error message.
 */
function formatAuthError(code: string): string {
  const MSG: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 8 characters.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
    'auth/cancelled-popup-request': '',
    'auth/redirect-cancelled-by-user': '',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/requires-recent-login': 'Please log out and log in again to continue.'
  }
  return MSG[code] ?? `An unexpected error occurred. (${code})`
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

/**
 * Fetches a user's Firestore profile document.
 *
 * @param uid - The Firebase Auth UID.
 * @returns The UserProfile, or null if not found or on error.
 */
async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  } catch {
    return null
  }
}

/**
 * Creates a new `pending` Firestore user profile document.
 *
 * Uses a transaction to guarantee the write only happens when no document
 * exists yet. This protects existing profiles (e.g. an admin role that was
 * assigned manually) from being accidentally overwritten by `setDoc`.
 *
 * @param uid - Firebase Auth UID.
 * @param displayName - User's full name.
 * @param email - User's email address.
 */
async function createUserProfile(uid: string, displayName: string, email: string): Promise<void> {
  const ref = doc(db, 'users', uid)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    // Only create the document if it does not already exist.
    if (!snap.exists()) {
      tx.set(ref, {
        uid,
        displayName,
        email: email.toLowerCase().trim(),
        role: 'user' satisfies UserRole,
        status: 'pending' satisfies UserStatus,
        createdAt: serverTimestamp()
      })
    }
  })
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  /**
   * Signs the user in with email and password.
   * Throws on failure; error is also stored in `state.error`.
   */
  login: async (email, password) => {
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // onAuthStateChanged handles setting user + profile
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'auth/internal-error'
      set({ error: { code, message: formatAuthError(code) } })
      throw err
    }
  },

  /**
   * Initiates Google OAuth sign-in via a full-page redirect.
   * The Tauri WebView navigates to Google's auth page; on return,
   * `getRedirectResult` (called at module level) picks up the credential
   * and creates a pending Firestore profile for first-time Google users.
   */
  loginWithGoogle: async () => {
    set({ error: null })
    try {
      const provider = new GoogleAuthProvider()
      // Force the account-picker every time so users can switch accounts
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithRedirect(auth, provider)
      // The webview will navigate away; execution does not continue past here.
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'auth/internal-error'
      if (code === 'auth/redirect-cancelled-by-user') return
      set({ error: { code, message: formatAuthError(code) } })
      throw err
    }
  },

  /**
   * Creates a new email/password account, sends a verification email,
   * and writes a pending Firestore profile document.
   *
   * @param name - User's full display name.
   * @param email - User's email address.
   * @param password - Chosen password (min 8 chars, enforced by Zod schema).
   */
  signUp: async (name, email, password) => {
    set({ error: null })
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      // Apply display name to Firebase Auth profile
      await updateProfile(cred.user, { displayName: name.trim() })
      // Send verification email
      await sendEmailVerification(cred.user)
      // Persist Firestore profile with pending status
      await createUserProfile(cred.user.uid, name.trim(), email)
      // Manually update local state (onAuthStateChanged may not fire again here)
      set({ user: cred.user, profile: null, loading: false, profileLoading: false })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'auth/internal-error'
      set({ error: { code, message: formatAuthError(code) } })
      throw err
    }
  },

  logout: async () => {
    // Show the global loading overlay during the sign-out → redirect transition
    set({ loading: true })
    await signOut(auth)
    // Clear shop subscription + state so it doesn't leak to the next session
    const { clearShop } = await import('@/store/useShopStore').then((m) =>
      m.useShopStore.getState()
    )
    clearShop()
    set({ user: null, profile: null, error: null })
  },

  /**
   * Reloads the Firebase user to pick up the latest emailVerified flag.
   * Call this after the user clicks "I've verified my email" in VerifyEmail page.
   *
   * @returns `true` if the email is now verified.
   */
  refreshUser: async () => {
    const { user } = get()
    if (!user) return false
    try {
      await reload(user)
      // Trigger a re-render by spreading user into a new object reference
      const refreshed = auth.currentUser
      if (refreshed) set({ user: refreshed })
      return refreshed?.emailVerified ?? false
    } catch {
      return false
    }
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const profile = await fetchUserProfile(user.uid)
    useAuthStore.setState({ profile })
  },

  resendVerificationEmail: async () => {
    const { user } = get()
    if (!user) throw new Error('No authenticated user.')
    await sendEmailVerification(user)
  },

  /**
   * Sends a password-reset email to the given address.
   *
   * @param email - The email address to send the reset link to.
   */
  sendPasswordReset: async (email) => {
    set({ error: null })
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'auth/internal-error'
      set({ error: { code, message: formatAuthError(code) } })
      throw err
    }
  },

  /**
   * Permanently deletes the current user's Auth account.
   * For Google users, triggers `reauthenticateWithRedirect` first if the
   * session is too old (Firebase requires recent login for account deletion).
   * Also archives the shop document: sets status → 'archived'.
   */
  deleteAccount: async () => {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error('Not authenticated.')

    try {
      // Archive the shop before deleting auth so Firestore rules still allow the write
      try {
        await updateDoc(doc(db, 'shops', user.uid), {
          status: 'archived',
          archivedAt: serverTimestamp(),
          archivedReason: 'account_deleted'
        })
      } catch {
        // Shop might not exist yet — that's fine
      }
      // Remove the users/{uid} profile document
      try {
        await deleteDoc(doc(db, 'users', user.uid))
      } catch {
        // Best-effort
      }
      // Delete Firebase Auth account
      await deleteUser(user)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'auth/internal-error'
      // Session too old — Google users need to re-authenticate via redirect
      if (code === 'auth/requires-recent-login') {
        const isGoogle = user.providerData?.some((p) => p.providerId === 'google.com')
        if (isGoogle) {
          const provider = new GoogleAuthProvider()
          await reauthenticateWithRedirect(user, provider)
          return // Page will navigate away; user lands back and deletion resumes
        }
      }
      set({ error: { code, message: formatAuthError(code) } })
      throw err
    }
  }
}))

// ─── Auth State Listener ─────────────────────────────────────────────────────

/** Holds the active Firestore preferences subscription so we can cancel it on logout. */
let _prefsUnsubscribe: (() => void) | null = null
/** Holds the admin pending-users subscription so we can cancel it on logout. */
let _pendingUsersUnsubscribe: (() => void) | null = null
/** UIDs we've already notified this session — prevents duplicate toasts on re-subscription. */
const _notifiedPendingUids = new Set<string>()

/**
 * Fires once on startup and on every auth state change.
 * Fetches the Firestore UserProfile after confirming Firebase Auth resolves.
 * Also subscribes to real-time preferences so theme / notification settings
 * stay in sync across devices.
 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    useAuthStore.setState({ user, profileLoading: true })
    const profile = await fetchUserProfile(user.uid)
    useAuthStore.setState({ profile, loading: false, profileLoading: false })

    // Subscribe to real-time preference updates and apply them to the theme store
    _prefsUnsubscribe?.()
    _prefsUnsubscribe = subscribeUserPreferences(user.uid, (prefs) => {
      // Update the stored profile with latest preferences
      useAuthStore.setState((s) => ({
        profile: s.profile ? { ...s.profile, preferences: prefs } : s.profile
      }))
      // Apply theme preferences without triggering another Firestore write
      // (import lazily to avoid module initialisation order issues)
      void import('@/store/useThemeStore').then(({ applyTheme, useThemeStore }) => {
        const store = useThemeStore.getState()
        const theme = prefs.theme ?? store.theme
        const colorTheme = prefs.colorTheme ?? store.colorTheme
        // Only apply if actually different to avoid needless DOM thrash
        if (theme !== store.theme || colorTheme !== store.colorTheme) {
          applyTheme(
            theme as Parameters<typeof applyTheme>[0],
            colorTheme as Parameters<typeof applyTheme>[1]
          )
          useThemeStore.setState({
            theme: theme as Parameters<typeof applyTheme>[0],
            colorTheme: colorTheme as Parameters<typeof applyTheme>[1]
          })
        }
      })
    })

    // Admin-only: watch for newly registered pending users and push a native notification
    if (profile?.role === 'admin') {
      _pendingUsersUnsubscribe?.()
      _pendingUsersUnsubscribe = onSnapshot(
        query(collection(db, 'users'), where('status', '==', 'pending')),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return
            const uid = change.doc.id
            // Skip UIDs we've already notified this session (avoids duplicate alerts on re-sub)
            if (_notifiedPendingUids.has(uid)) return
            _notifiedPendingUids.add(uid)
            const data = change.doc.data() as { displayName?: string }
            void import('@/lib/notificationService').then(({ notifyNewUserPending }) => {
              void notifyNewUserPending(data.displayName ?? 'A new user')
            })
          })
        }
      )
    }
  } else {
    _prefsUnsubscribe?.()
    _prefsUnsubscribe = null
    _pendingUsersUnsubscribe?.()
    _pendingUsersUnsubscribe = null
    _notifiedPendingUids.clear()
    useAuthStore.setState({ user: null, profile: null, loading: false, profileLoading: false })
  }
})

// ─── Google Redirect Result Handler ──────────────────────────────────────────

/**
 * Picks up the result of a `signInWithRedirect` call when the app relaunches
 * after the Google OAuth flow.  Creates a pending Firestore profile for
 * first-time Google sign-ins (same guarantee as the old popup path).
 */
getRedirectResult(auth)
  .then(async (result) => {
    if (!result?.user) return
    const existing = await fetchUserProfile(result.user.uid)
    if (!existing) {
      await createUserProfile(
        result.user.uid,
        result.user.displayName ?? 'Google User',
        result.user.email ?? ''
      )
    }
  })
  .catch(() => {
    // No redirect result or already handled — safe to ignore
  })
