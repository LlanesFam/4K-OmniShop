import React, { useState, useRef } from 'react'
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  AlertCircle,
  Download,
  Upload,
  Check
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useCategoryStore } from '@/store/useCategoryStore'
import { CSVImportDialog } from '@/components/csv-import-dialog'
import { CSVTemplateDialog } from '@/components/ui/csv-template-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import {
  parseCategoriesCSV,
  exportCategoriesToCSV,
  getCategoryCSVTemplate,
  downloadCSV,
  type CategoryImportRow
} from '@/lib/csvService'
import type { Category } from '@/lib/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color.'),
  parentId: z.string().nullable()
})

type CategoryFormValues = z.infer<typeof categorySchema>

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#4ade80',
  '#22d3ee',
  '#818cf8',
  '#f472b6',
  '#fb923c',
  '#facc15',
  '#a78bfa',
  '#f87171',
  '#34d399',
  '#60a5fa',
  '#e879f9',
  '#94a3b8'
]

// ─── Category Sheet ───────────────────────────────────────────────────────────

interface CategorySheetProps {
  open: boolean
  onClose: () => void
  editing: Category | null
  parentOptions: Category[]
}

function CategorySheet({
  open,
  onClose,
  editing,
  parentOptions
}: CategorySheetProps): React.JSX.Element {
  const { add, update } = useCategoryStore()
  const [saving, setSaving] = useState(false)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', color: COLOR_PRESETS[0], parentId: null }
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: editing?.name ?? '',
        color: editing?.color ?? COLOR_PRESETS[0],
        parentId: editing?.parentId ?? null
      })
    }
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: CategoryFormValues): Promise<void> => {
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, values)
      } else {
        await add(values)
      }
      onClose()
    } catch (err) {
      form.setError('name', { message: err instanceof Error ? err.message : 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[420px] sm:w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit Category' : 'Add Category'}</SheetTitle>
          <SheetDescription>
            {editing
              ? 'Update the details for this category.'
              : 'Create a new category to organise your products.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-5 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Beverages" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editing?.parentId && (
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Parent Category{' '}
                      <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">— None (top-level) —</option>
                        {parentOptions
                          .filter((p) => p.id !== editing?.id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={cn(
                              'size-7 rounded-full border-2 transition-transform',
                              field.value === c
                                ? 'border-foreground scale-110'
                                : 'border-transparent'
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => field.onChange(c)}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-7 rounded-full border"
                          style={{ backgroundColor: field.value }}
                        />
                        <Input
                          className="w-32 font-mono text-xs"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#4ade80"
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-auto pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CategoriesPage(): React.JSX.Element {
  const { categories, loading, getCategoryTree, remove, add } = useCategoryStore()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // CSV
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [csvImportResult, setCsvImportResult] = useState<{
    valid: CategoryImportRow[]
    errors: { row: number; field: string; message: string }[]
  } | null>(null)

  // Bulk delete
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Template dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  const tree = getCategoryTree()
  const topLevel = categories.filter((c) => !c.parentId)

  const openAdd = (): void => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (cat: Category): void => {
    setEditing(cat)
    setSheetOpen(true)
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = (): void => {
    const csv = exportCategoriesToCSV(categories)
    downloadCSV(csv, 'categories.csv')
  }

  const handleDownloadTemplate = (): void => {
    setShowTemplateDialog(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev): void => {
      const text = ev.target?.result as string
      const existingNames = new Set(categories.map((c) => c.name.toLowerCase()))
      const result = parseCategoriesCSV(text, existingNames)
      setCsvImportResult(result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleCategoryImport = async (rows: CategoryImportRow[]): Promise<void> => {
    // Build name → id from existing categories
    const nameToId = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

    // First pass: top-level categories
    for (const row of rows.filter((r) => !r.parentName)) {
      const newId = await add({ name: row.name, color: row.color, parentId: null })
      nameToId.set(row.name.toLowerCase(), newId)
    }

    // Second pass: children (resolve parentId from the now-expanded map)
    for (const row of rows.filter((r) => r.parentName)) {
      const parentId = nameToId.get(row.parentName.toLowerCase()) ?? null
      await add({ name: row.name, color: row.color, parentId })
    }
    setCsvImportResult(null)
  }

  const handleBulkDelete = async (): Promise<void> => {
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map((id) => remove(id)))
      setSelectedIds(new Set())
      setSelectMode(false)
      setShowBulkDeleteConfirm(false)
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelect = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = (): void => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="size-6" />
            Categories
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Group your products into categories for easier browsing.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download className="size-3.5" />
              Export CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
            <Download className="size-3.5" />
            Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => csvInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="size-3.5" />
            Import CSV
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={openAdd} className="gap-2">
            <Plus className="size-4" />
            Add Category
          </Button>
          {categories.length > 0 && (
            <Button
              variant={selectMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
              className="gap-1.5"
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectMode && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
          <span className="text-sm text-muted-foreground flex-1">
            {selectedIds.size === 0 ? 'Click rows to select' : `${selectedIds.size} selected`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelectedIds(
                selectedIds.size === categories.length
                  ? new Set()
                  : new Set(categories.map((c) => c.id))
              )
            }
          >
            {selectedIds.size === categories.length ? 'Deselect all' : 'Select all'}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <Trash2 className="size-3.5" />
              Delete {selectedIds.size}
            </Button>
          )}
        </div>
      )}

      {/* ── Category tree ── */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="rounded-xl border bg-card min-h-[280px] flex flex-col items-center justify-center gap-3 text-center p-6">
          <Tag className="size-10 text-muted-foreground/30" />
          <p className="font-medium text-sm">No categories yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Create categories to organise your products and make navigation easier.
          </p>
          <Button variant="outline" size="sm" onClick={openAdd} className="mt-1 gap-1.5">
            <Plus className="size-3.5" /> Add your first category
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tree.map((parent) => (
            <div key={parent.id} className="rounded-xl border bg-card overflow-hidden">
              {/* Parent row */}
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  selectMode && 'cursor-pointer hover:bg-muted/30'
                )}
                onClick={selectMode ? () => toggleSelect(parent.id) : undefined}
              >
                {selectMode && (
                  <div
                    className={cn(
                      'size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                      selectedIds.has(parent.id)
                        ? 'bg-primary border-primary'
                        : 'bg-background border-muted-foreground/40'
                    )}
                  >
                    {selectedIds.has(parent.id) && (
                      <Check className="size-3 text-primary-foreground" />
                    )}
                  </div>
                )}
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: parent.color }}
                />
                <span className="font-medium text-sm flex-1">{parent.name}</span>
                {parent.children.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {parent.children.length} sub
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => openEdit(parent)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(parent)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Children */}
              {parent.children.length > 0 && (
                <>
                  <Separator />
                  {parent.children.map((child) => (
                    <div
                      key={child.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 bg-muted/30',
                        selectMode && 'cursor-pointer hover:bg-muted/50'
                      )}
                      onClick={selectMode ? () => toggleSelect(child.id) : undefined}
                    >
                      {selectMode ? (
                        <div
                          className={cn(
                            'size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                            selectedIds.has(child.id)
                              ? 'bg-primary border-primary'
                              : 'bg-background border-muted-foreground/40'
                          )}
                        >
                          {selectedIds.has(child.id) && (
                            <Check className="size-3 text-primary-foreground" />
                          )}
                        </div>
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
                      )}
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: child.color }}
                      />
                      <span className="text-sm flex-1 text-muted-foreground">{child.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => openEdit(child)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(child)
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Sheet ── */}
      <CategorySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
        parentOptions={topLevel}
      />

      {/* ── CSV Template tutorial ── */}
      <CSVTemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        onDownload={() => {
          downloadCSV(getCategoryCSVTemplate(), 'categories-template.csv')
          setShowTemplateDialog(false)
        }}
        title="Categories CSV Template"
        description="Download the template and fill it in. Each row becomes one category."
        columns={[
          {
            name: 'name',
            required: true,
            description: 'Category name (must be unique)',
            example: 'Beverages'
          },
          {
            name: 'color',
            required: false,
            description: 'Hex color code (e.g. #4ade80). Assigned randomly if empty.',
            example: '#4ade80'
          },
          {
            name: 'parent',
            required: false,
            description: 'Parent category name — must match exactly. Leave empty for top-level.',
            example: 'Drinks'
          }
        ]}
        exampleRows={[
          ['Beverages', '#22d3ee', ''],
          ['Hot Drinks', '#fb923c', 'Beverages'],
          ['Cold Drinks', '#4ade80', 'Beverages'],
          ['Food', '#f472b6', '']
        ]}
        notes={[
          'Column headers must match exactly: name, color, parent.',
          'Duplicate category names are detected and skipped on import.',
          'Color is optional — a random color will be assigned if left empty.',
          '"parent" must match an existing category name or one created earlier in the same file.'
        ]}
      />

      {/* ── Bulk delete confirm ── */}
      <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={(v) => !v && setShowBulkDeleteConfirm(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} categor
              {selectedIds.size !== 1 ? 'ies' : 'y'}. Products assigned to them will become
              uncategorised. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── CSV import review ── */}
      {csvImportResult && (
        <CSVImportDialog
          open={!!csvImportResult}
          onClose={() => setCsvImportResult(null)}
          onConfirm={handleCategoryImport}
          title="Import Categories from CSV"
          valid={csvImportResult.valid}
          errors={csvImportResult.errors}
          previewHeaders={['Name', 'Color', 'Parent']}
          renderPreviewRow={(row) => (
            <>
              <td className="px-3 py-2 font-medium">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-3 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: row.color }}
                  />
                  {row.name}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{row.color}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.parentName || '—'}</td>
            </>
          )}
        />
      )}

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be permanently removed. Products using it will become
              uncategorised.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="size-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
