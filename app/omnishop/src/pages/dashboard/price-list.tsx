import React, { useState, useMemo } from 'react'
import { ShoppingCart, Search, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { useProductStore } from '@/store/useProductStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

function formatPrice(n: number): string {
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PriceListPage(): React.JSX.Element {
  const { products, loading, bulkPrices } = useProductStore()
  const { categories } = useCategoryStore()

  // pending: productId → new price string (raw input)
  const [pending, setPending] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [search, setSearch] = useState('')

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const dirtyCount = Object.keys(pending).filter((id) => {
    const p = products.find((x) => x.id === id)
    if (!p) return false
    const newVal = parseFloat(pending[id])
    return !isNaN(newVal) && newVal !== p.price
  }).length

  const handleChange = (id: string, val: string): void => {
    setPending((prev) => ({ ...prev, [id]: val }))
  }

  const handleSave = async (): Promise<void> => {
    const updates: { id: string; price: number }[] = []
    for (const [id, val] of Object.entries(pending)) {
      const newPrice = parseFloat(val)
      const original = products.find((p) => p.id === id)
      if (original && !isNaN(newPrice) && newPrice >= 0 && newPrice !== original.price) {
        updates.push({ id, price: newPrice })
      }
    }
    if (updates.length === 0) return
    setSaving(true)
    try {
      await bulkPrices(updates)
      setPending({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const getDiff = (product: Product): number | null => {
    const raw = pending[product.id]
    if (raw === undefined) return null
    const newVal = parseFloat(raw)
    if (isNaN(newVal)) return null
    return newVal - product.price
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="size-6" />
            Price List
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bulk-edit prices for all your products in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-green-400 font-medium">Prices updated!</span>
          )}
          <Button onClick={handleSave} disabled={dirtyCount === 0 || saving} className="gap-2">
            <Save className="size-4" />
            {saving ? 'Saving…' : `Save Changes${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border bg-card min-h-[280px] flex flex-col items-center justify-center gap-3 text-center p-6">
          <ShoppingCart className="size-10 text-muted-foreground/30" />
          <p className="font-medium text-sm">No products yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Add products first, then come back here to manage prices in bulk.
          </p>
        </div>
      ) : (
        <>
          {/* ── Search ── */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* ── Table ── */}
          <div className="rounded-xl border bg-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_160px_100px] items-center gap-4 px-4 py-2.5 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Product</span>
              <span>Category</span>
              <span>New Price (₱)</span>
              <span>Change</span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No products match your search.
              </div>
            ) : (
              filtered.map((product, idx) => {
                const diff = getDiff(product)
                const inputVal = pending[product.id] ?? String(product.price)
                const isDirty = diff !== null && diff !== 0
                const category = product.categoryId
                  ? categoryMap.get(product.categoryId)
                  : undefined

                return (
                  <React.Fragment key={product.id}>
                    {idx > 0 && <Separator />}
                    <div
                      className={cn(
                        'grid grid-cols-[1fr_140px_160px_100px] items-center gap-4 px-4 py-3 transition-colors',
                        isDirty && 'bg-primary/5'
                      )}
                    >
                      {/* Name + current price */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: ₱{formatPrice(product.price)}
                        </p>
                      </div>

                      {/* Category */}
                      <div>
                        {category ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                              borderColor: `${category.color}40`
                            }}
                          >
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Price input */}
                      <div>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inputVal}
                          onChange={(e) => handleChange(product.id, e.target.value)}
                          className={cn(
                            'w-full h-8 text-sm',
                            isDirty && 'border-primary ring-1 ring-primary/30'
                          )}
                        />
                      </div>

                      {/* Diff indicator */}
                      <div className="flex items-center gap-1 text-xs font-medium">
                        {diff === null || diff === 0 ? (
                          <Minus className="size-3 text-muted-foreground" />
                        ) : diff > 0 ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <TrendingUp className="size-3" />
                            +₱{formatPrice(diff)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400">
                            <TrendingDown className="size-3" />
                            -₱{formatPrice(Math.abs(diff))}
                          </span>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                )
              })
            )}
          </div>

          {dirtyCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm">
                <span className="font-semibold">{dirtyCount}</span> unsaved price change
                {dirtyCount > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPending({})}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="size-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
