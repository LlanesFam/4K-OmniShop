import { create } from 'zustand'
import type { Unsubscribe } from 'firebase/firestore'
import { subscribeToCategories, type CategoryInput } from '@/lib/categoryService'
import { addCategory, updateCategory, deleteCategory } from '@/lib/categoryService'
import type { Category } from '@/lib/types'

// ─── Tree helper ──────────────────────────────────────────────────────────────

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

function buildTree(cats: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  for (const c of cats) map.set(c.id, { ...c, children: [] })

  const roots: CategoryNode[] = []
  for (const node of map.values()) {
    if (!node.parentId) {
      roots.push(node)
    } else {
      map.get(node.parentId)?.children.push(node)
    }
  }
  return roots
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CategoryState {
  categories: Category[]
  loading: boolean
  _unsub: Unsubscribe | null

  /** Flat category array as a two-level tree. */
  getCategoryTree: () => CategoryNode[]

  subscribe: (shopId: string) => void
  unsubscribe: () => void

  // Convenience wrappers that pass shopId implicitly via _shopId
  _shopId: string | null
  add: (data: CategoryInput) => Promise<string>
  update: (id: string, data: Partial<CategoryInput>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  _unsub: null,
  _shopId: null,

  getCategoryTree: () => buildTree(get().categories),

  subscribe: (shopId: string) => {
    get()._unsub?.()
    set({ loading: true, categories: [], _shopId: shopId })

    const unsub = subscribeToCategories(
      shopId,
      (cats) => set({ categories: cats, loading: false }),
      () => set({ categories: [], loading: false })
    )
    set({ _unsub: unsub })
  },

  unsubscribe: () => {
    get()._unsub?.()
    set({ categories: [], loading: false, _unsub: null, _shopId: null })
  },

  add: (data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return addCategory(shopId, data)
  },

  update: (id, data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return updateCategory(shopId, id, data)
  },

  remove: (id) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return deleteCategory(shopId, id)
  }
}))
