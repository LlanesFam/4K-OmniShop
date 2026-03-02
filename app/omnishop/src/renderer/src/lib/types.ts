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
