import React from 'react'
import { BarChart3 } from 'lucide-react'

/**
 * Reports page — visual charts and summaries of store performance.
 */
export default function ReportsPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="size-6" />
          Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sales performance, revenue trends, and inventory summaries.
        </p>
      </div>

      {/* Chart placeholder grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          'Revenue Over Time',
          'Top-Selling Products',
          'Sales by Category',
          'Daily Transactions'
        ].map((title) => (
          <div
            key={title}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-4"
          >
            <p className="text-sm font-semibold">{title}</p>
            <div className="h-40 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
              Chart coming soon
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
