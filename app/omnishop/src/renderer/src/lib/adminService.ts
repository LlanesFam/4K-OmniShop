/**
 * Admin Firestore Service
 *
 * Pure Firestore operations for admin-only actions.
 * All mutations target the `users/{uid}` collection.
 * Auth-level deletion requires Firebase Admin SDK (server-side); here we only
 * manage the Firestore profile document.
 */

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserProfile, UserRole, UserStatus } from '@/store/useAuthStore'
import type { ShopProfile } from '@/lib/shopService'

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * Live subscription to users with status === 'pending'.
 * Returns an unsubscribe function.
 */
export function subscribeToPendingUsers(
  callback: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // NOTE: Combining where() + orderBy() on different fields requires a composite
  // Firestore index. To avoid that requirement we filter by status only and sort
  // client-side instead.
  const q = query(collection(db, 'users'), where('status', '==', 'pending' satisfies UserStatus))
  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs
        .map((d) => d.data() as UserProfile)
        .sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0
          const bMs = b.createdAt?.toMillis?.() ?? 0
          return aMs - bMs
        })
      callback(users)
    },
    (err) => onError?.(err)
  )
}

/**
 * Live subscription to ALL users, ordered by creation date descending.
 * Returns an unsubscribe function.
 */
export function subscribeToAllUsers(
  callback: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => d.data() as UserProfile)),
    (err) => onError?.(err)
  )
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Approves a pending user account. */
export async function approveUser(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status: 'approved' satisfies UserStatus,
    rejectionReason: null
  })
}

/** Rejects a user account with an optional reason. */
export async function rejectUser(uid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status: 'rejected' satisfies UserStatus,
    rejectionReason: reason.trim() || 'No reason provided.'
  })
}

/** Suspends an approved user (moves them back to rejected). */
export async function suspendUser(uid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status: 'rejected' satisfies UserStatus,
    rejectionReason: reason.trim() || 'Account suspended by admin.'
  })
}

/** Reactivates a rejected/suspended user. */
export async function reactivateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status: 'approved' satisfies UserStatus,
    rejectionReason: null
  })
}

/** Changes the role of a user. */
export async function changeUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}

/**
 * Permanently deletes a user's Firestore profile document.
 * NOTE: This does NOT delete the Firebase Auth account (requires Admin SDK server-side).
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid))
}

// ─── Shop Admin ───────────────────────────────────────────────────────────────

/**
 * Live subscription to ALL registered shop profiles ordered by creation date desc.
 * Returns an unsubscribe function.
 */
export function subscribeToAllShops(
  callback: (shops: ShopProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'shops'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => d.data() as ShopProfile)),
    (err) => onError?.(err)
  )
}
