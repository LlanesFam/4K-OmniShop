import { create } from 'zustand'
import type { Unsubscribe } from 'firebase/firestore'
import {
  subscribeToMaterials,
  subscribeToMaterialVariants,
  subscribeToMaterialLogs,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  addVariant,
  updateVariant,
  deleteVariant,
  addMaterialLog,
  type MaterialInput,
  type VariantInput,
  type MaterialLogInput
} from '@/lib/materialService'
import type { Material, MaterialVariant, MaterialLog } from '@/lib/types'

// ─── Store ────────────────────────────────────────────────────────────────────

interface MaterialState {
  materials: Material[]
  variants: MaterialVariant[]
  logs: MaterialLog[]
  loading: boolean

  _shopId: string | null
  _unsubMaterials: Unsubscribe | null
  _unsubVariants: Unsubscribe | null
  _unsubLogs: Unsubscribe | null

  subscribe: (shopId: string) => void
  unsubscribe: () => void

  // Material actions
  addMaterial: (data: MaterialInput) => Promise<string>
  updateMaterial: (id: string, data: Partial<MaterialInput>) => Promise<void>
  removeMaterial: (id: string) => Promise<void>

  // Variant actions
  addVariant: (data: VariantInput) => Promise<string>
  updateVariant: (id: string, data: Partial<VariantInput>) => Promise<void>
  removeVariant: (id: string) => Promise<void>

  // Log actions
  addLog: (data: MaterialLogInput) => Promise<string>
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  variants: [],
  logs: [],
  loading: false,
  _shopId: null,
  _unsubMaterials: null,
  _unsubVariants: null,
  _unsubLogs: null,

  subscribe: (shopId: string) => {
    // Tear down any existing subscriptions
    get()._unsubMaterials?.()
    get()._unsubVariants?.()
    get()._unsubLogs?.()
    set({ loading: true, materials: [], variants: [], logs: [], _shopId: shopId })

    const unsubMaterials = subscribeToMaterials(
      shopId,
      (materials) => set({ materials }),
      (err) => console.error('[MaterialStore] materials error', err)
    )
    const unsubVariants = subscribeToMaterialVariants(
      shopId,
      (variants) => set({ variants }),
      (err) => console.error('[MaterialStore] variants error', err)
    )
    const unsubLogs = subscribeToMaterialLogs(
      shopId,
      (logs) => {
        set({ logs, loading: false })
      },
      (err) => {
        console.error('[MaterialStore] logs error', err)
        set({ loading: false })
      }
    )
    set({ _unsubMaterials: unsubMaterials, _unsubVariants: unsubVariants, _unsubLogs: unsubLogs })
  },

  unsubscribe: () => {
    get()._unsubMaterials?.()
    get()._unsubVariants?.()
    get()._unsubLogs?.()
    set({
      materials: [],
      variants: [],
      logs: [],
      loading: false,
      _shopId: null,
      _unsubMaterials: null,
      _unsubVariants: null,
      _unsubLogs: null
    })
  },

  addMaterial: (data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return addMaterial(shopId, data)
  },

  updateMaterial: (id, data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return updateMaterial(shopId, id, data)
  },

  removeMaterial: (id) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return deleteMaterial(shopId, id)
  },

  addVariant: (data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return addVariant(shopId, data)
  },

  updateVariant: (id, data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return updateVariant(shopId, id, data)
  },

  removeVariant: (id) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return deleteVariant(shopId, id)
  },

  addLog: (data) => {
    const shopId = get()._shopId
    if (!shopId) return Promise.reject(new Error('No active shop'))
    return addMaterialLog(shopId, data)
  }
}))
