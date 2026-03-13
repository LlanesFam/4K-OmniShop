import React, { useEffect, useState } from 'react'
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Trash2,
  UserX,
  UserCheck,
  Mail,
  Clock,
  Search
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { useAuthStore, type UserProfile, type UserRole } from '@/store/useAuthStore'
import {
  subscribeToAllUsers,
  changeUserRole,
  suspendUser,
  reactivateUser,
  deleteUserProfile
} from '@/lib/adminService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function UserInitials({ name }: { name: string }): React.JSX.Element {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  )
}

function formatDate(ts: UserProfile['createdAt']): string {
  if (!ts) return '—'
  try {
    return formatDistanceToNow(ts.toDate(), { addSuffix: true })
  } catch {
    return '—'
  }
}

const ROLE_CONFIG: Record<UserRole, { label: string; className: string; Icon: React.ElementType }> =
  {
    admin: {
      label: 'Admin',
      className:
        'border-violet-500/40 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
      Icon: ShieldCheck
    },
    user: {
      label: 'User',
      className: 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      Icon: Shield
    }
  }

const STATUS_CONFIG: Record<UserProfile['status'], { label: string; className: string }> = {
  approved: {
    label: 'Approved',
    className:
      'border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
  },
  pending: {
    label: 'Pending',
    className:
      'border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  },
  onboarding: {
    label: 'Onboarding',
    className: 'border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  },
  rejected: {
    label: 'Suspended',
    className: 'border-red-500/40 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | { type: 'none' }
  | { type: 'role'; user: UserProfile; newRole: UserRole }
  | { type: 'suspend'; user: UserProfile }
  | { type: 'reactivate'; user: UserProfile }
  | { type: 'delete'; user: UserProfile }

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * All Users page (Admin only).
 * Live subscription to ALL Firestore user profiles.
 * Admins can change roles, suspend, reactivate, or delete users.
 */
export default function UsersPage(): React.JSX.Element {
  const { profile: adminProfile, user: adminUser } = useAuthStore()

  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [suspendReason, setSuspendReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToAllUsers(
      (users) => {
        setAllUsers(users)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  // ── Guard ──
  if (adminProfile?.role !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center">
        <ShieldAlert className="size-10 text-destructive/60" />
        <p className="font-medium text-sm">Access Denied</p>
        <p className="text-xs text-muted-foreground">This page is only accessible to admins.</p>
      </div>
    )
  }

  // ── Filtered list ──
  const filtered = allUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  // ── Action handlers ──
  const handleAction = async (): Promise<void> => {
    if (dialog.type === 'none') return
    setActionLoading(true)
    try {
      if (dialog.type === 'role') {
        await changeUserRole(dialog.user.uid, dialog.newRole)
      } else if (dialog.type === 'suspend') {
        await suspendUser(dialog.user.uid, suspendReason)
      } else if (dialog.type === 'reactivate') {
        await reactivateUser(dialog.user.uid)
      } else if (dialog.type === 'delete') {
        await deleteUserProfile(dialog.user.uid)
      }
    } finally {
      setActionLoading(false)
      setDialog({ type: 'none' })
      setSuspendReason('')
    }
  }

  return (
    <>
      <div className="w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="size-6" />
              All Users
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage all registered accounts and their access roles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {allUsers.length} total
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Admin Only
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            Failed to load users: {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1.5fr_100px_100px_120px] gap-4 px-6 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Loading skeleton rows */}
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1.5fr_100px_100px_120px] gap-4 px-6 py-4 border-b last:border-b-0 items-center"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </div>
            ))}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
              <Users className="size-10 text-muted-foreground/50" />
              <p className="font-medium text-sm">
                {search ? 'No users match your search' : 'No users found'}
              </p>
              {search && (
                <p className="text-xs text-muted-foreground">Try a different name or email.</p>
              )}
            </div>
          )}

          {/* User rows */}
          {!loading &&
            filtered.map((u) => {
              const isCurrentAdmin = u.uid === adminUser?.uid
              const roleConfig = ROLE_CONFIG[u.role]
              const statusConfig = STATUS_CONFIG[u.status]
              const RoleIcon = roleConfig.Icon
              return (
                <div
                  key={u.uid}
                  className={cn(
                    'grid grid-cols-[1fr_1.5fr_100px_100px_120px] gap-4 px-6 py-4 border-b last:border-b-0 items-center',
                    'hover:bg-muted/30 transition-colors',
                    isCurrentAdmin && 'bg-primary/5'
                  )}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <UserInitials name={u.displayName} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(u.createdAt)}
                      </p>
                    </div>
                    {isCurrentAdmin && (
                      <span className="text-[10px] font-medium text-primary border border-primary/30 rounded-full px-1.5 py-0.5 shrink-0">
                        you
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="size-3 shrink-0" />
                    {u.email}
                  </p>

                  {/* Role badge */}
                  <span
                    className={cn(
                      'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                      roleConfig.className
                    )}
                  >
                    <RoleIcon className="size-3" />
                    {roleConfig.label}
                  </span>

                  {/* Status badge */}
                  <span
                    className={cn(
                      'inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold',
                      statusConfig.className
                    )}
                  >
                    {statusConfig.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {/* Toggle role */}
                    {!isCurrentAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        onClick={() =>
                          setDialog({
                            type: 'role',
                            user: u,
                            newRole: u.role === 'admin' ? 'user' : 'admin'
                          })
                        }
                      >
                        {u.role === 'admin' ? (
                          <Shield className="size-3.5" />
                        ) : (
                          <ShieldCheck className="size-3.5" />
                        )}
                      </Button>
                    )}

                    {/* Suspend / Reactivate */}
                    {!isCurrentAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title={u.status === 'approved' ? 'Suspend User' : 'Reactivate User'}
                        onClick={() =>
                          setDialog({
                            type: u.status === 'approved' ? 'suspend' : 'reactivate',
                            user: u
                          })
                        }
                      >
                        {u.status === 'approved' ? (
                          <UserX className="size-3.5 text-amber-500" />
                        ) : (
                          <UserCheck className="size-3.5 text-green-500" />
                        )}
                      </Button>
                    )}

                    {/* Delete */}
                    {!isCurrentAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 hover:text-destructive hover:bg-destructive/10"
                        title="Delete User"
                        onClick={() => setDialog({ type: 'delete', user: u })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Role Change Dialog */}
      <AlertDialog
        open={dialog.type === 'role'}
        onOpenChange={(o) => !o && setDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog.type === 'role' && dialog.newRole === 'admin'
                ? 'Promote to Admin'
                : 'Demote to User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'role' && (
                <>
                  {dialog.newRole === 'admin' ? 'Promote' : 'Demote'}{' '}
                  <span className="font-semibold text-foreground">{dialog.user.displayName}</span>{' '}
                  to <span className="font-semibold text-foreground">{dialog.newRole}</span>? This
                  will {dialog.newRole === 'admin' ? 'grant' : 'remove'} admin-level access
                  immediately.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault()
                handleAction()
              }}
            >
              {actionLoading ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Dialog */}
      <AlertDialog
        open={dialog.type === 'suspend'}
        onOpenChange={(o) => {
          if (!o) {
            setDialog({ type: 'none' })
            setSuspendReason('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'suspend' && (
                <>
                  Suspending{' '}
                  <span className="font-semibold text-foreground">{dialog.user.displayName}</span>{' '}
                  will immediately revoke their dashboard access.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <Input
              placeholder="Reason (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              disabled={actionLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={(e) => {
                e.preventDefault()
                handleAction()
              }}
            >
              {actionLoading ? 'Suspending…' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog
        open={dialog.type === 'reactivate'}
        onOpenChange={(o) => !o && setDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'reactivate' && (
                <>
                  Reactivate{' '}
                  <span className="font-semibold text-foreground">{dialog.user.displayName}</span>?
                  They will regain full access to the dashboard.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault()
                handleAction()
              }}
            >
              {actionLoading ? 'Reactivating…' : 'Yes, Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={dialog.type === 'delete'}
        onOpenChange={(o) => !o && setDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'delete' && (
                <>
                  Permanently delete{' '}
                  <span className="font-semibold text-foreground">{dialog.user.displayName}</span> (
                  {dialog.user.email})? This removes their profile from the system.{' '}
                  <span className="font-medium text-destructive">This cannot be undone.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={(e) => {
                e.preventDefault()
                handleAction()
              }}
            >
              {actionLoading ? 'Deleting…' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
