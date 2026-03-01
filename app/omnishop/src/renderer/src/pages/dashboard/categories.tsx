import React from 'react'
import { Tag } from 'lucide-react'

/**
 * Categories page — organise products into logical groups.
 */
export default function CategoriesPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="size-6" />
            Categories
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Group your products into categories for easier browsing.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
        >
          + Add Category
        </button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm px-6 py-16 flex flex-col items-center justify-center gap-3 text-center">
        <Tag className="size-10 text-muted-foreground/50" />
        <p className="font-medium text-sm">No categories yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Create categories to organise your product catalog in the POS grid and reports.
        </p>
      </div>
    </div>
  )
}
