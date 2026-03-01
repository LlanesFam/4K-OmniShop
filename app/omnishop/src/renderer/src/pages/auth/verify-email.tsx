import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/ui/logo'

const RESEND_COOLDOWN_SECONDS = 60

/**
 * Shown after sign-up. Prompts the user to verify their email before continuing.
 *
 * - "Resend email" button with a 60-second cooldown.
 * - "I've verified my email" button — reloads Firebase user and navigates to
 *   `/pending-approval` if `emailVerified === true`.
 * - Guards: redirects to `/login` if there is no authenticated user.
 */
export default function VerifyEmailPage(): React.JSX.Element {
  const { user, refreshUser, resendVerificationEmail, logout } = useAuthStore()
  const navigate = useNavigate()

  const [cooldown, setCooldown] = useState(0)
  const [resentSuccess, setResentSuccess] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  // Guard: no user → go back to login
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1_000)
    return () => clearInterval(id)
  }, [cooldown])

  const handleResend = async (): Promise<void> => {
    setResentSuccess(false)
    try {
      await resendVerificationEmail()
      setResentSuccess(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      // silently ignore — user can try again
    }
  }

  const handleCheckVerified = async (): Promise<void> => {
    setCheckError(null)
    setCheckLoading(true)
    try {
      const verified = await refreshUser()
      if (verified) {
        navigate('/pending-approval', { replace: true })
      } else {
        setCheckError(
          "We couldn't confirm your verification yet. Please click the link in the email and try again."
        )
      }
    } catch {
      setCheckError('Something went wrong. Please try again.')
    } finally {
      setCheckLoading(false)
    }
  }

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) return <></>

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo className="size-10" />
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          {/* Icon + heading */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to{' '}
                <span className="font-medium text-foreground">{user.email}</span>.
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {resentSuccess && (
            <Alert
              variant="default"
              className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
            >
              <CheckCircle2 className="size-4" />
              <AlertDescription>Verification email resent successfully!</AlertDescription>
            </Alert>
          )}

          {checkError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{checkError}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" disabled={checkLoading} onClick={handleCheckVerified}>
              {checkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              I&apos;ve verified my email
            </Button>

            <Button
              className="w-full"
              disabled={cooldown > 0}
              onClick={handleResend}
              variant="outline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </Button>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Didn&apos;t receive the email?</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Check your spam or junk folder.</li>
              <li>
                Make sure <span className="font-medium">{user.email}</span> is correct.
              </li>
              <li>Wait a minute and click &ldquo;Resend&rdquo;.</li>
            </ul>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Wrong account?{' '}
            <button
              className="font-medium text-foreground underline underline-offset-4"
              onClick={handleLogout}
              type="button"
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
