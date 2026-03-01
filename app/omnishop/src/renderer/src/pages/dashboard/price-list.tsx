import React from 'react'
import { ShoppingCart } from 'lucide-react'

/**
 * Price List page — set and manage product prices and discount rules.
 */
export default function PriceListPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="size-6" />
          Price List
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure product prices, bulk pricing, and discount tiers.
        </p>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm px-6 py-16 flex flex-col items-center justify-center gap-3 text-center">
        <ShoppingCart className="size-10 text-muted-foreground/50" />
        <p className="font-medium text-sm">No prices configured</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Add products first, then configure their prices, discounts, and bulk pricing rules here.
        </p>
      </div>
    </div>
  )
}
