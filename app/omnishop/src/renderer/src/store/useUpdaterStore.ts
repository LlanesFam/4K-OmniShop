import { create } from 'zustand'
import type { UpdateStatusPayload, WhatsNewPayload } from './updater-types'

export type { UpdateStatusPayload, WhatsNewPayload }

interface UpdaterState {
  // Current update status
  status: UpdateStatusPayload
  // Cached data from the downloaded event
  pendingVersion: string | null
  releaseNotes: string | null
  // Update-ready install dialog
  showUpdateDialog: boolean
  // Post-restart What's New dialog
  showWhatsNew: boolean
  whatsNew: WhatsNewPayload | null
}

interface UpdaterActions {
  setStatus: (payload: UpdateStatusPayload) => void
  openUpdateDialog: () => void
  closeUpdateDialog: () => void
  openWhatsNew: (payload: WhatsNewPayload) => void
  closeWhatsNew: () => void
}

export const useUpdaterStore = create<UpdaterState & UpdaterActions>((set) => ({
  status: { state: 'idle' },
  pendingVersion: null,
  releaseNotes: null,
  showUpdateDialog: false,
  showWhatsNew: false,
  whatsNew: null,

  setStatus: (payload) =>
    set((s) => ({
      status: payload,
      // Cache version + notes when download completes
      pendingVersion: payload.state === 'downloaded' ? payload.version : s.pendingVersion,
      releaseNotes: payload.state === 'downloaded' ? payload.releaseNotes : s.releaseNotes,
      // Auto-open install dialog when download finishes
      showUpdateDialog: payload.state === 'downloaded' ? true : s.showUpdateDialog
    })),

  openUpdateDialog: () => set({ showUpdateDialog: true }),
  closeUpdateDialog: () => set({ showUpdateDialog: false }),

  openWhatsNew: (payload) => set({ showWhatsNew: true, whatsNew: payload }),
  closeWhatsNew: () => set({ showWhatsNew: false, whatsNew: null })
}))
