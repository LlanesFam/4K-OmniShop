/**
 * User Preferences Firestore Service
 *
 * Stores per-user settings in the `users/{uid}` document under the
 * `preferences` sub-object so they survive log-ins on different devices.
 *
 * Schema mirrors `UserPreferences` in useAuthStore.ts.
 */

import { doc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserPreferences } from '@/store/useAuthStore'

/**
 * Persists a partial preferences update to Firestore.
 * Fire-and-forget — callers should not await unless they need confirmation.
 *
 * @param uid  - The Firebase Auth UID of the current user.
 * @param data - Partial preferences to merge into `users/{uid}.preferences`.
 */
export async function updateUserPreferences(
  uid: string,
  data: Partial<UserPreferences>
): Promise<void> {
  const ref = doc(db, 'users', uid)
  // Build a dot-notation patch so we don't overwrite sibling preference keys
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        patch[`preferences.${key}.${subKey}`] = subValue
      }
    } else {
      patch[`preferences.${key}`] = value
    }
  }
  await updateDoc(ref, patch)
}

/**
 * Subscribes to real-time preference updates for a user.
 *
 * @param uid      - The Firebase Auth UID.
 * @param callback - Called every time preferences change in Firestore.
 * @returns        A Firestore unsubscribe function.
 */
export function subscribeUserPreferences(
  uid: string,
  callback: (prefs: UserPreferences) => void
): Unsubscribe {
  const ref = doc(db, 'users', uid)
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return
    const prefs = (snap.data()?.preferences ?? {}) as UserPreferences
    callback(prefs)
  })
}
