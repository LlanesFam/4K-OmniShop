import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      mode: 'fullscreen', // Since we're initializing in fullscreen
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
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('update-display', {
            mode,
            width: res.width,
            height: res.height
          })
        }
      }
    }),
    {
      name: 'omnishop-display-storage'
    }
  )
)
