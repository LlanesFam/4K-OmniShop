import { create } from 'zustand'
import type { Unsubscribe } from 'firebase/firestore'
import { subscribeToProducts, type ProductInput } from '@/lib/productService'
import { addProduct, updateProduct, deleteProduct, bulkUpdatePrices } from '@/lib/productService'
import type { Product } from '@/lib/types'

interface ProductState {
  products: Product[]
  loading: boolean
  _unsub: Unsubscribe | null
  _shopId: string | null

  subscribe: (shopId: string) => void
  unsubscribe: () => void

  add: (data: ProductInput) => Promise<string>
  update: (id: string, data: Partial<ProductInput>) => Promise<void>
  remove: (id: string) => Promise<void>
  bulkPrices: (updates: { id: string; price: number }[]) => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  _unsub: null,
  _shopId: null,

  subscribe: (shopId: string) => {
    get()._unsub?.()
    set({ loading: true, products: [], _shopId: shopId })

    const unsub = subscribeToProducts(
      shopId,
      (products) => set({ products, loading: false }),
      () => set({ products: [], loading: false })
    )
    set({ _unsub: unsub })
  },

  unsubscribe: () => {
    get()._unsub?.()
    set({ products: [], loading: false, _unsub: null, _shopId: null })
  },

  add: (data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return addProduct(shopId, data)
  },

  update: (id, data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return updateProduct(shopId, id, data)
  },

  remove: (id) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return deleteProduct(shopId, id)
  },

  bulkPrices: (updates) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return bulkUpdatePrices(shopId, updates)
  }
}))
