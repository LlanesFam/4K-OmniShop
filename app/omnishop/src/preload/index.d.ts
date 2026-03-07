import { ElectronAPI } from '@electron-toolkit/preload'

// ── IPC payload types (mirrored from renderer/src/store/updater-types.ts) ──

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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      quitApp: () => void
      // Debug
      openDevTools: () => Promise<void>
      // Updater
      checkForUpdates: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateStatus: (cb: (payload: UpdateStatusPayload) => void) => () => void
      onWhatsNew: (cb: (payload: WhatsNewPayload) => void) => () => void
      // Display
      getDisplays: () => Promise<Electron.Display[]>
      setWindowDisplay: (displayId: number) => void
    }
  }
}
