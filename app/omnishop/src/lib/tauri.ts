/**
 * lib/tauri.ts
 *
 * Thin abstraction layer over the Tauri v2 JS API.
 * Replaces the Electron `window.api` / `window.electron` IPC bridge.
 *
 * All platform-specific interactions (quit, devtools, updates, window mode)
 * are centralised here so the rest of the renderer never imports Tauri
 * packages directly.
 */

import { exit, relaunch } from '@tauri-apps/plugin-process'
import { type Update } from '@tauri-apps/plugin-updater'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'
import type { WhatsNewPayload } from '@/store/updater-types'

// ── Pending update reference ──────────────────────────────────────────────────
// Written by useUpdater.ts once a background download finishes.
// Read by installUpdate() when the user clicks "Install & Restart".
let _pendingUpdate: Update | null = null

export function setPendingUpdate(u: Update | null): void {
  _pendingUpdate = u
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

/** Close the application immediately. */
export async function quitApp(): Promise<void> {
  await exit(0)
}

// ── DevTools ──────────────────────────────────────────────────────────────────

/**
 * Open Tauri DevTools.
 * Only functional in debug builds — silently ignored in production.
 */
export async function openDevTools(): Promise<void> {
  // Tauri exposes openDevtools() only in debug builds and it isn't yet typed
  // in @tauri-apps/api. We reach through the raw object to call it safely.
  if (import.meta.env.DEV) {
    const win = getCurrentWindow()
    type MaybeDebugWindow = typeof win & { openDevtools?: () => Promise<void> }
    const dbgWin = win as MaybeDebugWindow
    if (typeof dbgWin.openDevtools === 'function') {
      await dbgWin.openDevtools()
    }
  }
}

// ── Updater ───────────────────────────────────────────────────────────────────

/**
 * No-op stub so UpdateBadge's retry button compiles cleanly.
 * The actual update check + download is driven by the `useUpdater` hook
 * which runs on dashboard mount.
 */
export async function checkForUpdates(): Promise<void> {
  // intentional no-op — see useUpdater.ts
}

/** Install the already-downloaded update and relaunch the app. */
export async function installUpdate(): Promise<void> {
  if (!_pendingUpdate) return
  await _pendingUpdate.install()
  await relaunch()
}

// ── What's New ────────────────────────────────────────────────────────────────
// localStorage keys — keep in sync with useUpdater.ts
const PENDING_KEY = 'omnishop-pending-whats-new'
const LAST_VERSION_KEY = 'omnishop-last-seen-version'

/**
 * Called on every dashboard mount.
 *
 * If a pending "what's new" entry exists in localStorage (written just before
 * `installUpdate()` triggers the relaunch) and the version hasn't been
 * acknowledged yet, fire `openWhatsNew` and mark it as seen.
 *
 * Mirrors the Electron `app:whats-new` IPC push from `updater.ts`.
 */
export function checkWhatsNewOnLaunch(openWhatsNew: (payload: WhatsNewPayload) => void): void {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return

    const { version, notes } = JSON.parse(raw) as { version: string; notes: string }
    const lastSeen = localStorage.getItem(LAST_VERSION_KEY)
    if (lastSeen === version) return // Already shown for this version

    // Delay to let the dashboard finish rendering (mirrors the 1500ms in updater.ts)
    setTimeout(() => {
      openWhatsNew({ version, releaseNotes: notes })
      localStorage.setItem(LAST_VERSION_KEY, version)
      localStorage.removeItem(PENDING_KEY)
    }, 1500)
  } catch {
    // Malformed entry — clear silently
    localStorage.removeItem(PENDING_KEY)
  }
}

// ── Display / Window ──────────────────────────────────────────────────────────

export type DisplayMode = 'fullscreen' | 'windowed' | 'borderless'

/**
 * Apply display mode + resolution to the Tauri window.
 * Replaces the `update-display` IPC channel from the Electron main process.
 */
export async function applyDisplay(
  mode: DisplayMode,
  width: number,
  height: number
): Promise<void> {
  const win = getCurrentWindow()

  if (mode === 'fullscreen') {
    await win.setFullscreen(true)
  } else {
    await win.setFullscreen(false)
    await win.setSize(new LogicalSize(width, height))
    await win.setDecorations(mode !== 'borderless')
  }
}

// ── Autostart ─────────────────────────────────────────────────────────────────

export async function isAutostartEnabled(): Promise<boolean> {
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return await isEnabled()
  } catch {
    return false
  }
}

export async function setAutostart(enabled: boolean): Promise<void> {
  try {
    const { enable, disable } = await import('@tauri-apps/plugin-autostart')
    if (enabled) {
      await enable()
    } else {
      await disable()
    }
  } catch {
    // Plugin unavailable in dev / web — ignore
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { isPermissionGranted, requestPermission } =
      await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      const permission = await requestPermission()
      granted = permission === 'granted'
    }
    return granted
  } catch {
    return false
  }
}

export async function sendNativeNotification(title: string, body: string): Promise<void> {
  try {
    const { sendNotification } = await import('@tauri-apps/plugin-notification')
    await sendNotification({ title, body })
  } catch {
    // Plugin unavailable in dev / web — fall back silently
    console.info(`[notification] ${title}: ${body}`)
  }
}
