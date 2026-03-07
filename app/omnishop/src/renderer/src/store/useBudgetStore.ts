import { create } from 'zustand'
import type { Unsubscribe } from 'firebase/firestore'
import {
  subscribeToBudgetEntries,
  addBudgetEntry,
  updateBudgetEntry,
  deleteBudgetEntry,
  type BudgetEntryInput
} from '@/lib/budgetService'
import type { BudgetEntry } from '@/lib/types'

// ─── Store ────────────────────────────────────────────────────────────────────

interface BudgetState {
  entries: BudgetEntry[]
  loading: boolean
  _shopId: string | null
  _unsub: Unsubscribe | null

  subscribe: (shopId: string) => void
  unsubscribe: () => void

  add: (data: BudgetEntryInput) => Promise<string>
  update: (id: string, data: Partial<BudgetEntryInput>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  entries: [],
  loading: false,
  _shopId: null,
  _unsub: null,

  subscribe: (shopId: string) => {
    get()._unsub?.()
    set({ loading: true, entries: [], _shopId: shopId })

    const unsub = subscribeToBudgetEntries(
      shopId,
      (entries) => set({ entries, loading: false }),
      (err) => {
        console.error('[BudgetStore] error', err)
        set({ loading: false })
      }
    )
    set({ _unsub: unsub })
  },

  unsubscribe: () => {
    get()._unsub?.()
    set({ entries: [], loading: false, _shopId: null, _unsub: null })
  },

  add: (data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return addBudgetEntry(shopId, data)
  },

  update: (id, data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return updateBudgetEntry(shopId, id, data)
  },

  remove: (id) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return deleteBudgetEntry(shopId, id)
  }
}))
