import React, { useState, useMemo } from 'react'
import {
  Wallet,
  Plus,
  Search,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Receipt
} from 'lucide-react'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import type {
  BudgetEntry,
  BudgetEntryType,
  BudgetCategory,
  RecurrenceFrequency,
  BudgetEntryStatus
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

type Tab = 'overview' | 'ledger' | 'bills'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: BudgetEntryStatus): React.JSX.Element {
  const map: Record<BudgetEntryStatus, { label: string; cls: string }> = {
    paid: { label: 'Paid', cls: 'bg-green-500/15 text-green-500' },
    pending: { label: 'Pending', cls: 'bg-yellow-500/15 text-yellow-500' },
    overdue: { label: 'Overdue', cls: 'bg-red-500/15 text-red-500' }
  }
  const { label, cls } = map[status]
  return <span className={cn('rounded px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>
}

function categoryLabel(cat: BudgetCategory): string {
  const map: Record<BudgetCategory, string> = {
    sale: 'Sale',
    bill: 'Bill',
    supply: 'Supply',
    salary: 'Salary',
    maintenance: 'Maintenance',
    subscription: 'Subscription',
    other: 'Other'
  }
  return map[cat]
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7) // "2026-03"

// ─── Entry Form Dialog ────────────────────────────────────────────────────────

interface EntryFormProps {
  open: boolean
  onClose: () => void
  initial?: BudgetEntry | null
}

function EntryForm({ open, onClose, initial }: EntryFormProps): React.JSX.Element {
  const store = useBudgetStore()
  const [type, setType] = useState<BudgetEntryType>(initial?.type ?? 'expense')
  const [category, setCategory] = useState<BudgetCategory>(initial?.category ?? 'other')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(String(initial?.amount ?? ''))
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false)
  const [freq, setFreq] = useState<RecurrenceFrequency>(initial?.recurrenceFrequency ?? 'monthly')
  const [status, setStatus] = useState<BudgetEntryStatus>(initial?.status ?? 'pending')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) {
      setType(initial?.type ?? 'expense')
      setCategory(initial?.category ?? 'other')
      setDescription(initial?.description ?? '')
      setAmount(String(initial?.amount ?? ''))
      setDate(initial?.date ?? new Date().toISOString().slice(0, 10))
      setIsRecurring(initial?.isRecurring ?? false)
      setFreq(initial?.recurrenceFrequency ?? 'monthly')
      setStatus(initial?.status ?? 'pending')
      setNotes(initial?.notes ?? '')
      setError('')
    }
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    const amt = Number(amount)
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Enter a valid positive amount.')
      return
    }
    setSaving(true)
    try {
      const data = {
        type,
        category,
        description: description.trim(),
        amount: amt,
        date,
        isRecurring,
        recurrenceFrequency: isRecurring ? freq : null,
        status,
        notes: notes.trim()
      }
      if (initial) {
        await store.update(initial.id, data)
      } else {
        await store.add(data)
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
          <DialogTitle>{initial ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as BudgetEntryType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BudgetCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'sale',
                      'bill',
                      'supply',
                      'salary',
                      'maintenance',
                      'subscription',
                      'other'
                    ] as BudgetCategory[]
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electricity bill, Packaging supplies"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₱) *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BudgetEntryStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Recurring?</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <label htmlFor="recurring" className="text-sm text-muted-foreground">
                  Yes
                </label>
              </div>
            </div>
          </div>
          {isRecurring && (
            <div>
              <Label>Frequency</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as RecurrenceFrequency)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab(): React.JSX.Element {
  const { entries, loading } = useBudgetStore()

  const thisMonth = useMemo(
    () => entries.filter((e) => e.date.startsWith(CURRENT_MONTH)),
    [entries]
  )

  const totalIncome = thisMonth.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = thisMonth
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0)
  const net = totalIncome - totalExpense
  const overdue = entries.filter((e) => e.status === 'overdue').length
  const pending = entries.filter((e) => e.status === 'pending').length

  const categories = useMemo(() => {
    const map = new Map<BudgetCategory, number>()
    for (const e of thisMonth) {
      if (e.type === 'expense') map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [thisMonth])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  const statCards = [
    {
      label: 'Income (this month)',
      value: `₱${totalIncome.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      label: 'Expenses (this month)',
      value: `₱${totalExpense.toLocaleString()}`,
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      label: 'Net',
      value: `₱${net.toLocaleString()}`,
      icon: DollarSign,
      color: net >= 0 ? 'text-green-500' : 'text-red-500',
      bg: net >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    {
      label: 'Overdue / Pending',
      value: `${overdue} / ${pending}`,
      icon: Receipt,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="border rounded-lg p-4 bg-card flex flex-col gap-2">
            <div className={cn('flex size-9 items-center justify-center rounded-md', s.bg)}>
              <s.icon className={cn('size-5', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium mb-3">Top Expense Categories (this month)</h3>
          <div className="space-y-2">
            {categories.slice(0, 6).map(([cat, amt]) => {
              const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs w-28 text-muted-foreground">{categoryLabel(cat)}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs w-20 text-right font-medium">
                    ₱{amt.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ledger Tab ───────────────────────────────────────────────────────────────

function LedgerTab(): React.JSX.Element {
  const { entries, loading, remove } = useBudgetStore()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | BudgetEntryType>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BudgetEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BudgetEntry | null>(null)

  const filtered = entries.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      categoryLabel(e.category).toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || e.type === filterType
    return matchSearch && matchType
  })

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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as 'all' | BudgetEntryType)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4 mr-1.5" /> Add Entry
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Wallet className="size-10 mb-3 opacity-30" />
          <p className="text-sm">No entries found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Description
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Category
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Amount
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Status
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                    {e.date}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {e.isRecurring && (
                        <RefreshCw className="size-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium">{e.description}</span>
                    </div>
                    {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {categoryLabel(e.category)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold',
                      e.type === 'income' ? 'text-green-500' : 'text-red-400'
                    )}
                  >
                    {e.type === 'income' ? '+' : '-'}₱{e.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">{statusBadge(e.status)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          setEditTarget(e)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => setDeleteTarget(e)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EntryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(null)
        }}
        initial={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.description}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) await remove(deleteTarget.id)
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

// ─── Bills Tab ────────────────────────────────────────────────────────────────

function BillsTab(): React.JSX.Element {
  const { entries, loading } = useBudgetStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BudgetEntry | null>(null)

  const bills = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.type === 'expense' &&
          (e.category === 'bill' || e.category === 'subscription' || e.isRecurring)
      ),
    [entries]
  )

  const totalPending = bills.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const totalOverdue = bills.filter((e) => e.status === 'overdue').reduce((s, e) => s + e.amount, 0)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(totalPending > 0 || totalOverdue > 0) && (
        <div className="flex gap-4 flex-wrap">
          {totalPending > 0 && (
            <div className="border rounded-lg p-4 bg-yellow-500/5 border-yellow-500/20 flex-1 min-w-[160px]">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-yellow-500">₱{totalPending.toLocaleString()}</p>
            </div>
          )}
          {totalOverdue > 0 && (
            <div className="border rounded-lg p-4 bg-red-500/5 border-red-500/20 flex-1 min-w-[160px]">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold text-red-500">₱{totalOverdue.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4 mr-1.5" /> Add Bill
        </Button>
      </div>

      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Receipt className="size-10 mb-3 opacity-30" />
          <p className="text-sm">No bills or recurring expenses tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map((e) => (
            <div key={e.id} className="border rounded-lg p-4 bg-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{e.description}</span>
                  {e.isRecurring && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <RefreshCw className="size-2.5" />
                      {e.recurrenceFrequency}
                    </Badge>
                  )}
                  {statusBadge(e.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {categoryLabel(e.category)} · Due {e.date}
                  {e.notes && ` · ${e.notes}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-red-400">₱{e.amount.toLocaleString()}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                onClick={() => {
                  setEditTarget(e)
                  setFormOpen(true)
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <EntryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditTarget(null)
        }}
        initial={editTarget}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage(): React.JSX.Element {
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')

  if (!profile || profile.status !== 'approved') return <></>

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: DollarSign },
    { id: 'ledger', label: 'Ledger', icon: Receipt },
    { id: 'bills', label: 'Bills', icon: RefreshCw }
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Wallet className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Track income, expenses, and recurring bills
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
      {tab === 'overview' && <OverviewTab />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'bills' && <BillsTab />}
    </div>
  )
}
