import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// ── Shared IPC payload types ───────────────────────────────────────────────────────
// (Mirrors src/renderer/src/store/updater-types.ts — kept in sync manually
//  to avoid cross-boundary imports between the preload and renderer builds.)

type UpdateStatusPayload =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'downloaded'; version: string; releaseNotes: string }
  | { state: 'error'; message: string }

interface WhatsNewPayload {
  version: string
  releaseNotes: string
}

// Custom APIs for renderer
const api = {
  /** Quit the Electron app entirely. */
  quitApp: () => ipcRenderer.send('app:quit'),

  // ── Updater ──────────────────────────────────────────────────────────────

  /** Trigger an update check. Resolves when the check is initiated. */
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('updater:check'),

  /** Silently install the downloaded update and restart the app. */
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),

  /**
   * Subscribe to update status push events.
   * Returns a cleanup function that removes the listener.
   */
  onUpdateStatus: (cb: (payload: UpdateStatusPayload) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: UpdateStatusPayload): void =>
      cb(payload)
    ipcRenderer.on('updater:status', handler)
    return () => ipcRenderer.removeListener('updater:status', handler)
  },

  /**
   * Subscribe to the post-restart "What's New" push event.
   * Returns a cleanup function that removes the listener.
   */
  onWhatsNew: (cb: (payload: WhatsNewPayload) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: WhatsNewPayload): void => cb(payload)
    ipcRenderer.on('app:whats-new', handler)
    return () => ipcRenderer.removeListener('app:whats-new', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
