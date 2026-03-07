import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Products View Mode ───────────────────────────────────────────────────────

export type ProductsViewMode = 'default' | 'compact' | 'table'

interface UIState {
  productsViewMode: ProductsViewMode
  setProductsViewMode: (mode: ProductsViewMode) => void
}

/**
 * Persisted UI preference store.
 * Keeps lightweight cross-page UI state (view modes, layout choices, etc.)
 * separate from data stores so they survive navigation and app restarts.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      productsViewMode: 'default',
      setProductsViewMode: (mode) => set({ productsViewMode: mode })
    }),
    {
      name: 'omnishop-ui-prefs'
    }
  )
)
