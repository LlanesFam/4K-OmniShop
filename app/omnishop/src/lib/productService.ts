/**
 * Product Firestore Service
 *
 * Subcollection path: shops/{shopId}/products/{productId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Product, ProductType, ProductStatus } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function productsRef(shopId: string): CollectionReference<DocumentData> {
  return collection(db, 'shops', shopId, 'products')
}

function productDoc(shopId: string, id: string): DocumentReference<DocumentData> {
  return doc(db, 'shops', shopId, 'products', id)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

/** Live subscription — calls back with the full product array on every change. */
export function subscribeToProducts(
  shopId: string,
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(productsRef(shopId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
      onData(products)
    },
    (err) => onError?.(err)
  )
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface ProductInput {
  name: string
  description: string
  type: ProductType
  price: number
  sku: string
  barcode: string
  stock: number | null
  categoryId: string | null
  imageUrl: string
  imagePublicId: string
  status: ProductStatus
}

export async function addProduct(shopId: string, data: ProductInput): Promise<string> {
  const ref = await addDoc(productsRef(shopId), {
    shopId,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export async function updateProduct(
  shopId: string,
  id: string,
  data: Partial<ProductInput>
): Promise<void> {
  await updateDoc(productDoc(shopId, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteProduct(shopId: string, id: string): Promise<void> {
  await deleteDoc(productDoc(shopId, id))
}

/** Bulk-updates only the `price` field for each given product id. */
export async function bulkUpdatePrices(
  shopId: string,
  updates: { id: string; price: number }[]
): Promise<void> {
  if (updates.length === 0) return
  const batch = writeBatch(db)
  for (const { id, price } of updates) {
    batch.update(productDoc(shopId, id), { price, updatedAt: serverTimestamp() })
  }
  await batch.commit()
}
