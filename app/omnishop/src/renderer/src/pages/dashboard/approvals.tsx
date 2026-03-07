import React, { useEffect, useState } from 'react'
import { CheckCircle2, FileText, UserCheck, XCircle, Clock, Mail, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { useAuthStore, type UserProfile, type OnboardingAnswers } from '@/store/useAuthStore'
import { subscribeToPendingUsers, approveUser, rejectUser } from '@/lib/adminService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
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
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
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

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | { type: 'none' }
  | { type: 'approve'; user: UserProfile }
  | { type: 'reject'; user: UserProfile }

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Pending Approvals page (Admin only).
 * Live subscription to Firestore users with status === 'pending'.
 * Admins can approve or reject with an optional rejection reason.
 */
export default function ApprovalsPage(): React.JSX.Element {
  const { profile: adminProfile } = useAuthStore()

  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [appDialog, setAppDialog] = useState<UserProfile | null>(null)

  useEffect(() => {
    // Only subscribe when the current user is confirmed admin; prevents permission
    // errors and data leakage for non-admin sessions.
    if (adminProfile?.role !== 'admin') {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToPendingUsers(
      (users) => {
        setPendingUsers(users)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [adminProfile?.role])

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

  const handleApprove = async (): Promise<void> => {
    if (dialog.type !== 'approve') return
    setActionLoading(true)
    try {
      await approveUser(dialog.user.uid)
    } finally {
      setActionLoading(false)
      setDialog({ type: 'none' })
    }
  }

  const handleReject = async (): Promise<void> => {
    if (dialog.type !== 'reject') return
    setActionLoading(true)
    try {
      await rejectUser(dialog.user.uid, rejectionReason)
    } finally {
      setActionLoading(false)
      setRejectionReason('')
      setDialog({ type: 'none' })
    }
  }

  return (
    <>
      <div className="w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="size-6" />
              Pending Approvals
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review new accounts awaiting admin approval before they can access the system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {pendingUsers.length} pending
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Admin Only
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            Failed to load: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 flex-1 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && pendingUsers.length === 0 && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm px-6 py-16 flex flex-col items-center justify-center gap-3 text-center">
            <CheckCircle2 className="size-10 text-green-500/60" />
            <p className="font-medium text-sm">All caught up!</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              No pending approvals right now. New registrations will appear here automatically.
            </p>
          </div>
        )}

        {/* User cards */}
        {!loading && pendingUsers.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingUsers.map((u) => (
              <div
                key={u.uid}
                className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <UserInitials name={u.displayName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="size-3 shrink-0" />
                      {u.email}
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  Registered {formatDate(u.createdAt)}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setAppDialog(u)}
                >
                  <FileText className="size-3.5" />
                  View Application
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setDialog({ type: 'approve', user: u })}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      'flex-1 gap-1.5 border-destructive/40 text-destructive',
                      'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive'
                    )}
                    onClick={() => {
                      setRejectionReason('')
                      setDialog({ type: 'reject', user: u })
                    }}
                  >
                    <XCircle className="size-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <AlertDialog
        open={dialog.type === 'approve'}
        onOpenChange={(o) => !o && setDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Account</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'approve' && (
                <>
                  Approve{' '}
                  <span className="font-semibold text-foreground">{dialog.user.displayName}</span>?
                  They will gain full access to the dashboard immediately.
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
                handleApprove()
              }}
            >
              {actionLoading ? 'Approving…' : 'Yes, Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog
        open={dialog.type === 'reject'}
        onOpenChange={(o) => {
          if (!o) {
            setDialog({ type: 'none' })
            setRejectionReason('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Account</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'reject' && (
                <>
                  Rejecting{' '}
                  <span className="font-semibold text-foreground">{dialog.user.displayName}</span>{' '}
                  will prevent them from accessing the system.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <Input
              placeholder="Rejection reason (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={actionLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={(e) => {
                e.preventDefault()
                handleReject()
              }}
            >
              {actionLoading ? 'Rejecting…' : 'Yes, Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Application Answers Dialog */}
      <Dialog open={!!appDialog} onOpenChange={(o) => !o && setAppDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Application — {appDialog?.displayName}
            </DialogTitle>
            <DialogDescription>
              Answers submitted during the onboarding questionnaire.
            </DialogDescription>
          </DialogHeader>

          {appDialog?.onboardingAnswers ? (
            <ApplicationAnswers answers={appDialog.onboardingAnswers} />
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No application data available. This user may have registered before the onboarding
              questionnaire was introduced.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Application Answers ──────────────────────────────────────────────────────

function ApplicationAnswers({ answers }: { answers: OnboardingAnswers }): React.JSX.Element {
  const rows: { label: string; value: string | undefined }[] = [
    { label: "What's their store about?", value: answers.storeDescription },
    { label: 'Type of store', value: answers.storeType },
    { label: 'Existing shop link', value: answers.existingShopLink },
    { label: 'How they found us', value: answers.referralSource },
    { label: 'Store location', value: answers.storeLocation }
  ]
  return (
    <div className="space-y-3 py-1">
      {rows.map(({ label, value }) =>
        value ? (
          <div key={label} className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-sm text-foreground break-words">{value}</p>
          </div>
        ) : null
      )}
    </div>
  )
}
