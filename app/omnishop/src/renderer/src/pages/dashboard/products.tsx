import React from 'react'
import { Package } from 'lucide-react'

/**
 * Products page — manage your store catalog.
 * Full CRUD implementation (add, edit, delete products) will be built here.
 */
export default function ProductsPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="size-6" />
            Products
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your store&apos;s product catalog.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
        >
          + Add Product
        </button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm px-6 py-16 flex flex-col items-center justify-center gap-3 text-center">
        <Package className="size-10 text-muted-foreground/50" />
        <p className="font-medium text-sm">No products yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Add your first product to start building your catalog. You can set prices, categories, and
          upload product images.
        </p>
      </div>
    </div>
  )
}
