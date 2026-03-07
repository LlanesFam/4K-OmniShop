import React, { useState, useMemo, useRef } from 'react'
import {
  Package,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  Tag,
  LayoutGrid,
  Grid3X3,
  Table2,
  Eye,
  Pencil,
  Wrench,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useProductStore } from '@/store/useProductStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useUIStore } from '@/store/useUIStore'
import { ProductCard } from '@/components/product-card'
import { ProductDetailModal } from '@/components/product-detail-modal'
import { CSVImportDialog } from '@/components/csv-import-dialog'
import { CSVTemplateDialog } from '@/components/ui/csv-template-dialog'
import { ImageUpload } from '@/components/ui/image-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
  FormMessage,
  FormDescription
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import {
  parseProductsCSV,
  exportProductsToCSV,
  getProductCSVTemplate,
  downloadCSV,
  type ProductImportRow
} from '@/lib/csvService'
import type { Product } from '@/lib/types'

// ─── View Mode ────────────────────────────────────────────────────────────────

// ProductsViewMode is imported from useUIStore ('default' | 'compact' | 'table')

const STATUS_TABLE_STYLES: Record<'active' | 'inactive' | 'draft', string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/20',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  description: z.string().default(''),
  type: z.enum(['product', 'service']),
  price: z.coerce.number().min(0, 'Price must be 0 or more.'),
  sku: z.string().default(''),
  barcode: z.string().default(''),
  stock: z.coerce.number().int().min(0).nullable(),
  categoryId: z.string().nullable(),
  imageUrl: z.string().default(''),
  imagePublicId: z.string().default(''),
  status: z.enum(['active', 'inactive', 'draft'])
})

type ProductFormValues = z.infer<typeof productSchema>
type ProductRawValues = z.input<typeof productSchema>

// ─── Product Sheet ────────────────────────────────────────────────────────────

interface ProductSheetProps {
  open: boolean
  onClose: () => void
  editing: Product | null
}

function ProductSheet({ open, onClose, editing }: ProductSheetProps): React.JSX.Element {
  const { add, update } = useProductStore()
  const { categories } = useCategoryStore()
  const [saving, setSaving] = useState(false)
  const [isWide, setIsWide] = useState(false)

  // ── Drag-to-scroll ────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const scrollStartTop = useRef(0)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (
      (e.target as HTMLElement).closest('input, textarea, button, select, label, [role="combobox"]')
    )
      return
    isDragging.current = true
    dragStartY.current = e.clientY
    scrollStartTop.current = scrollRef.current?.scrollTop ?? 0
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!isDragging.current || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollStartTop.current + (dragStartY.current - e.clientY)
  }

  const stopDrag = (): void => {
    isDragging.current = false
  }

  const form = useForm<ProductRawValues, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'product',
      price: 0,
      sku: '',
      barcode: '',
      stock: null,
      categoryId: null,
      imageUrl: '',
      imagePublicId: '',
      status: 'active'
    }
  })

  const productType = form.watch('type')

  // Reset expand state when sheet closes
  React.useEffect(() => {
    if (!open) setIsWide(false)
  }, [open])

  React.useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              name: editing.name,
              description: editing.description,
              type: editing.type,
              price: editing.price,
              sku: editing.sku,
              barcode: editing.barcode,
              stock: editing.stock,
              categoryId: editing.categoryId,
              imageUrl: editing.imageUrl,
              imagePublicId: editing.imagePublicId,
              status: editing.status
            }
          : {
              name: '',
              description: '',
              type: 'product',
              price: 0,
              sku: '',
              barcode: '',
              stock: null,
              categoryId: null,
              imageUrl: '',
              imagePublicId: '',
              status: 'active'
            }
      )
    }
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: ProductFormValues): Promise<void> => {
    setSaving(true)
    try {
      const payload = {
        ...values,
        stock: values.type === 'service' ? null : values.stock
      }
      if (editing) {
        await update(editing.id, payload)
      } else {
        await add(payload)
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
      <SheetContent
        className={cn(
          'flex flex-col !max-w-none transition-[width] duration-200',
          isWide ? 'w-[760px]' : 'w-[480px]'
        )}
      >
        {/* ── Header + Expand toggle ── */}
        <div className="flex items-start justify-between gap-2 pr-8">
          <SheetHeader className="flex-1">
            <SheetTitle>{editing ? 'Edit Product' : 'Add Product'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Update the details for this item.'
                : 'Add a new product or service to your catalog.'}
            </SheetDescription>
          </SheetHeader>
          <button
            type="button"
            onClick={() => setIsWide((v) => !v)}
            title={isWide ? 'Collapse panel' : 'Expand panel'}
            className="mt-0.5 shrink-0 rounded-sm p-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            {isWide ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>

        {/* ── Scrollable form body — drag to scroll ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-4">
              {/* ── Image ── */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onUpload={(url) => field.onChange(url)}
                        folder="products"
                        aspectRatio="product"
                        cropEnabled
                        label="Upload product image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* ── Type toggle ── */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <div className="flex rounded-md border overflow-hidden">
                        {(['product', 'service'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => field.onChange(t)}
                            className={cn(
                              'flex-1 py-2 text-sm font-medium transition-colors capitalize',
                              field.value === t
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* ── Name ── */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          productType === 'service' ? 'e.g. Haircut, Web Design' : 'e.g. Iced Latte'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Description ── */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        placeholder="Briefly describe this item…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* ── Price ── */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₱)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={(field.value as number) ?? 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── SKU + Barcode ── */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        SKU <span className="text-muted-foreground text-xs">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ABC-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Barcode <span className="text-muted-foreground text-xs">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="012345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Stock (products only) ── */}
              {productType === 'product' && (
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Leave empty to not track"
                          value={(field.value as number | null) ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Leave empty if you don&apos;t track stock for this item.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* ── Category ── */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Category <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">— Uncategorised —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Status ── */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="pt-4 pb-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      {editing ? 'Saving…' : 'Adding…'}
                    </>
                  ) : editing ? (
                    'Save Changes'
                  ) : (
                    'Add Product'
                  )}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage(): React.JSX.Element {
  const { products, loading, remove, add } = useProductStore()
  const { categories, loading: categoriesLoading } = useCategoryStore()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [csvImportResult, setCsvImportResult] = useState<{
    valid: ProductImportRow[]
    errors: { row: number; field: string; message: string }[]
  } | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const { productsViewMode: viewMode, setProductsViewMode: setViewMode } = useUIStore()

  const noCategories = !categoriesLoading && categories.length === 0 && products.length === 0

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    let list = products
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    }
    if (filterCategoryId) {
      list = list.filter((p) => p.categoryId === filterCategoryId)
    }
    return list
  }, [products, search, filterCategoryId])

  const openAdd = (): void => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (p: Product): void => {
    setEditing(p)
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
    const csv = exportProductsToCSV(products, categories)
    downloadCSV(csv, 'products.csv')
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
      // Build composite duplicate keys: name||categoryName
      // A product is only a duplicate when BOTH name and category match.
      const catIdToName = new Map(categories.map((c) => [c.id, c.name]))
      const existingKeys = new Set(
        products.map((p) => {
          const catName = catIdToName.get(p.categoryId ?? '') ?? ''
          return `${p.name.toLowerCase()}||${catName.toLowerCase()}`
        })
      )
      const result = parseProductsCSV(text, existingKeys)
      setCsvImportResult(result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleProductImport = async (rows: ProductImportRow[]): Promise<void> => {
    const catNameToId = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
    for (const row of rows) {
      const categoryId = row.categoryName
        ? (catNameToId.get(row.categoryName.toLowerCase()) ?? null)
        : null
      await add({
        name: row.name,
        description: row.description ?? '',
        type: row.type,
        price: row.price,
        sku: row.sku ?? '',
        barcode: row.barcode ?? '',
        stock: row.stock ?? null,
        categoryId,
        imageUrl: '',
        imagePublicId: '',
        status: row.status
      })
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

  const toggleSelect = (product: Product): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.add(product.id)
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
            <Package className="size-6" />
            Products
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your store&apos;s product catalog.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download className="size-3.5" />
              Export CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
            <Download className="size-3.5" />
            Template
          </Button>
          {products.length > 0 && (
            <Button
              variant={selectMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
              className="gap-1.5"
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
          )}
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
            Add Product
          </Button>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectMode && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
          <span className="text-sm text-muted-foreground flex-1">
            {selectedIds.size === 0 ? 'Click cards to select' : `${selectedIds.size} selected`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelectedIds(
                selectedIds.size === filtered.length
                  ? new Set()
                  : new Set(filtered.map((p) => p.id))
              )
            }
          >
            {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
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

      {/* ── Category-first hint ── */}
      {noCategories && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <Tag className="size-4 text-amber-400" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-semibold text-amber-300">Tip:</span> Create categories first to
              keep your catalog organised. Products can still be added without them.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              onClick={() => window.location.assign('#/dashboard/categories')}
            >
              Go to Categories
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Filters ── */}
      {products.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex items-center rounded-md border overflow-hidden shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-9 rounded-none',
                viewMode === 'default' && 'bg-muted text-foreground'
              )}
              onClick={() => setViewMode('default')}
              title="Default view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-9 rounded-none border-x',
                viewMode === 'compact' && 'bg-muted text-foreground'
              )}
              onClick={() => setViewMode('compact')}
              title="Compact view"
            >
              <Grid3X3 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-9 rounded-none',
                viewMode === 'table' && 'bg-muted text-foreground'
              )}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <Table2 className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'table'
              ? 'grid-cols-1'
              : viewMode === 'compact'
                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          )}
        >
          {(viewMode === 'table' ? [1] : [1, 2, 3, 4, 5]).map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl bg-muted animate-pulse',
                viewMode === 'table'
                  ? 'h-10'
                  : viewMode === 'compact'
                    ? 'aspect-square'
                    : 'aspect-[3/4]'
              )}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card min-h-[280px] flex flex-col items-center justify-center gap-3 text-center p-6">
          <Package className="size-10 text-muted-foreground/30" />
          <p className="font-medium text-sm">
            {products.length === 0 ? 'No products yet' : 'No results found'}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {products.length === 0
              ? 'Add your first product or service to start building your catalog.'
              : 'Try adjusting your search or category filter.'}
          </p>
          {products.length === 0 && (
            <Button variant="outline" size="sm" onClick={openAdd} className="mt-1 gap-1.5">
              <Plus className="size-3.5" /> Add your first product
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ── Table view ── */
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {selectMode && <th className="w-10 px-3 py-2.5" />}
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Category
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground hidden lg:table-cell">
                  Stock
                </th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground hidden sm:table-cell">
                  Status
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const cat = categoryMap.get(p.categoryId ?? '')
                const isService = p.type === 'service'
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      selectMode && 'cursor-pointer',
                      selectedIds.has(p.id) && 'bg-primary/5'
                    )}
                    onClick={selectMode ? () => toggleSelect(p) : undefined}
                  >
                    {/* Checkbox */}
                    {selectMode && (
                      <td className="px-3 py-2.5 w-10">
                        <div
                          className={cn(
                            'size-5 rounded-md border-2 flex items-center justify-center transition-all',
                            selectedIds.has(p.id)
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/40'
                          )}
                        >
                          {selectedIds.has(p.id) && (
                            <svg viewBox="0 0 12 12" className="size-3 fill-primary-foreground">
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Product name + image */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted overflow-hidden shrink-0">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-muted-foreground/30">
                              {isService ? (
                                <Wrench className="size-5" />
                              ) : (
                                <Package className="size-5" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                          {p.sku && (
                            <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="capitalize text-muted-foreground">{p.type}</span>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {cat ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
                          style={{
                            backgroundColor: `${cat.color}20`,
                            color: cat.color,
                            borderColor: `${cat.color}40`
                          }}
                        >
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      ₱{p.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Stock */}
                    <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                      {isService ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : p.stock === null ? (
                        <span className="text-muted-foreground/40">∞</span>
                      ) : (
                        <span
                          className={cn(
                            'text-xs font-medium px-1.5 py-0.5 rounded-full',
                            p.stock === 0
                              ? 'bg-red-500/15 text-red-400'
                              : p.stock <= 5
                                ? 'bg-yellow-500/15 text-yellow-400'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {p.stock}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border capitalize',
                          STATUS_TABLE_STYLES[p.status]
                        )}
                      >
                        {p.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewProduct(p)
                          }}
                          aria-label="View product"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(p)
                          }}
                          aria-label="Edit product"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteError(null)
                            setDeleteTarget(p)
                          }}
                          aria-label="Delete product"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Default / Compact grid ── */
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'compact'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          )}
        >
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              category={categoryMap.get(p.categoryId ?? '')}
              onView={setViewProduct}
              onEdit={openEdit}
              onDelete={(p) => {
                setDeleteError(null)
                setDeleteTarget(p)
              }}
              selected={selectedIds.has(p.id)}
              onToggleSelect={selectMode ? toggleSelect : undefined}
              compact={viewMode === 'compact'}
            />
          ))}
        </div>
      )}

      {/* ── Sheet ── */}
      <ProductSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} />

      {/* ── CSV Template tutorial ── */}
      <CSVTemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        onDownload={() => {
          downloadCSV(getProductCSVTemplate(), 'products-template.csv')
          setShowTemplateDialog(false)
        }}
        title="Products CSV Template"
        description="Download the template and fill it in. Each row becomes one product."
        columns={[
          {
            name: 'name',
            required: true,
            description: 'Product or service name (unique)',
            example: 'Iced Latte'
          },
          {
            name: 'type',
            required: true,
            description: '"product" or "service"',
            example: 'product'
          },
          {
            name: 'price',
            required: true,
            description: 'Selling price (number, no currency symbol)',
            example: '120'
          },
          {
            name: 'description',
            required: false,
            description: 'Short description',
            example: 'Cold espresso drink'
          },
          {
            name: 'sku',
            required: false,
            description: 'Stock-keeping unit code',
            example: 'BEV-001'
          },
          {
            name: 'barcode',
            required: false,
            description: 'Barcode / EAN / UPC',
            example: '012345678'
          },
          {
            name: 'stock',
            required: false,
            description: 'Stock quantity (leave empty for services)',
            example: '50'
          },
          {
            name: 'category',
            required: false,
            description: 'Must match an existing category name exactly',
            example: 'Beverages'
          },
          {
            name: 'status',
            required: false,
            description: '"active", "inactive", or "draft" (default: active)',
            example: 'active'
          }
        ]}
        exampleRows={[
          [
            'Iced Latte',
            'product',
            '120',
            'Cold espresso',
            'BEV-001',
            '',
            '50',
            'Beverages',
            'active'
          ],
          ['Haircut', 'service', '250', '', '', '', '', 'Services', 'active'],
          ['Chocolate Cake', 'product', '180', 'Homemade', 'CAKE-01', '', '20', 'Bakery', 'active']
        ]}
        notes={[
          'The "name" column must match the column header exactly (case-insensitive).',
          'Duplicate product names will be skipped on import.',
          '"category" must exactly match an existing category name or will be left blank.',
          'You can omit optional columns entirely — just keep the required ones.'
        ]}
      />

      {/* ── Detail modal ── */}
      <ProductDetailModal
        product={viewProduct}
        category={viewProduct ? categoryMap.get(viewProduct.categoryId ?? '') : undefined}
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={openEdit}
      />

      {/* ── CSV import review ── */}
      {csvImportResult && (
        <CSVImportDialog
          open={!!csvImportResult}
          onClose={() => setCsvImportResult(null)}
          onConfirm={handleProductImport}
          title="Import Products from CSV"
          valid={csvImportResult.valid}
          errors={csvImportResult.errors}
          previewHeaders={['Name', 'Type', 'Price', 'Category', 'Status']}
          renderPreviewRow={(row) => (
            <>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2 capitalize text-muted-foreground">{row.type}</td>
              <td className="px-3 py-2">₱{row.price.toFixed(2)}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.categoryName || '—'}</td>
              <td className="px-3 py-2 capitalize text-muted-foreground">{row.status}</td>
            </>
          )}
        />
      )}

      {/* ── Bulk delete confirm ── */}
      <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={(v) => !v && setShowBulkDeleteConfirm(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} product
              {selectedIds.size !== 1 ? 's' : ''} from your catalog. This cannot be undone.
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

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the product from your catalog. This action cannot be
              undone.
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
