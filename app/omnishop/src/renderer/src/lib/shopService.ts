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
  type Unsubscribe,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Timestamp } from 'firebase/firestore'
import type { UserProfile, StoreRole } from '@/store/useAuthStore'

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
  /**
   * True once the seller has completed the onboarding checklist.
   * Checklist: logo uploaded + banner uploaded + first product added.
   */
  onboardingComplete?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Unique codes for inviting new members to a shop.
 * Stored in `inviteCodes/{code}`.
 */
export interface InviteCode {
  code: string
  shopId: string
  createdBy: string
  /** 'owner' or 'member' — defaults to 'member' for invites. */
  role: 'member' | 'owner'
  useCount: number
  maxUseCount: number
  expiresAt: Timestamp | null
  /** UIDs of users who have consumed this code. */
  usedBy: string[]
  createdAt: Timestamp
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
    (snap) => {
      callback(snap.exists() ? (snap.data() as ShopProfile) : null)
    },
    onError
  )
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Creates the initial shop profile document. */
export async function createShopProfile(
  uid: string,
  data: Omit<ShopProfile, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const shopRef = doc(db, 'shops', uid)
  const userRef = doc(db, 'users', uid)

  await runTransaction(db, async (tx) => {
    tx.set(shopRef, {
      ...data,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    tx.update(userRef, {
      storeRole: 'owner' as StoreRole,
      shopId: uid,
      shopOwnerUid: uid
    })
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

// ─── Members & Invites (Phase 2) ───────────────────────────────────────────

/**
 * Generates a new unique alphanumeric invite code for a shop.
 */
export async function generateInviteCode(
  shopId: string,
  createdBy: string,
  maxUses: number = 1
): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase()
  const ref = doc(db, 'inviteCodes', code)

  await setDoc(ref, {
    code,
    shopId,
    createdBy,
    role: 'member',
    useCount: 0,
    maxUseCount: maxUses,
    expiresAt: null,
    usedBy: [],
    createdAt: serverTimestamp()
  })

  return code
}

/**
 * Validates an invite code. Returns the invite details if valid.
 */
export async function validateInviteCode(code: string): Promise<InviteCode | null> {
  const ref = doc(db, 'inviteCodes', code.trim().toUpperCase())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const invite = snap.data() as InviteCode
  if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) return null
  if (invite.useCount >= invite.maxUseCount) return null

  return invite
}

/**
 * Consumes an invite code for a user.
 * Assigns storeRole: 'member' and shopId to the user's profile.
 */
export async function consumeInviteCode(uid: string, code: string): Promise<void> {
  const codeRef = doc(db, 'inviteCodes', code.trim().toUpperCase())
  const userRef = doc(db, 'users', uid)

  await runTransaction(db, async (tx) => {
    const codeSnap = await tx.get(codeRef)
    if (!codeSnap.exists()) throw new Error('Invite code not found.')

    const invite = codeSnap.data() as InviteCode
    if (invite.useCount >= invite.maxUseCount)
      throw new Error('Invite code has expired or reached its limit.')

    // Update invite code doc
    tx.update(codeRef, {
      useCount: invite.useCount + 1,
      usedBy: [...invite.usedBy, uid]
    })

    // Update user profile doc
    tx.update(userRef, {
      storeRole: 'member' as StoreRole,
      shopId: invite.shopId,
      shopOwnerUid: invite.createdBy
    })
  })
}

/**
 * Fetches all members of a shop by shopId.
 */
export async function fetchShopMembers(shopId: string): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('shopId', '==', shopId))
  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as UserProfile)
}

/**
 * Fetches all active invite codes for a shop.
 */
export async function fetchInviteCodes(shopId: string): Promise<InviteCode[]> {
  const q = query(collection(db, 'inviteCodes'), where('shopId', '==', shopId))
  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as InviteCode)
}

/**
 * Revokes an invite code (deletes it).
 */
export async function revokeInviteCode(code: string): Promise<void> {
  await deleteDoc(doc(db, 'inviteCodes', code))
}

/**
 * Updates a member's role (owner <-> member).
 */
export async function updateMemberRole(uid: string, newRole: StoreRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { storeRole: newRole })
}

/**
 * Removes a member from the shop by clearing their shopId and role.
 */
export async function removeMember(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    storeRole: null,
    shopId: null,
    shopOwnerUid: null
  })
}
