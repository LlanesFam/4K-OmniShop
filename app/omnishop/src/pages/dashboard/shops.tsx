import React, { useEffect, useState } from 'react'
import {
  Store,
  ShieldAlert,
  Search,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  Package,
  ImageOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { useAuthStore } from '@/store/useAuthStore'
import { subscribeToAllShops } from '@/lib/adminService'
import { CATEGORY_TAXONOMY, type ShopProfile } from '@/lib/shopService'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: ShopProfile['createdAt']): string {
  if (!ts) return '—'
  try {
    return formatDistanceToNow(ts.toDate(), { addSuffix: true })
  } catch {
    return '—'
  }
}

function ShopLogo({
  logoUrl,
  shopName
}: {
  logoUrl?: string
  shopName: string
}): React.JSX.Element {
  const [broken, setBroken] = useState(false)

  if (logoUrl && !broken) {
    return (
      <img
        src={logoUrl}
        alt={shopName}
        onError={() => setBroken(true)}
        className="size-10 rounded-lg object-cover border border-border shrink-0"
      />
    )
  }

  // Fallback initials
  const initials = shopName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary border border-border">
      {initials}
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * All Shops page (Admin only).
 * Live subscription to all registered shop profiles.
 */
export default function ShopsPage(): React.JSX.Element {
  const { profile } = useAuthStore()
  const [shops, setShops] = useState<ShopProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsub = subscribeToAllShops(
      (data) => {
        setShops(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  // Guard
  if (profile?.role !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center">
        <ShieldAlert className="size-10 text-destructive/60" />
        <p className="font-medium text-sm">Access Denied</p>
        <p className="text-xs text-muted-foreground">This page is only accessible to admins.</p>
      </div>
    )
  }

  // Filter
  const filtered = shops.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.shopName.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.categories.some(
        (c) => c.toLowerCase().includes(q) || CATEGORY_TAXONOMY[c]?.label?.toLowerCase().includes(q)
      )
    )
  })

  // Stats
  const completed = shops.filter((s) => s.onboardingComplete).length
  const incomplete = shops.length - completed

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="size-6" />
            All Shops
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View all registered shop profiles on the platform.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!loading && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <Package className="size-3" />
                {shops.length} total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle2 className="size-3" />
                {completed} setup complete
              </span>
              {incomplete > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Clock className="size-3" />
                  {incomplete} pending setup
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, category, or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Shop</span>
          <span>Categories</span>
          <span>Contact</span>
          <span>Joined</span>
          <span>Status</span>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            {search ? (
              <>
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No shops match &quot;{search}&quot;</p>
                <p className="text-xs text-muted-foreground">Try a different search term.</p>
              </>
            ) : (
              <>
                <ImageOff className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No shops registered yet</p>
                <p className="text-xs text-muted-foreground">
                  Shops will appear here once sellers complete the setup wizard.
                </p>
              </>
            )}
          </div>
        )}

        {/* Shop rows */}
        {!loading && filtered.length > 0 && (
          <div className="divide-y">
            {filtered.map((shop) => {
              const primaryCategory = shop.categories[0]
              const emoji = primaryCategory
                ? (CATEGORY_TAXONOMY[primaryCategory]?.emoji ?? '🏪')
                : '🏪'
              const categoryLabel = primaryCategory
                ? (CATEGORY_TAXONOMY[primaryCategory]?.label ?? primaryCategory)
                : '—'
              const extraCount = shop.categories.length - 1

              return (
                <div
                  key={shop.uid}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Shop info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ShopLogo logoUrl={shop.logoUrl} shopName={shop.shopName} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{shop.shopName}</p>
                      {shop.description ? (
                        <p className="text-xs text-muted-foreground truncate">{shop.description}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/40 italic">No description</p>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 min-w-0">
                    <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                      <span>{emoji}</span>
                      <span className="truncate max-w-[80px]">{categoryLabel}</span>
                    </Badge>
                    {extraCount > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        +{extraCount}
                      </Badge>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="min-w-0 space-y-1">
                    {shop.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <Phone className="size-3 shrink-0" />
                        {shop.phone}
                      </p>
                    )}
                    {shop.address && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <MapPin className="size-3 shrink-0" />
                        {shop.address}
                      </p>
                    )}
                    {!shop.phone && !shop.address && (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Joined */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3 shrink-0" />
                    {formatDate(shop.createdAt)}
                  </div>

                  {/* Setup status */}
                  <div>
                    {shop.onboardingComplete ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          'border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        )}
                      >
                        <CheckCircle2 className="size-3" />
                        Complete
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          'border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        )}
                      >
                        <Clock className="size-3" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
