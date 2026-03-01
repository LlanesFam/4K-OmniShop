import React from 'react'
import { Receipt } from 'lucide-react'

/**
 * Transactions page — view and filter all POS sale records.
 */
export default function TransactionsPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="size-6" />
          Transactions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          A complete history of all sales processed through the POS.
        </p>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        {/* Filters toolbar placeholder */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
          <div className="ml-auto h-9 w-24 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Empty state */}
        <div className="px-6 py-16 flex flex-col items-center justify-center gap-3 text-center">
          <Receipt className="size-10 text-muted-foreground/50" />
          <p className="font-medium text-sm">No transactions found</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Completed POS sales will appear here. Switch to POS mode to process your first
            transaction.
          </p>
        </div>
      </div>
    </div>
  )
}
