import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Package,
  Receipt,
  Users,
  Store,
  UserCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore, type UserProfile } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import {
  subscribeToAllUsers,
  subscribeToPendingUsers,
  subscribeToAllShops
} from '@/lib/adminService'
import type { ShopProfile } from '@/lib/shopService'
import { OnboardingChecklist } from '@/components/onboarding-checklist'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ─── Shared stat card ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number | null
  icon: React.ElementType
  description: string
  accent?: string
  href?: string
  loading?: boolean
}

function StatCard({
  label,
  value,
  icon: Icon,
  description,
  accent,
  href,
  loading = false
}: StatCardProps): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => href && navigate(href)}
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-3',
        href && 'cursor-pointer hover:border-primary/40 hover:shadow-md transition-all'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('rounded-md bg-muted p-2 text-muted-foreground', accent)}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-2xl font-bold tracking-tight">{value ?? '—'}</p>
      )}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// ─── Admin Overview ───────────────────────────────────────────────────────────

function AdminOverview(): React.JSX.Element {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const greeting = getGreeting()
  const displayName = user?.displayName ?? user?.email ?? 'Admin'

  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [allShops, setAllShops] = useState<ShopProfile[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    let resolved = 0
    const done = (): void => {
      resolved++
      if (resolved === 3) setStatsLoading(false)
    }

    const u1 = subscribeToAllUsers((users) => {
      setAllUsers(users)
      done()
    })
    const u2 = subscribeToPendingUsers((users) => {
      setPendingUsers(users)
      done()
    })
    const u3 = subscribeToAllShops((shops) => {
      setAllShops(shops)
      done()
    })
    return () => {
      u1()
      u2()
      u3()
    }
  }, [])

  const adminCount = allUsers.filter((u) => u.role === 'admin').length
  const shopsComplete = allShops.filter((s) => s.onboardingComplete).length

  // Recent pending users (up to 4)
  const recentPending = pendingUsers.slice(0, 4)

  // Recent shops (up to 4)
  const recentShops = allShops.slice(0, 4)

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Heading */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {displayName.split('@')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s a live snapshot of your platform.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <ShieldCheck className="size-3.5" />
          Administrator
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={allUsers.length}
          icon={Users}
          description="All registered accounts"
          href="/dashboard/users"
          loading={statsLoading}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingUsers.length}
          icon={UserCheck}
          description="Accounts awaiting review"
          accent={
            pendingUsers.length > 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950' : undefined
          }
          href="/dashboard/approvals"
          loading={statsLoading}
        />
        <StatCard
          label="Total Shops"
          value={allShops.length}
          icon={Store}
          description="Registered shop profiles"
          href="/dashboard/shops"
          loading={statsLoading}
        />
        <StatCard
          label="Admins"
          value={adminCount}
          icon={ShieldCheck}
          description="Accounts with admin role"
          href="/dashboard/users"
          loading={statsLoading}
        />
      </div>

      {/* Two-column panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Approvals */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-amber-500" />
              Pending Approvals
            </h2>
            <button
              type="button"
              onClick={() => navigate('/dashboard/approvals')}
              className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-4"
            >
              View all <ArrowRight className="size-3" />
            </button>
          </div>

          {statsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 className="size-7 text-green-500/60" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No accounts are waiting for review.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentPending.map((u) => {
                const initials = (u.displayName || u.email)
                  .split(/[\s@]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p: string) => p[0].toUpperCase())
                  .join('')
                const joinedAgo = u.createdAt
                  ? formatDistanceToNow(u.createdAt.toDate(), { addSuffix: true })
                  : '—'

                return (
                  <div key={u.uid} className="flex items-center gap-3 px-6 py-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="size-3" />
                      {joinedAgo}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Shops */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Store className="size-4 text-primary" />
              Recent Shops
            </h2>
            <button
              type="button"
              onClick={() => navigate('/dashboard/shops')}
              className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-4"
            >
              View all <ArrowRight className="size-3" />
            </button>
          </div>

          {statsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentShops.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Store className="size-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">No shops yet</p>
              <p className="text-xs text-muted-foreground">
                Shops will appear here once registered.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentShops.map((shop) => {
                const initials = shop.shopName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <div key={shop.uid} className="flex items-center gap-3 px-6 py-3">
                    {shop.logoUrl ? (
                      <img
                        src={shop.logoUrl}
                        alt={shop.shopName}
                        className="size-8 rounded-lg object-cover border shrink-0"
                      />
                    ) : (
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary border">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{shop.shopName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {shop.address || '—'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0',
                        shop.onboardingComplete
                          ? 'border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      )}
                    >
                      {shop.onboardingComplete ? (
                        <>
                          <CheckCircle2 className="size-2.5" /> Complete
                        </>
                      ) : (
                        <>
                          <Clock className="size-2.5" /> Pending
                        </>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Platform summary footer */}
      <div className="rounded-xl border bg-muted/30 px-6 py-4 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1.5 items-center">
        <span>
          <span className="font-semibold text-foreground">{allShops.length}</span> shops registered
        </span>
        <span>
          <span className="font-semibold text-foreground">{shopsComplete}</span> setup complete
        </span>
        <span>
          <span className="font-semibold text-foreground">{allUsers.length}</span> total users
        </span>
        <span>
          <span className="font-semibold text-foreground">{pendingUsers.length}</span> pending
          approval
        </span>
      </div>
    </div>
  )
}

// ─── Store (User) Overview ────────────────────────────────────────────────────

const STORE_STATS: StatCardProps[] = [
  {
    label: 'Total Products',
    value: '—',
    icon: Package,
    description: 'Products in your catalog'
  },
  {
    label: "Today's Sales",
    value: '₱ —',
    icon: Receipt,
    description: 'Revenue generated today'
  },
  {
    label: 'Transactions',
    value: '—',
    icon: BarChart3,
    description: 'Orders processed today'
  },
  {
    label: 'Pending Approvals',
    value: '—',
    icon: Users,
    description: 'User accounts awaiting review'
  }
]

function StoreOverview(): React.JSX.Element {
  const { user } = useAuthStore()
  const { shop } = useShopStore()
  const greeting = getGreeting()
  const displayName = user?.displayName ?? user?.email ?? 'there'

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {displayName.split('@')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s a snapshot of your store today.
        </p>
      </div>

      {shop && !shop.onboardingComplete && <OnboardingChecklist />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STORE_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
          <a
            href="/dashboard/transactions"
            className="text-xs text-primary hover:underline underline-offset-4"
          >
            View all
          </a>
        </div>
        <div className="px-6 py-12 flex items-center justify-center text-sm text-muted-foreground">
          No transactions yet. POS Mode is under development and will be available soon!
        </div>
      </div>
    </div>
  )
}

// ─── Page entry point ─────────────────────────────────────────────────────────

/**
 * Dashboard overview page.
 * Renders AdminOverview for admin users, StoreOverview for regular users.
 */
export default function OverviewPage(): React.JSX.Element {
  const { profile } = useAuthStore()
  return profile?.role === 'admin' ? <AdminOverview /> : <StoreOverview />
}
