import { create } from 'zustand'
import type { Unsubscribe } from 'firebase/firestore'
import { subscribeToShopProfile, type ShopProfile } from '@/lib/shopService'

interface ShopState {
  shop: ShopProfile | null
  shopLoading: boolean
  /** Holds the active onSnapshot unsubscribe function. */
  _unsub: Unsubscribe | null

  /**
   * Starts a live Firestore subscription for the given user's shop profile.
   * Safe to call multiple times — always cancels the previous subscription first.
   */
  subscribeShop: (uid: string) => void

  /**
   * Cancels the active subscription and clears shop state.
   * Call this on logout or when the authenticated user changes.
   */
  clearShop: () => void
}

export const useShopStore = create<ShopState>((set, get) => ({
  shop: null,
  shopLoading: true,
  _unsub: null,

  subscribeShop: (uid: string) => {
    // Cancel any existing subscription first
    get()._unsub?.()

    set({ shopLoading: true, shop: null })

    const unsub = subscribeToShopProfile(
      uid,
      (shop) => set({ shop, shopLoading: false }),
      () => set({ shop: null, shopLoading: false })
    )

    set({ _unsub: unsub })
  },

  clearShop: () => {
    get()._unsub?.()
    set({ shop: null, shopLoading: true, _unsub: null })
  }
}))
