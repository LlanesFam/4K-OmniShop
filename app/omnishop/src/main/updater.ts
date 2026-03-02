import { app, ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { autoUpdater } from 'electron-updater'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpdateStatusPayload =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'downloaded'; version: string; releaseNotes: string }
  | { state: 'error'; message: string }

export interface WhatsNewPayload {
  version: string
  releaseNotes: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function send(channel: string, payload: unknown): void {
  getMainWindow()?.webContents.send(channel, payload)
}

function normalizeReleaseNotes(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return (raw as { note?: string; version?: string }[])
      .map((n) => n.note ?? '')
      .filter(Boolean)
      .join('\n\n')
  }
  return ''
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

const LAST_VERSION_FILE = (): string => join(app.getPath('userData'), 'last-seen-version.json')
const PENDING_WHATS_NEW_FILE = (): string => join(app.getPath('userData'), 'pending-whats-new.json')

function readLastSeenVersion(): string | null {
  try {
    const f = LAST_VERSION_FILE()
    if (!existsSync(f)) return null
    return (JSON.parse(readFileSync(f, 'utf-8')) as { version: string }).version
  } catch {
    return null
  }
}

function writeLastSeenVersion(version: string): void {
  try {
    writeFileSync(LAST_VERSION_FILE(), JSON.stringify({ version }), 'utf-8')
  } catch {
    /* ignore */
  }
}

function writePendingWhatsNew(payload: WhatsNewPayload): void {
  try {
    writeFileSync(PENDING_WHATS_NEW_FILE(), JSON.stringify(payload), 'utf-8')
  } catch {
    /* ignore */
  }
}

function consumePendingWhatsNew(): WhatsNewPayload | null {
  try {
    const f = PENDING_WHATS_NEW_FILE()
    if (!existsSync(f)) return null
    const data = JSON.parse(readFileSync(f, 'utf-8')) as WhatsNewPayload
    unlinkSync(f)
    return data
  } catch {
    return null
  }
}

// ─── initUpdater ──────────────────────────────────────────────────────────────

export function initUpdater(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowPrerelease = true // allow beta/rc releases to be offered as updates
  autoUpdater.logger = console

  const currentVersion = app.getVersion()
  let downloadingVersion = ''

  // ── What's New: check if we just updated ──────────────────────────────────
  const lastSeen = readLastSeenVersion()
  const pending = consumePendingWhatsNew()
  const justUpdated = lastSeen !== null && lastSeen !== currentVersion

  // Always update the stored version to current
  writeLastSeenVersion(currentVersion)

  // If we just updated and have saved release notes, deliver them to the renderer
  // after it finishes loading.
  if (justUpdated && pending && pending.version === currentVersion) {
    const win = getMainWindow()
    if (win) {
      const sendWhatsNew = (): void => {
        win.webContents.send('app:whats-new', pending)
      }
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', sendWhatsNew)
      } else {
        // Short delay so the renderer's React tree + listeners are mounted
        setTimeout(sendWhatsNew, 1500)
      }
    }
  }

  // ── autoUpdater events ────────────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    send('updater:status', { state: 'checking' } satisfies UpdateStatusPayload)
  })

  autoUpdater.on('update-available', (info) => {
    downloadingVersion = info.version
    send('updater:status', {
      state: 'available',
      version: info.version
    } satisfies UpdateStatusPayload)
  })

  autoUpdater.on('update-not-available', () => {
    send('updater:status', { state: 'idle' } satisfies UpdateStatusPayload)
  })

  autoUpdater.on('download-progress', (progress) => {
    getMainWindow()?.setProgressBar(progress.percent / 100)
    send('updater:status', {
      state: 'downloading',
      version: downloadingVersion,
      percent: Math.round(progress.percent)
    } satisfies UpdateStatusPayload)
  })

  autoUpdater.on('update-downloaded', (info) => {
    getMainWindow()?.setProgressBar(-1) // clear taskbar progress bar
    const releaseNotes = normalizeReleaseNotes(info.releaseNotes)

    // Persist so we can show "What's New" after restart
    writePendingWhatsNew({ version: info.version, releaseNotes })

    send('updater:status', {
      state: 'downloaded',
      version: info.version,
      releaseNotes
    } satisfies UpdateStatusPayload)
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater]', err)
    getMainWindow()?.setProgressBar(-1)
    send('updater:status', {
      state: 'error',
      message: err.message ?? String(err)
    } satisfies UpdateStatusPayload)
  })

  // ── IPC handlers ──────────────────────────────────────────────────────────

  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates())

  // Silent install: /S flag suppresses NSIS wizard, true = restart immediately
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(true, true))
}
