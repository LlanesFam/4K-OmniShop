/**
 * Budget Firestore Service
 *
 * Subcollection path: shops/{shopId}/budgetEntries/{entryId}
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
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BudgetEntry } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function budgetEntriesRef(shopId: string): CollectionReference<DocumentData> {
  return collection(db, 'shops', shopId, 'budgetEntries')
}

function budgetEntryDoc(shopId: string, id: string): DocumentReference<DocumentData> {
  return doc(db, 'shops', shopId, 'budgetEntries', id)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

/** Live subscription — calls back with the full entry array on every change. */
export function subscribeToBudgetEntries(
  shopId: string,
  onData: (entries: BudgetEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(budgetEntriesRef(shopId), orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BudgetEntry)),
    (err) => onError?.(err)
  )
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type BudgetEntryInput = Pick<
  BudgetEntry,
  | 'type'
  | 'category'
  | 'description'
  | 'amount'
  | 'date'
  | 'isRecurring'
  | 'recurrenceFrequency'
  | 'status'
  | 'notes'
>

export async function addBudgetEntry(shopId: string, data: BudgetEntryInput): Promise<string> {
  const ref = await addDoc(budgetEntriesRef(shopId), {
    shopId,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export async function updateBudgetEntry(
  shopId: string,
  id: string,
  data: Partial<BudgetEntryInput>
): Promise<void> {
  await updateDoc(budgetEntryDoc(shopId, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteBudgetEntry(shopId: string, id: string): Promise<void> {
  await deleteDoc(budgetEntryDoc(shopId, id))
}
