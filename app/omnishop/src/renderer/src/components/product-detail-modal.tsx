import React from 'react'
import { Package, Wrench, Pencil, Tag, Hash, Scan, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Product, Category } from '@/lib/types'

const STATUS_STYLES: Record<Product['status'], string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/20',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
}

interface ProductDetailModalProps {
  product: Product | null
  category: Category | undefined
  open: boolean
  onClose: () => void
  onEdit: (product: Product) => void
}

export function ProductDetailModal({
  product,
  category,
  open,
  onClose,
  onEdit
}: ProductDetailModalProps): React.JSX.Element | null {
  if (!product) return null

  const isService = product.type === 'service'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <div className="flex flex-col sm:flex-row">
          {/* ── Image panel ── */}
          <div className="relative w-full sm:w-52 shrink-0 bg-muted overflow-hidden sm:min-h-[440px] aspect-[4/3] sm:aspect-auto">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="size-full flex items-center justify-center text-muted-foreground/20">
                {isService ? <Wrench className="size-16" /> : <Package className="size-16" />}
              </div>
            )}
            {/* Type pill */}
            <span className="absolute top-3 left-3 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs font-medium capitalize border border-border/40">
              {product.type}
            </span>
          </div>

          {/* ── Detail panel ── */}
          <div className="flex flex-col flex-1 gap-4 p-6 overflow-y-auto max-h-[520px] min-w-0">
            {/* hidden description for accessibility */}
            <DialogDescription className="sr-only">
              Full details for {product.name}
            </DialogDescription>

            {/* Name + category */}
            <div className="pr-4">
              <DialogTitle className="text-xl font-bold leading-snug">{product.name}</DialogTitle>
              {category && (
                <span
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                    borderColor: `${category.color}40`
                  }}
                >
                  <Tag className="size-3" />
                  {category.name}
                </span>
              )}
            </div>

            {/* Price + badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold tracking-tight">
                ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
              <Badge
                variant="outline"
                className={cn('capitalize text-xs', STATUS_STYLES[product.status])}
              >
                {product.status}
              </Badge>
              {!isService && product.stock !== null && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
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
            </div>

            {/* Description */}
            {product.description && (
              <>
                <Separator />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Description
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {product.description}
                  </p>
                </div>
              </>
            )}

            {/* Meta */}
            {(product.sku || product.barcode) && (
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  {product.sku && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs w-14">SKU</span>
                      <span className="font-mono text-xs">{product.sku}</span>
                    </div>
                  )}
                  {product.barcode && (
                    <div className="flex items-center gap-2 text-sm">
                      <Scan className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs w-14">Barcode</span>
                      <span className="font-mono text-xs">{product.barcode}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Stock tracking note for services */}
            {isService && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <Layers className="size-3.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Stock is not tracked for services.
                  </p>
                </div>
              </>
            )}

            {/* Edit action */}
            <div className="mt-auto pt-2">
              <Button
                className="w-full gap-2"
                onClick={() => {
                  onClose()
                  onEdit(product)
                }}
              >
                <Pencil className="size-4" />
                Edit Product
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
