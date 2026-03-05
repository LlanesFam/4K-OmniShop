/**
 * Shop Firestore Service
 *
 * One `shops/{uid}` document per approved seller.
 * The document ID matches the owner's Firebase Auth UID.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Timestamp } from 'firebase/firestore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopCategory =
  | 'electronics_tech'
  | 'mobile_gadgets'
  | 'clothing_fashion'
  | 'food_beverage'
  | 'hardware_diy'
  | 'beauty_wellness'
  | 'home_living'
  | 'gaming_hobbies'
  | 'digital_products'
  | 'printing_creative'
  | 'health_pharmacy'
  | 'cafe_coffee'
  | 'stationery_school'
  | 'professional_services'
  | 'events_booths'
  | 'pet_supplies'
  | 'automotive_parts'
  | 'other'

export interface ShopProfile {
  uid: string
  shopName: string
  description: string
  categories: ShopCategory[]
  subCategories: string[]
  otherCategoryDetails?: string
  phone: string
  address: string
  /** Cloudinary secure URL for the shop logo */
  logoUrl?: string
  /** Cloudinary secure URL for the shop banner */
  bannerUrl?: string
  /** Cloudinary secure URL used as the fallback image for products with no photo */
  defaultProductImageUrl?: string
  /**
   * True once the seller has completed the onboarding checklist.
   * Checklist: logo uploaded + banner uploaded + first product added.
   */
  onboardingComplete?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const CATEGORY_TAXONOMY: Record<
  ShopCategory,
  { label: string; emoji: string; subs: string[] }
> = {
  electronics_tech: {
    label: 'Electronics & Tech',
    emoji: '💻',
    subs: [
      'Components (CPU/GPU)',
      'Laptops & Desktops',
      'Peripherals (Mice/Keyboards)',
      'Networking (Routers/Cables)'
    ]
  },
  mobile_gadgets: {
    label: 'Mobile & Gadgets',
    emoji: '📱',
    subs: [
      'Smartphones',
      'Tablets',
      'Wearables (Smartwatches)',
      'Mobile Accessories (Cases/Chargers)'
    ]
  },
  clothing_fashion: {
    label: 'Clothing & Fashion',
    emoji: '👗',
    subs: ["Men's Apparel", "Women's Apparel", 'Footwear', 'Bags & Accessories']
  },
  food_beverage: {
    label: 'Food & Beverage',
    emoji: '🍔',
    subs: ['Groceries', 'Snacks & Sweets', 'Beverages', 'Fresh Produce']
  },
  hardware_diy: {
    label: 'Hardware & DIY',
    emoji: '🔧',
    subs: ['Power Tools', 'Hand Tools', 'Plumbing & Electrical', 'Construction Materials']
  },
  beauty_wellness: {
    label: 'Beauty & Wellness',
    emoji: '💄',
    subs: ['Skincare', 'Cosmetics', 'Personal Care', 'Health Supplements']
  },
  home_living: {
    label: 'Home & Living',
    emoji: '🏠',
    subs: ['Furniture', 'Kitchenware', 'Home Decor', 'Small Appliances']
  },
  gaming_hobbies: {
    label: 'Gaming & Hobbies',
    emoji: '🎮',
    subs: ['Consoles', 'Video Games', 'Collectibles/Figures', 'Board Games']
  },
  digital_products: {
    label: 'Digital Products',
    emoji: '💳',
    subs: ['Software Licenses', 'E-books', 'Game Credits', 'Gift Cards']
  },
  printing_creative: {
    label: 'Printing & Creative',
    emoji: '🖨️',
    subs: [
      'Document Printing',
      'Large Format (Banners)',
      'Personalized Gifts',
      'Business Cards/Flyers'
    ]
  },
  health_pharmacy: {
    label: 'Health & Pharmacy',
    emoji: '💊',
    subs: ['Over-the-Counter Meds', 'Personal Care', 'Medical Supplies', 'Prescription Pickup']
  },
  cafe_coffee: {
    label: 'Cafe & Coffee Shop',
    emoji: '☕',
    subs: ['Hot/Cold Brews', 'Pastries & Bakery', 'Whole Beans/Grounds', 'Cafe Merchandise']
  },
  stationery_school: {
    label: 'Stationery & School',
    emoji: '📚',
    subs: ['Writing Instruments', 'Notebooks & Paper', 'Art Supplies', 'Office Equipment']
  },
  professional_services: {
    label: 'Professional Services',
    emoji: '🛠️',
    subs: ['Repairs (Tech/Phone)', 'Cleaning Services', 'Laundry', 'Legal/Consulting']
  },
  events_booths: {
    label: 'Events & Booths',
    emoji: '🎪',
    subs: ['Equipment Rental', 'Catering', 'Photography', 'Event Staffing']
  },
  pet_supplies: {
    label: 'Pet Supplies',
    emoji: '🐾',
    subs: ['Pet Food', 'Grooming Tools', 'Toys', 'Veterinary Supplies']
  },
  automotive_parts: {
    label: 'Automotive & Parts',
    emoji: '🚗',
    subs: ['Spare Parts', 'Tires/Batteries', 'Car Care Products', 'Motorcycle Accessories']
  },
  other: {
    label: 'Other',
    emoji: '📦',
    subs: []
  }
}

/** Flattened list for easy iteration */
export const SHOP_CATEGORIES = Object.entries(CATEGORY_TAXONOMY).map(([value, conf]) => ({
  value: value as ShopCategory,
  ...conf
}))

// ─── Read ─────────────────────────────────────────────────────────────────────

/** One-time fetch of a shop profile. Returns null if not found. */
export async function fetchShopProfile(uid: string): Promise<ShopProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'shops', uid))
    return snap.exists() ? (snap.data() as ShopProfile) : null
  } catch {
    return null
  }
}

/** Live subscription to a user's shop profile. */
export function subscribeToShopProfile(
  uid: string,
  callback: (shop: ShopProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'shops', uid),
    (snap) => callback(snap.exists() ? (snap.data() as ShopProfile) : null),
    (err) => onError?.(err)
  )
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Creates the initial shop profile document. */
export async function createShopProfile(
  uid: string,
  data: Omit<ShopProfile, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  await setDoc(doc(db, 'shops', uid), {
    ...data,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

/** Updates an existing shop profile. */
export async function updateShopProfile(
  uid: string,
  data: Partial<Omit<ShopProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'shops', uid), {
    ...data,
    updatedAt: serverTimestamp()
  })
}
