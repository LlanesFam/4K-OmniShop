import { useEffect } from 'react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { useUpdaterStore } from '@/store/useUpdaterStore'
import { useAuthStore } from '@/store/useAuthStore'
import { setPendingUpdate, checkWhatsNewOnLaunch } from '@/lib/tauri'
import { notifyUpdateAvailable } from '@/lib/notificationService'

/**
 * Registers the Tauri updater and triggers the initial update check.
 * Must be called once inside a mounted component (DashboardLayout).
 *
 * Flow:
 *   1. check()          — ask the update server if a new version exists
 *   2. update.download  — stream download, reporting progress
 *   3. Finished         — store update ref so installUpdate() can use it
 *
 * Install is intentionally manual: the user clicks "Install & Restart"
 * in <UpdateDialog>, which calls installUpdate() from lib/tauri.ts.
 */
export function useUpdater(): void {
  const { setStatus, openWhatsNew } = useUpdaterStore()

  useEffect(() => {
    // Fire the what's-new dialog if a previous update was just applied
    checkWhatsNewOnLaunch(openWhatsNew)

    // Skip auto-check during local Vite dev — no update server available
    if (import.meta.env.DEV) return

    // Respect the user's auto-update preference (defaults to true when unset)
    const autoUpdate = useAuthStore.getState().profile?.preferences?.autoUpdate
    if (autoUpdate === false) return

    let cancelled = false

    async function runCheck(): Promise<void> {
      setStatus({ state: 'checking' })
      try {
        const update: Update | null = await check()
        if (cancelled) return

        if (!update) {
          setStatus({ state: 'idle' })
          return
        }

        setStatus({ state: 'available', version: update.version })

        let downloaded = 0
        let contentLength = 0

        await update.download((event) => {
          if (cancelled) return
          if (event.event === 'Started') {
            contentLength = event.data.contentLength ?? 0
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength
            const percent = contentLength ? Math.round((downloaded / contentLength) * 100) : 0
            setStatus({ state: 'downloading', version: update.version, percent })
          } else if (event.event === 'Finished') {
            const notes = update.body ?? ''
            // Persist for the "what's new" dialog that fires after relaunch
            localStorage.setItem(
              'omnishop-pending-whats-new',
              JSON.stringify({ version: update.version, notes })
            )
            setPendingUpdate(update)
            setStatus({
              state: 'downloaded',
              version: update.version,
              releaseNotes: notes
            })
            // Fire a native OS notification so the user knows it's ready
            void notifyUpdateAvailable(update.version)
          }
        })
      } catch (err) {
        if (!cancelled) {
          setStatus({ state: 'error', message: String(err) })
        }
      }
    }

    void runCheck()
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
