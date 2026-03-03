/**
 * Shared Domain Types
 *
 * Central home for all feature-level TypeScript interfaces.
 * Services and stores import from here — never re-declare in page files.
 */

import type { Timestamp } from 'firebase/firestore'

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  shopId: string
  name: string
  /** Optional hex colour swatch, e.g. "#4ade80" */
  color: string
  /** null = top-level category; string = child of that parent id */
  parentId: string | null
  createdAt: Timestamp
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductType = 'product' | 'service'
export type ProductStatus = 'active' | 'inactive' | 'draft'

export interface Product {
  id: string
  shopId: string
  name: string
  description: string
  type: ProductType
  price: number
  /** Optional stock-keeping unit */
  sku: string
  /** Optional barcode / GTIN */
  barcode: string
  /**
   * Stock quantity.
   * null means "not tracked" (typical for services or unlimited digital items).
   */
  stock: number | null
  /** References a Category.id — null means uncategorised */
  categoryId: string | null
  /** Cloudinary secure_url */
  imageUrl: string
  /** Cloudinary public_id — stored so we can build transformation URLs */
  imagePublicId: string
  status: ProductStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Storage — Materials ──────────────────────────────────────────────────────

export type MaterialStatus = 'active' | 'inactive'

export interface Material {
  id: string
  shopId: string
  name: string
  description: string
  /** Unit of measure — e.g. "kg", "bottle", "roll", "pcs" */
  unit: string
  /** Low-stock alert threshold */
  minQuantity: number
  costPerUnit: number
  status: MaterialStatus
  /** Product IDs this material is consumed by */
  linkedProductIds: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type VariantLabel = 'new' | 'used' | 'partial'

export interface MaterialVariant {
  id: string
  shopId: string
  materialId: string
  label: VariantLabel
  /** Flexible attributes — colour, brand, spec, etc. */
  attributes: Record<string, string>
  quantity: number
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type MaterialLogType = 'restock' | 'adjustment' | 'inventory-check'

export interface MaterialLog {
  id: string
  shopId: string
  materialId: string
  variantId: string | null
  type: MaterialLogType
  /** Positive = added, negative = removed */
  delta: number
  notes: string
  createdAt: Timestamp
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export type BudgetEntryType = 'income' | 'expense'
export type BudgetCategory =
  | 'sale'
  | 'bill'
  | 'supply'
  | 'salary'
  | 'maintenance'
  | 'subscription'
  | 'other'
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'annual'
export type BudgetEntryStatus = 'paid' | 'pending' | 'overdue'

export interface BudgetEntry {
  id: string
  shopId: string
  type: BudgetEntryType
  category: BudgetCategory
  description: string
  amount: number
  /** ISO date string — e.g. "2026-03-03" */
  date: string
  isRecurring: boolean
  recurrenceFrequency: RecurrenceFrequency | null
  status: BudgetEntryStatus
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
