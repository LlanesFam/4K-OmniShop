import React, { useState, useRef, useEffect } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { cn, formatDuration } from '@/lib/utils'
import type { ImportError } from '@/lib/csvService'

interface CSVImportDialogProps<T extends { row: number; name: string; isDuplicate?: boolean }> {
  open: boolean
  onClose: () => void
  onConfirm: (rows: T[], onProgress: (done: number, total: number) => void) => Promise<void>
  title: string
  valid: T[]
  errors: ImportError[]
  /** Column header labels for the preview table */
  previewHeaders: string[]
  /** Render a single row's <td> cells */
  renderPreviewRow: (row: T) => React.ReactNode
}

export function CSVImportDialog<T extends { row: number; name: string; isDuplicate?: boolean }>({
  open,
  onClose,
  onConfirm,
  title,
  valid,
  errors,
  previewHeaders,
  renderPreviewRow
}: CSVImportDialogProps<T>): React.JSX.Element {
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tick elapsed every 100ms while importing
  useEffect(() => {
    if (importing) {
      startTimeRef.current = Date.now()
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000)
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [importing])

  // Split valid rows into importable and duplicates
  const importRows = valid.filter((r) => !r.isDuplicate)
  const dupRows = valid.filter((r) => r.isDuplicate)

  const pct = importTotal > 0 ? Math.round((importedCount / importTotal) * 100) : 0
  const rate = importedCount > 0 ? elapsed / importedCount : 0
  const estimatedRemaining = importTotal > 0 ? rate * (importTotal - importedCount) : 0

  const handleConfirm = async (): Promise<void> => {
    setImporting(true)
    setImportedCount(0)
    setImportTotal(importRows.length)
    try {
      await onConfirm(importRows, (done, total) => {
        setImportedCount(done)
        setImportTotal(total)
      })
      onClose()
    } finally {
      setImporting(false)
      setImportedCount(0)
      setImportTotal(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !importing && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-4 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Review the data below before confirming. Invalid rows are highlighted and will be
            skipped.
          </DialogDescription>
        </DialogHeader>

        {/* ── Summary pills ── */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <CheckCircle2 className="size-4 text-green-400" />
            <span className="text-sm">
              <span className="font-semibold">{importRows.length}</span> row
              {importRows.length !== 1 ? 's' : ''} to import
            </span>
          </div>
          {dupRows.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="size-4 text-amber-400" />
              <span className="text-sm text-amber-400">
                <span className="font-semibold">{dupRows.length}</span> duplicate
                {dupRows.length !== 1 ? 's' : ''} — will be skipped
              </span>
            </div>
          )}
          {errors.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="size-4 text-destructive" />
              <span className="text-sm text-destructive">
                <span className="font-semibold">{errors.length}</span> issue
                {errors.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>

        {/* ── Duplicate notice ── */}
        {dupRows.length > 0 && (
          <Alert className="border-amber-500/30 bg-amber-500/5 shrink-0">
            <AlertTriangle className="size-4 text-amber-400" />
            <AlertDescription className="text-sm text-amber-300">
              <span className="font-semibold">{dupRows.length}</span> row
              {dupRows.length !== 1 ? 's' : ''} match existing names and will{' '}
              <span className="font-semibold">not be imported</span>. They are shown in amber below.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Errors list ── */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 overflow-hidden shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive px-3 py-2 border-b border-destructive/20">
              Issues to fix
            </p>
            <div className="divide-y divide-destructive/10 max-h-36 overflow-y-auto">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 text-xs">
                  <span className="shrink-0 rounded bg-destructive/10 text-destructive px-1.5 py-0.5 font-mono text-[10px]">
                    Row {e.row}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground capitalize">{e.field}</span>
                    {' — '}
                    {e.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Preview table ── */}
        {valid.length > 0 ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              Preview — {valid.length} row{valid.length !== 1 ? 's' : ''}
              {dupRows.length > 0 && ` (${dupRows.length} highlighted in amber will be skipped)`}
            </p>
            <div className="rounded-lg border overflow-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/60 border-b">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap w-8">
                      #
                    </th>
                    {previewHeaders.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {valid.slice(0, 50).map((row) => (
                    <tr
                      key={row.row}
                      className={
                        row.isDuplicate
                          ? 'bg-amber-500/10 opacity-70'
                          : 'hover:bg-muted/30 transition-colors'
                      }
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.isDuplicate ? (
                          <span className="inline-block rounded bg-amber-500/20 text-amber-400 px-1 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap">
                            dup
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">{row.row}</span>
                        )}
                      </td>
                      {renderPreviewRow(row)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {valid.length > 50 && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/20 text-center">
                  + {valid.length - 50} more rows not shown in preview
                </div>
              )}
            </div>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              No valid rows found. Please fix the issues in your file and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Import progress ── */}
        {importing && (
          <div className="shrink-0 rounded-lg border bg-muted/20 px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Importing <span className="font-semibold text-foreground">{importedCount}</span>
                {' of '}
                <span className="font-semibold text-foreground">{importTotal}</span>
                {' rows…'}
              </span>
              <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full bg-primary transition-all duration-150',
                  pct < 100 && 'animate-pulse'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>
                Elapsed:{' '}
                <span className="font-medium text-foreground">{formatDuration(elapsed)}</span>
              </span>
              {importedCount > 0 && importedCount < importTotal && (
                <span>
                  Est. remaining:{' '}
                  <span className="font-medium text-foreground">
                    {formatDuration(estimatedRemaining)}
                  </span>
                </span>
              )}
              {importedCount === importTotal && importTotal > 0 && (
                <span className="text-green-400 font-medium">Finishing up…</span>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={importRows.length === 0 || importing}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing…
              </>
            ) : (
              `Import ${importRows.length} Row${importRows.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
