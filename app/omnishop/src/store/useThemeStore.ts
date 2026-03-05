import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import { updateUserPreferences } from '@/lib/userPreferencesService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system'

export type ColorTheme =
  | 'modern-minimal'
  | 'dark-matter'
  | 'amber-minimal'
  | 'caffeine'
  | 'nature'
  | 'violet-bloom'
  | 'moca-mousse'

interface ThemeState {
  theme: Theme
  colorTheme: ColorTheme
  /** Apply and persist a new visual theme (light/dark/system). */
  setTheme: (theme: Theme) => void
  /** Apply and persist a new color theme. */
  setColorTheme: (colorTheme: ColorTheme) => void
  /**
   * Returns the currently active visual theme ('light' or 'dark'),
   * resolving 'system' against the OS preference.
   */
  resolvedTheme: () => 'light' | 'dark'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Applies the theme class and data-theme attribute to `<html>`.
 */
export function applyTheme(theme: Theme, colorTheme: ColorTheme): void {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(prefersDark ? 'dark' : 'light')
  } else {
    root.classList.add(theme)
  }

  root.setAttribute('data-theme', colorTheme)
}

/**
 * Called once synchronously before the React render (in main.tsx) to apply
 * the persisted theme immediately, preventing a flash of the wrong theme.
 * Also wires up the OS preference change listener for `system` mode.
 */
// Module-level guard — prevents duplicate listeners on HMR / multiple calls
let _themeListenerAttached = false

export function initTheme(): void {
  // Read directly from localStorage to avoid waiting for Zustand rehydration.
  try {
    const raw = localStorage.getItem('omnishop-theme')
    const parsed = raw ? JSON.parse(raw) : null

    const theme: Theme = parsed?.state?.theme ?? 'system'
    const colorTheme: ColorTheme = parsed?.state?.colorTheme ?? 'modern-minimal'

    applyTheme(theme, colorTheme)
  } catch {
    applyTheme('system', 'modern-minimal')
  }

  // Re-apply the dark/light class whenever the OS preference changes.
  // Only has a visual effect when the stored theme is 'system'.
  if (!_themeListenerAttached) {
    _themeListenerAttached = true
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      try {
        const raw = localStorage.getItem('omnishop-theme')
        const parsed = raw ? JSON.parse(raw) : null

        const theme: Theme = parsed?.state?.theme ?? 'system'
        const colorTheme: ColorTheme = parsed?.state?.colorTheme ?? 'modern-minimal'

        if (theme === 'system') applyTheme('system', colorTheme)
      } catch {
        /* ignore */
      }
    })
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system' as Theme,
      colorTheme: 'modern-minimal' as ColorTheme,

      setTheme: (theme) => {
        applyTheme(theme, get().colorTheme)
        set({ theme })
        // Sync to Firestore (fire-and-forget — localStorage remains the source of truth for UI)
        void import('@/store/useAuthStore').then(({ useAuthStore }) => {
          const uid = useAuthStore.getState().user?.uid
          if (uid) void updateUserPreferences(uid, { theme })
        })
      },

      setColorTheme: (colorTheme) => {
        applyTheme(get().theme, colorTheme)
        set({ colorTheme })
        // Sync to Firestore (fire-and-forget)
        void import('@/store/useAuthStore').then(({ useAuthStore }) => {
          const uid = useAuthStore.getState().user?.uid
          if (uid) void updateUserPreferences(uid, { colorTheme })
        })
      },

      resolvedTheme: () => {
        const t = get().theme
        if (t !== 'system') return t
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
    }),
    {
      name: 'omnishop-theme',
      // When Zustand rehydrates from localStorage, re-apply the theme so the
      // class on <html> stays in sync with any changes made in other tabs.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, state.colorTheme)
      }
    }
  )
)

export function useResolvedTheme(): 'light' | 'dark' {
  const { theme } = useThemeStore()
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent): void => {
        setSystemTheme(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    return undefined
  }, [theme])

  return theme === 'system' ? systemTheme : theme
}
