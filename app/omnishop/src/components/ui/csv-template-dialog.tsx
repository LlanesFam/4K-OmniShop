import * as React from 'react'
import { Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateColumn {
  name: string
  required: boolean
  description: string
  example: string
}

export interface CSVTemplateDialogProps {
  open: boolean
  onClose: () => void
  /** Called when the user clicks "Download Template" */
  onDownload: () => void
  title: string
  description: string
  columns: TemplateColumn[]
  /** Each inner array is one example row in column order */
  exampleRows: string[][]
  /** Extra things to warn the user about */
  notes?: string[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CSVTemplateDialog({
  open,
  onClose,
  onDownload,
  title,
  description,
  columns,
  exampleRows,
  notes
}: CSVTemplateDialogProps): React.JSX.Element {
  const handleDownload = (): void => {
    onDownload()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-4 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-5 min-h-0 pr-1">
          {/* ── Columns guide ── */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Columns
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Column
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Required?
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {columns.map((col) => (
                    <tr key={col.name} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono font-medium text-foreground">
                        {col.name}
                      </td>
                      <td className="px-3 py-2">
                        {col.required ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-destructive/40 text-destructive"
                          >
                            required
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            optional
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground leading-relaxed">
                        {col.description}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{col.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* ── Example preview ── */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Example CSV
            </p>
            <div className="rounded-lg border overflow-x-auto bg-muted/20">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap"
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exampleRows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap text-foreground/80">
                          {cell || <span className="text-muted-foreground/40">(empty)</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Notes ── */}
          {notes && notes.length > 0 && (
            <>
              <Separator />
              <section>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Important Notes
                </p>
                <ul className="flex flex-col gap-2">
                  {notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="size-4" />
            Download Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
