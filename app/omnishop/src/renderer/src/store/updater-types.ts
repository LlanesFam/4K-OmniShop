// Shared type definitions for the updater IPC bridge.
// Imported by both the Zustand store and the preload type declarations.

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
