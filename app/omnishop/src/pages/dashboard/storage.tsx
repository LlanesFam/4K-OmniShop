import React, { useState } from 'react'
import {
  Archive,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  ClipboardList,
  PackageCheck,
  Layers,
  ChevronDown
} from 'lucide-react'
import { useMaterialStore } from '@/store/useMaterialStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import type {
  Material,
  MaterialVariant,
  MaterialLog,
  MaterialLogType,
  VariantLabel
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'materials' | 'restock' | 'inventory'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logTypeBadge(type: MaterialLogType): React.JSX.Element {
  const map: Record<MaterialLogType, { label: string; cls: string }> = {
    restock: { label: 'Restock', cls: 'bg-green-500/15 text-green-500' },
    adjustment: { label: 'Adjustment', cls: 'bg-yellow-500/15 text-yellow-500' },
    'inventory-check': { label: 'Inventory Check', cls: 'bg-blue-500/15 text-blue-500' }
  }
  const { label, cls } = map[type]
  return <span className={cn('rounded px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>
}

function variantLabelBadge(label: VariantLabel): React.JSX.Element {
  const map: Record<VariantLabel, { label: string; cls: string }> = {
    new: { label: 'New', cls: 'bg-green-500/15 text-green-500' },
    used: { label: 'Used', cls: 'bg-yellow-500/15 text-yellow-500' },
    partial: { label: 'Partial', cls: 'bg-orange-500/15 text-orange-500' }
  }
  const { label: l, cls } = map[label]
  return <span className={cn('rounded px-2 py-0.5 text-xs font-medium', cls)}>{l}</span>
}

// ─── Material Form Dialog ─────────────────────────────────────────────────────

interface MaterialFormProps {
  open: boolean
  onClose: () => void
  initial?: Material | null
}

function MaterialForm({ open, onClose, initial }: MaterialFormProps): React.JSX.Element {
  const store = useMaterialStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [minQty, setMinQty] = useState(String(initial?.minQuantity ?? 0))
  const [cost, setCost] = useState(String(initial?.costPerUnit ?? 0))
  const [status, setStatus] = useState<'active' | 'inactive'>(initial?.status ?? 'active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setDescription(initial?.description ?? '')
      setUnit(initial?.unit ?? '')
      setMinQty(String(initial?.minQuantity ?? 0))
      setCost(String(initial?.costPerUnit ?? 0))
      setStatus(initial?.status ?? 'active')
      setError('')
    }
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || !unit.trim()) {
      setError('Name and unit are required.')
      return
    }
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        unit: unit.trim(),
        minQuantity: Number(minQty) || 0,
        costPerUnit: Number(cost) || 0,
        status,
        linkedProductIds: initial?.linkedProductIds ?? []
      }
      if (initial) {
        await store.updateMaterial(initial.id, data)
      } else {
        await store.addMaterial(data)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Material' : 'Add Material'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardboard Box"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit *</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. pcs, kg, roll"
              />
            </div>
            <div>
              <Label>Min Qty (alert)</Label>
              <Input
                type="number"
                min={0}
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cost per Unit</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'inactive')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Log Form Dialog ──────────────────────────────────────────────────────────

interface LogFormProps {
  open: boolean
  onClose: () => void
  material: Material | null
  type: MaterialLogType
}

function LogForm({ open, onClose, material, type }: LogFormProps): React.JSX.Element {
  const store = useMaterialStore()
  const [delta, setDelta] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) {
      setDelta('')
      setNotes('')
      setError('')
    }
  }, [open])

  if (!material) return <></>

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const d = Number(delta)
    if (!delta || isNaN(d)) {
      setError('Enter a valid quantity.')
      return
    }
    setSaving(true)
    try {
      await store.addLog({ materialId: material.id, variantId: null, type, delta: d, notes })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log')
    } finally {
      setSaving(false)
    }
  }

  const titles: Record<MaterialLogType, string> = {
    restock: 'Restock',
    adjustment: 'Adjustment',
    'inventory-check': 'Inventory Check'
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {titles[type]} — {material.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Quantity Change (positive = add, negative = remove)</Label>
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 50 or -10"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Log'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Variants Panel ───────────────────────────────────────────────────────────

function VariantsPanel({ material }: { material: Material }): React.JSX.Element {
  const { variants, addVariant, removeVariant } = useMaterialStore()
  const myVariants = variants.filter((v) => v.materialId === material.id)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState<VariantLabel>('new')
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (): Promise<void> => {
    setSaving(true)
    try {
      await addVariant({
        materialId: material.id,
        label,
        attributes: {},
        quantity: Number(qty) || 0,
        notes
      })
      setOpen(false)
      setNotes('')
      setQty('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 pl-4 border-l border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          Variants ({myVariants.length})
        </span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setOpen(true)}>
          <Plus className="size-3 mr-1" /> Add
        </Button>
      </div>
      {myVariants.map((v: MaterialVariant) => (
        <div key={v.id} className="flex items-center justify-between text-xs py-1">
          <div className="flex items-center gap-2">
            {variantLabelBadge(v.label)}
            <span>
              {v.quantity} {material.unit}
            </span>
            {v.notes && <span className="text-muted-foreground">— {v.notes}</span>}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-destructive/70 hover:text-destructive"
            onClick={() => removeVariant(v.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      {open && (
        <div className="border rounded p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Label</Label>
              <Select value={label} onValueChange={(v) => setLabel(v as VariantLabel)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              className="h-8 text-xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={handleAdd}>
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Materials Tab ────────────────────────────────────────────────────────────

function MaterialsTab(): React.JSX.Element {
  const { materials, loading, removeMaterial } = useMaterialStore()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Material | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)
  const [logTarget, setLogTarget] = useState<Material | null>(null)
  const [logType, setLogType] = useState<MaterialLogType>('restock')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  const openEdit = (m: Material): void => {
    setEditTarget(m)
    setFormOpen(true)
  }

  const openLog = (m: Material, type: MaterialLogType): void => {
    setLogTarget(m)
    setLogType(type)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4 mr-1.5" /> Add Material
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Archive className="size-10 mb-3 opacity-30" />
          <p className="text-sm">No materials yet. Add your first raw material or supply.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isLow = m.minQuantity > 0
            const expanded = expandedId === m.id
            return (
              <div key={m.id} className="border rounded-lg bg-card overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{m.name}</span>
                      {m.status === 'inactive' && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {isLow && (
                        <span className="flex items-center gap-1 text-xs text-amber-500">
                          <AlertTriangle className="size-3" /> Min {m.minQuantity} {m.unit}
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {m.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unit: <span className="text-foreground">{m.unit}</span>
                      {m.costPerUnit > 0 && (
                        <>
                          {' '}
                          · Cost:{' '}
                          <span className="text-foreground">₱{m.costPerUnit.toFixed(2)}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => openLog(m, 'restock')}
                    >
                      +Restock
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => openLog(m, 'adjustment')}
                    >
                      Adjust
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setExpandedId(expanded ? null : m.id)}
                    >
                      <ChevronDown
                        className={cn('size-4 transition-transform', expanded && 'rotate-180')}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive/70 hover:text-destructive"
                      onClick={() => setDeleteTarget(m)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4">
                    <VariantsPanel material={m} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MaterialForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(null)
        }}
        initial={editTarget}
      />

      <LogForm
        open={!!logTarget}
        onClose={() => setLogTarget(null)}
        material={logTarget}
        type={logType}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the material and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) await removeMaterial(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Restock Log Tab ──────────────────────────────────────────────────────────

function RestockLogTab(): React.JSX.Element {
  const { logs, materials, loading } = useMaterialStore()
  const [search, setSearch] = useState('')

  const materialName = (id: string): string => materials.find((m) => m.id === id)?.name ?? id

  const filtered = logs.filter(
    (l) =>
      materialName(l.materialId).toLowerCase().includes(search.toLowerCase()) ||
      l.notes.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ClipboardList className="size-10 mb-3 opacity-30" />
          <p className="text-sm">No activity logged yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Material
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Type
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Delta
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Notes
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: MaterialLog) => {
                const ts = l.createdAt as unknown as { toDate?: () => Date; seconds?: number }
                const date = ts?.toDate?.() ?? (ts?.seconds ? new Date(ts.seconds * 1000) : null)
                return (
                  <tr key={l.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{materialName(l.materialId)}</td>
                    <td className="px-4 py-2.5">{logTypeBadge(l.type)}</td>
                    <td
                      className={cn(
                        'px-4 py-2.5 text-right font-mono font-semibold',
                        l.delta >= 0 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {l.delta >= 0 ? `+${l.delta}` : l.delta}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{l.notes || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                      {date ? date.toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Inventory Check Tab ──────────────────────────────────────────────────────

function InventoryCheckTab(): React.JSX.Element {
  const { materials, logs, loading } = useMaterialStore()
  const [logTarget, setLogTarget] = useState<Material | null>(null)

  // Compute running stock from logs
  const stockMap = new Map<string, number>()
  for (const l of logs) {
    stockMap.set(l.materialId, (stockMap.get(l.materialId) ?? 0) + l.delta)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Stock levels are calculated from the running log. Record an <strong>Inventory Check</strong>{' '}
        to reconcile against physical counts.
      </p>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PackageCheck className="size-10 mb-3 opacity-30" />
          <p className="text-sm">No materials to check. Add materials first.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Material
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Unit
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Stock (calc.)
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Min Qty
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Status
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const stock = stockMap.get(m.id) ?? 0
                const isLow = m.minQuantity > 0 && stock <= m.minQuantity
                return (
                  <tr key={m.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{m.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{stock}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {m.minQuantity || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isLow ? (
                        <span className="flex items-center justify-end gap-1 text-amber-500 text-xs font-medium">
                          <AlertTriangle className="size-3" /> Low
                        </span>
                      ) : (
                        <span className="text-green-500 text-xs font-medium">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setLogTarget(m)}
                      >
                        Log Check
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <LogForm
        open={!!logTarget}
        onClose={() => setLogTarget(null)}
        material={logTarget}
        type="inventory-check"
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoragePage(): React.JSX.Element {
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('materials')

  if (!profile || profile.status !== 'approved') return <></>

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'materials', label: 'Materials', icon: Layers },
    { id: 'restock', label: 'Restock Log', icon: ClipboardList },
    { id: 'inventory', label: 'Inventory Check', icon: PackageCheck }
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Archive className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Storage</h1>
          <p className="text-sm text-muted-foreground">
            Track raw materials, supplies, and stock levels
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'materials' && <MaterialsTab />}
      {tab === 'restock' && <RestockLogTab />}
      {tab === 'inventory' && <InventoryCheckTab />}
    </div>
  )
}
