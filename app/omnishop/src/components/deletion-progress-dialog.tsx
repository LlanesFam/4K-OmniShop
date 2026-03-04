import React from 'react'
import { Trash2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatDuration } from '@/lib/utils'

interface DeletionProgressDialogProps {
  open: boolean
  deleted: number
  total: number
  elapsed: number
  /** Singular label, e.g. "product" or "category" */
  label?: string
}

export function DeletionProgressDialog({
  open,
  deleted,
  total,
  elapsed,
  label = 'item'
}: DeletionProgressDialogProps): React.JSX.Element {
  const pct = total > 0 ? Math.round((deleted / total) * 100) : 0
  const rate = deleted > 0 ? elapsed / deleted : 0
  const estimatedRemaining = rate * (total - deleted)
  const isDone = deleted === total && total > 0
  const plural = total !== 1 ? `${label}s` : label

  return (
    <Dialog open={open} onOpenChange={() => void 0}>
      <DialogContent
        className="max-w-sm gap-0 p-0 overflow-hidden [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
            <Trash2 className="size-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {isDone ? `Deleted ${total} ${plural}` : `Deleting ${total} ${plural}…`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDone ? 'Wrapping up, please wait…' : 'Please wait while items are being removed.'}
            </p>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="px-6 pb-2">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full bg-destructive transition-all duration-150',
                !isDone && 'animate-pulse'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="flex items-center justify-between px-6 pb-6 pt-1">
          {/* Left: count */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Progress
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {deleted}
              <span className="text-muted-foreground font-normal"> / {total}</span>
            </span>
          </div>

          {/* Center: percentage */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              &nbsp;
            </span>
            <span
              className={cn(
                'text-2xl font-bold tabular-nums leading-none',
                isDone ? 'text-green-400' : 'text-destructive'
              )}
            >
              {pct}%
            </span>
          </div>

          {/* Right: times */}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              {!isDone && deleted > 0 ? 'Est. remaining' : 'Elapsed'}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {!isDone && deleted > 0
                ? formatDuration(estimatedRemaining)
                : formatDuration(elapsed)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
