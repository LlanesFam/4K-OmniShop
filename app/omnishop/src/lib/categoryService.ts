/**
 * Category Firestore Service
 *
 * Subcollection path: shops/{shopId}/categories/{categoryId}
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
  getDocs,
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Category } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function categoriesRef(shopId: string): CollectionReference<DocumentData> {
  return collection(db, 'shops', shopId, 'categories')
}

function categoryDoc(shopId: string, id: string): DocumentReference<DocumentData> {
  return doc(db, 'shops', shopId, 'categories', id)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

/** Live subscription — calls back with the full category array on every change. */
export function subscribeToCategories(
  shopId: string,
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(categoriesRef(shopId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category)
      onData(cats)
    },
    (err) => onError?.(err)
  )
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CategoryInput = Pick<Category, 'name' | 'color' | 'parentId'>

export async function addCategory(shopId: string, data: CategoryInput): Promise<string> {
  const ref = await addDoc(categoriesRef(shopId), {
    shopId,
    name: data.name,
    color: data.color,
    parentId: data.parentId,
    createdAt: serverTimestamp()
  })
  return ref.id
}

export async function updateCategory(
  shopId: string,
  id: string,
  data: Partial<CategoryInput>
): Promise<void> {
  await updateDoc(categoryDoc(shopId, id), { ...data })
}

/**
 * Deletes a category only if it has no children.
 * Throws if children exist so the UI can show a warning.
 */
export async function deleteCategory(shopId: string, id: string): Promise<void> {
  const snap = await getDocs(categoriesRef(shopId))
  const hasChildren = snap.docs.some((d) => (d.data() as Category).parentId === id)
  if (hasChildren) {
    throw new Error('Cannot delete a category that has sub-categories. Remove children first.')
  }
  await deleteDoc(categoryDoc(shopId, id))
}
