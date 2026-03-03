/**
 * Material Firestore Service
 *
 * Subcollection paths:
 *   shops/{shopId}/materials/{materialId}
 *   shops/{shopId}/materialVariants/{variantId}
 *   shops/{shopId}/materialLogs/{logId}
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
import type { Material, MaterialVariant, MaterialLog } from '@/lib/types'

// ─── Collection Refs ──────────────────────────────────────────────────────────

function materialsRef(shopId: string): CollectionReference<DocumentData> {
  return collection(db, 'shops', shopId, 'materials')
}

function materialDoc(shopId: string, id: string): DocumentReference<DocumentData> {
  return doc(db, 'shops', shopId, 'materials', id)
}

function variantsRef(shopId: string): CollectionReference<DocumentData> {
  return collection(db, 'shops', shopId, 'materialVariants')
}

function variantDoc(shopId: string, id: string): DocumentReference<DocumentData> {
  return doc(db, 'shops', shopId, 'materialVariants', id)
}

function logsRef(shopId: string): CollectionReference<DocumentData> {
  return collection(db, 'shops', shopId, 'materialLogs')
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToMaterials(
  shopId: string,
  onData: (materials: Material[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(materialsRef(shopId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Material)),
    (err) => onError?.(err)
  )
}

export function subscribeToMaterialVariants(
  shopId: string,
  onData: (variants: MaterialVariant[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(variantsRef(shopId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MaterialVariant)),
    (err) => onError?.(err)
  )
}

export function subscribeToMaterialLogs(
  shopId: string,
  onData: (logs: MaterialLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(logsRef(shopId), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MaterialLog)),
    (err) => onError?.(err)
  )
}

// ─── Material Mutations ───────────────────────────────────────────────────────

export type MaterialInput = Pick<
  Material,
  'name' | 'description' | 'unit' | 'minQuantity' | 'costPerUnit' | 'status' | 'linkedProductIds'
>

export async function addMaterial(shopId: string, data: MaterialInput): Promise<string> {
  const ref = await addDoc(materialsRef(shopId), {
    shopId,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export async function updateMaterial(
  shopId: string,
  id: string,
  data: Partial<MaterialInput>
): Promise<void> {
  await updateDoc(materialDoc(shopId, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteMaterial(shopId: string, id: string): Promise<void> {
  await deleteDoc(materialDoc(shopId, id))
}

// ─── Variant Mutations ────────────────────────────────────────────────────────

export type VariantInput = Pick<
  MaterialVariant,
  'materialId' | 'label' | 'attributes' | 'quantity' | 'notes'
>

export async function addVariant(shopId: string, data: VariantInput): Promise<string> {
  const ref = await addDoc(variantsRef(shopId), {
    shopId,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export async function updateVariant(
  shopId: string,
  id: string,
  data: Partial<VariantInput>
): Promise<void> {
  await updateDoc(variantDoc(shopId, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteVariant(shopId: string, id: string): Promise<void> {
  await deleteDoc(variantDoc(shopId, id))
}

// ─── Log Mutations ────────────────────────────────────────────────────────────

export type MaterialLogInput = Pick<
  MaterialLog,
  'materialId' | 'variantId' | 'type' | 'delta' | 'notes'
>

export async function addMaterialLog(shopId: string, data: MaterialLogInput): Promise<string> {
  const ref = await addDoc(logsRef(shopId), {
    shopId,
    ...data,
    createdAt: serverTimestamp()
  })
  return ref.id
}
