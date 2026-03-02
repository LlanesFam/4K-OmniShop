import { useEffect } from 'react'
import { useUpdaterStore } from '@/store/useUpdaterStore'
import type { UpdateStatusPayload, WhatsNewPayload } from '@/store/updater-types'

/**
 * Registers all updater IPC listeners and triggers the initial update check.
 * Must be called once inside a mounted component (DashboardLayout).
 */
export function useUpdater(): void {
  const { setStatus, openWhatsNew } = useUpdaterStore()

  useEffect(() => {
    // IPC is only available in Electron (not browser dev preview)
    if (!window.api?.onUpdateStatus) return

    // Register push-event listeners
    const cleanupStatus = window.api.onUpdateStatus((payload: UpdateStatusPayload) => {
      setStatus(payload)
    })

    const cleanupWhatsNew = window.api.onWhatsNew((payload: WhatsNewPayload) => {
      openWhatsNew(payload)
    })

    // Auto-check on dashboard mount (only in packaged build — electron-updater
    // already guards internally, but we skip the IPC call in dev to avoid noise)
    if (!import.meta.env.DEV) {
      window.api.checkForUpdates().catch(() => {
        /* silently ignore if offline */
      })
    }

    return () => {
      cleanupStatus()
      cleanupWhatsNew()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
