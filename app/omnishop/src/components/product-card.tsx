import React from 'react'
import { Pencil, Trash2, Package, Wrench, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/store/useShopStore'
import type { Product, Category } from '@/lib/types'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Product['status'], string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/20',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  category: Category | undefined
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onView: (product: Product) => void
  /** When provided, the card shows a checkbox for bulk selection */
  onToggleSelect?: (product: Product) => void
  selected?: boolean
  /** Compact mode: square image, tighter layout */
  compact?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCard({
  product,
  category,
  onEdit,
  onDelete,
  onView,
  onToggleSelect,
  selected = false,
  compact = false
}: ProductCardProps): React.JSX.Element {
  const isService = product.type === 'service'
  const { shop } = useShopStore()
  const placeholderUrl = shop?.defaultProductImageUrl ?? null

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md',
        selected && 'ring-2 ring-primary'
      )}
    >
      {/* ── Image ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`View details for ${product.name}`}
        className={cn(
          'relative w-full bg-muted overflow-hidden cursor-pointer',
          compact ? 'aspect-square' : 'aspect-[3/4]'
        )}
        onClick={() => (onToggleSelect ? onToggleSelect(product) : onView(product))}
        onKeyDown={(e) =>
          e.key === 'Enter' && (onToggleSelect ? onToggleSelect(product) : onView(product))
        }
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : placeholderUrl ? (
          <img
            src={placeholderUrl}
            alt="Product placeholder"
            className="size-full object-cover opacity-60"
          />
        ) : (
          <div className="size-full flex items-center justify-center text-muted-foreground/30">
            {isService ? (
              <Wrench className={cn(compact ? 'size-8' : 'size-12')} />
            ) : (
              <Package className={cn(compact ? 'size-8' : 'size-12')} />
            )}
          </div>
        )}

        {/* Selection checkbox overlay */}
        {onToggleSelect && (
          <div
            className={cn(
              'absolute top-2 left-2 z-10 size-5 rounded-md border-2 flex items-center justify-center transition-all',
              selected
                ? 'bg-primary border-primary'
                : 'bg-background/80 border-muted-foreground/40 backdrop-blur-sm'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(product)
            }}
          >
            {selected && <Check className="size-3 text-primary-foreground" />}
          </div>
        )}

        {/* Hover action overlay (hidden in select mode) */}
        {!onToggleSelect && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="size-8"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(product)
              }}
              aria-label="Edit product"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="size-8"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(product)
              }}
              aria-label="Delete product"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Details ── */}
      <div className="flex flex-col gap-1.5 p-3">
        {/* Name */}
        <p className="font-medium text-sm leading-tight line-clamp-2">{product.name}</p>

        {/* Category */}
        {category && (
          <span
            className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
            style={{
              backgroundColor: `${category.color}20`,
              color: category.color,
              borderColor: `${category.color}40`
            }}
          >
            {category.name}
          </span>
        )}

        {/* Price + stock */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-sm font-semibold">
            ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
          {!isService && product.stock !== null && (
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                product.stock === 0
                  ? 'bg-red-500/15 text-red-400'
                  : product.stock <= 5
                    ? 'bg-yellow-500/15 text-yellow-400'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
            </span>
          )}
          {isService && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              Service
            </span>
          )}
        </div>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn('w-fit text-[10px] capitalize mt-0.5', STATUS_STYLES[product.status])}
        >
          {product.status}
        </Badge>
      </div>
    </div>
  )
}
