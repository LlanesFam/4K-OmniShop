/**
 * Notification Service
 *
 * Wraps the Tauri notification plugin with app-level helpers.
 * Preference checks (enabled/disabled per type) are read from the auth store
 * so the user can control each notification category from Settings.
 */

import { requestNotificationPermission, sendNativeNotification } from '@/lib/tauri'

/** Ensure permission is granted before sending any notification. */
export async function ensureNotificationPermission(): Promise<boolean> {
  return requestNotificationPermission()
}

/**
 * Sends an "Update Available" notification if the user has it enabled.
 *
 * @param version - The new version string, e.g. "1.2.0".
 */
export async function notifyUpdateAvailable(version: string): Promise<void> {
  try {
    const { useAuthStore } = await import('@/store/useAuthStore')
    const prefs = useAuthStore.getState().profile?.preferences
    // Default to true when not yet configured
    if (prefs?.notifications?.updateAvailable === false) return

    const granted = await ensureNotificationPermission()
    if (!granted) return

    await sendNativeNotification(
      'OmniShop Update Ready',
      `Version ${version} has been downloaded and is ready to install.`
    )
  } catch {
    // Never throw from a notification helper
  }
}

/**
 * Sends a "New User Pending Approval" notification to admin users.
 *
 * @param displayName - The new user's display name.
 */
export async function notifyNewUserPending(displayName: string): Promise<void> {
  try {
    const { useAuthStore } = await import('@/store/useAuthStore')
    const { profile } = useAuthStore.getState()
    // Only admins receive this notification
    if (profile?.role !== 'admin') return
    if (profile?.preferences?.notifications?.newUserApproval === false) return

    const granted = await ensureNotificationPermission()
    if (!granted) return

    await sendNativeNotification(
      'New User Pending Approval',
      `${displayName} has signed up and is awaiting your approval.`
    )
  } catch {
    // Never throw from a notification helper
  }
}
