import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyDisplay } from '@/lib/tauri'

export type DisplayMode = 'fullscreen' | 'windowed' | 'borderless'
export type Resolution = '1280x720' | '1366x768' | '1600x900' | '1920x1080'

interface DisplayState {
  mode: DisplayMode
  resolution: Resolution
  setMode: (mode: DisplayMode) => void
  setResolution: (resolution: Resolution) => void
  applyDisplaySettings: () => void
}

const parseResolution = (res: Resolution): { width: number; height: number } => {
  const [width, height] = res.split('x').map(Number)
  return { width, height }
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set, get) => ({
      mode: 'fullscreen',
      resolution: '1280x720',

      setMode: (mode) => {
        set({ mode })
        get().applyDisplaySettings()
      },

      setResolution: (resolution) => {
        set({ resolution })
        get().applyDisplaySettings()
      },

      applyDisplaySettings: () => {
        const { mode, resolution } = get()
        const res = parseResolution(resolution)
        applyDisplay(mode, res.width, res.height).catch(console.error)
      }
    }),
    {
      name: 'omnishop-display-storage'
    }
  )
)

/**
 * Re-applies the persisted display mode and resolution on app launch.
 * Call this once in main.tsx alongside `initTheme()` so the window
 * snaps to the correct size / fullscreen state before the first render.
 * Wrapped in a try/catch so a missing capability or early-init race
 * never crashes the app — the display will correct itself on first
 * user interaction with the Settings page.
 */
export function initDisplay(): void {
  try {
    useDisplayStore.getState().applyDisplaySettings()
  } catch {
    // Tauri IPC not yet ready — safe to ignore; display applies when
    // capabilities are confirmed and the store's setMode fires next time.
  }
}
