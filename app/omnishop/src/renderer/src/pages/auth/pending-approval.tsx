import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'

import { useAuthStore, type UserProfile } from '@/store/useAuthStore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

/**
 * Shown to users whose Firestore `status` is `'pending'` or `'rejected'`.
 *
 * - Pending: informs the user that an admin will review their account.
 * - Rejected: shows the rejection reason from `profile.rejectionReason`.
 * - "Refresh status" re-fetches the Firestore profile. If the status has
 *   changed to `'approved'`, the user is redirected to `/dashboard`.
 * - Guards: redirects to `/login` if no user is authenticated.
 */
export default function PendingApprovalPage(): React.JSX.Element {
  const { user, profile, logout, refreshProfile } = useAuthStore()
  const navigate = useNavigate()

  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile)
  const [refreshing, setRefreshing] = useState(false)

  // Guard: must be logged in
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // Keep local profile in sync with store (initial load)
  useEffect(() => {
    setLocalProfile(profile)
  }, [profile])

  const handleRefresh = async (): Promise<void> => {
    if (!user) return
    setRefreshing(true)
    try {
      // Re-fetch directly so we can read the latest value immediately
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        const fresh = snap.data() as UserProfile
        setLocalProfile(fresh)
        if (fresh.status === 'approved') {
          // Update the Zustand store so DashboardLayout sees the new status
          // before it runs its guard check, preventing an immediate redirect back.
          await refreshProfile()
          navigate('/dashboard', { replace: true })
        }
      }
    } catch {
      // silently ignore network errors
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) return <></>

  const isPending = !localProfile || localProfile.status === 'pending'
  const isRejected = localProfile?.status === 'rejected'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo className="size-10" />
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          {isPending && <PendingView email={user.email ?? ''} />}
          {isRejected && (
            <RejectedView reason={localProfile?.rejectionReason ?? 'No reason provided.'} />
          )}

          {/* Refresh / logout actions */}
          <div className="space-y-3">
            {isPending && (
              <Button
                className="w-full gap-2"
                disabled={refreshing}
                onClick={handleRefresh}
                variant="outline"
              >
                {refreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh status
              </Button>
            )}

            <Button
              className="w-full"
              onClick={handleLogout}
              variant={isPending ? 'ghost' : 'outline'}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function PendingView({ email }: { email: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
        <Clock className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight">Account under review</h1>
        <p className="text-sm text-muted-foreground">
          Hi <span className="font-medium text-foreground">{email}</span>, thank you for signing up!
        </p>
        <p className="text-sm text-muted-foreground">
          An administrator will review your application shortly. You&apos;ll be able to access the
          dashboard once your account is approved.
        </p>
      </div>

      <div className="w-full rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground text-left space-y-0.5">
        <p className="font-medium text-foreground">What happens next?</p>
        <ul className="list-disc list-inside space-y-0.5 mt-1">
          <li>An admin will review your account details.</li>
          <li>Click &ldquo;Refresh status&rdquo; to check for updates.</li>
          <li>You&apos;ll get access as soon as you&apos;re approved.</li>
        </ul>
      </div>
    </div>
  )
}

function RejectedView({ reason }: { reason: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight">Application not approved</h1>
        <p className="text-sm text-muted-foreground">
          Unfortunately your account application was not approved.
        </p>
      </div>
      <div className="w-full rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-left">
        <p className="text-xs font-medium text-destructive mb-1">Reason provided:</p>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        If you believe this is a mistake, please contact the store administrator.
      </p>
    </div>
  )
}
