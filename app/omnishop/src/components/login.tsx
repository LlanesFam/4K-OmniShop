import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, PowerOff } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { quitApp } from '@/lib/tauri'
import { useResolvedTheme } from '@/store/useThemeStore'
import Particles from '@/components/ui/particles'
import { PageTransition } from '@/components/ui/page-transition'
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OmnishopWordmark } from '@/components/ui/omnishop-wordmark'
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

// ─── Schemas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
})

const resetSchema = z.object({
  resetEmail: z.string().email('Please enter a valid email address.')
})

type LoginValues = z.infer<typeof loginSchema>
type ResetValues = z.infer<typeof resetSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the correct post-login route based on email verification and profile status. */
function resolvePostLoginRoute(
  emailVerified: boolean,
  isPasswordProvider: boolean,
  profileStatus?: string
): string {
  if (isPasswordProvider && !emailVerified) return '/verify-email'
  if (!profileStatus || profileStatus !== 'approved') return '/pending-approval'
  return '/dashboard'
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Login page.
 *
 * Handles:
 * - Email / password sign-in
 * - Google SSO sign-in
 * - Inline "Forgot password" reset flow
 * - Redirect logic: verify-email → pending-approval → dashboard
 */
export default function Login(): React.JSX.Element {
  const theme = useResolvedTheme()
  const isDark = theme === 'dark'

  const {
    login,
    loginWithGoogle,
    sendPasswordReset,
    user,
    profile,
    loading,
    profileLoading,
    error,
    clearError
  } = useAuthStore()
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { navigateTo, exiting } = useTransitionNavigate()

  const loginForm = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
    resolver: zodResolver(loginSchema)
  })

  const resetForm = useForm<ResetValues>({
    defaultValues: { resetEmail: '' },
    resolver: zodResolver(resetSchema)
  })

  // ── Redirect: watch auth state changes after a successful login ──
  useEffect(() => {
    if (!user || profileLoading) return

    const isPasswordProvider = user.providerData.some((p) => p.providerId === 'password')
    const destination = resolvePostLoginRoute(
      user.emailVerified,
      isPasswordProvider,
      profile?.status
    )
    navigate(destination, { replace: true })
  }, [user, profile, profileLoading, navigate])

  // ── Login submit ──
  const handleLogin = async (data: LoginValues): Promise<void> => {
    setIsSubmitting(true)
    clearError()
    try {
      await login(data.email, data.password)
      // Redirect is handled by the useEffect above
    } catch {
      // Error already stored in the auth store
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Google SSO ──
  const handleGoogle = async (): Promise<void> => {
    setIsGoogleLoading(true)
    clearError()
    try {
      await loginWithGoogle()
      // Redirect handled by useEffect
    } catch {
      // Error stored in auth store
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // ── Password reset ──
  const handleReset = async (data: ResetValues): Promise<void> => {
    setResetLoading(true)
    setResetError(null)
    try {
      await sendPasswordReset(data.resetEmail)
      setResetSent(true)
    } catch {
      setResetError('Could not send reset email. Please check the address and try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const backToLogin = (): void => {
    setShowReset(false)
    setResetSent(false)
    setResetError(null)
    resetForm.reset()
    clearError()
  }

  return (
    <PageTransition exiting={exiting}>
      <div className="relative flex h-screen overflow-hidden bg-background">
        {/* ── Quit button ── */}
        <button
          onClick={() => setShowQuitConfirm(true)}
          title="Quit OmniShop"
          className="absolute right-4 top-4 z-50 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Quit app"
        >
          <PowerOff className="size-4" />
        </button>
        <Particles
          className="absolute inset-0"
          quantity={80}
          ease={80}
          color={isDark ? '#ffffff' : '#000000'}
        />

        {/* ── Left panel (form) ── */}
        <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-sm">
            {/* Branding */}
            <div className="mb-8 flex flex-col items-center gap-3">
              <button
                type="button"
                aria-label="Go to home"
                onClick={() => navigateTo('/')}
                className="transition-opacity hover:opacity-75"
              >
                <OmnishopWordmark className="w-36" />
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">
                  {showReset ? 'Reset your password' : 'Welcome back'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {showReset
                    ? "Enter your email and we'll send a reset link."
                    : 'Sign in to your OmniShop account.'}
                </p>
              </div>
            </div>

            {/* ── Error alert ── */}
            {error?.message && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="size-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            {/* ── Reset password flow ── */}
            {showReset ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Reset email sent!
                    </p>
                    <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                      Check your inbox for a link to reset your password.
                    </p>
                  </div>
                ) : (
                  <Form {...resetForm}>
                    <form className="space-y-4" onSubmit={resetForm.handleSubmit(handleReset)}>
                      {resetError && (
                        <Alert variant="destructive">
                          <AlertCircle className="size-4" />
                          <AlertDescription>{resetError}</AlertDescription>
                        </Alert>
                      )}
                      <FormField
                        control={resetForm.control}
                        name="resetEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email address</FormLabel>
                            <FormControl>
                              <Input placeholder="you@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button className="w-full" disabled={resetLoading} type="submit">
                        {resetLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Send reset email
                      </Button>
                    </form>
                  </Form>
                )}
                <button
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={backToLogin}
                  type="button"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </button>
              </div>
            ) : (
              /* ── Login flow ── */
              <div className="space-y-5">
                {/* Google SSO */}
                <Button
                  className="w-full gap-2.5"
                  disabled={isGoogleLoading || isSubmitting || loading}
                  onClick={handleGoogle}
                  type="button"
                  variant="outline"
                >
                  {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleLogo />}
                  Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="shrink-0 text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                {/* Email / password form */}
                <Form {...loginForm}>
                  <form className="space-y-4" onSubmit={loginForm.handleSubmit(handleLogin)}>
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="email"
                              placeholder="you@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowReset(true)}
                              type="button"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input
                                autoComplete="current-password"
                                className="pr-10"
                                placeholder="••••••••"
                                type={showPassword ? 'text' : 'password'}
                                {...field}
                              />
                              <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowPassword((s) => !s)}
                                tabIndex={-1}
                                type="button"
                              >
                                {showPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      className="w-full"
                      disabled={isSubmitting || isGoogleLoading}
                      type="submit"
                    >
                      {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Sign in
                    </Button>
                  </form>
                </Form>

                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    to="/signup"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Quit confirmation ── */}
        <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quit OmniShop?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to close the application?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void quitApp()}
              >
                Quit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Right panel (decorative) ── */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted border-l">
          <div className="flex flex-col items-center gap-4 p-12 text-center max-w-sm">
            <button
              type="button"
              aria-label="Go to home"
              onClick={() => navigateTo('/')}
              className="transition-opacity hover:opacity-75"
            >
              <OmnishopWordmark className="w-48" />
            </button>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your offline-first point-of-sale and store manager. Works without internet. Syncs when
              you&apos;re back online.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

// ─── Google Logo SVG ─────────────────────────────────────────────────────────

function GoogleLogo(): React.JSX.Element {
  return (
    <svg
      fill="none"
      height="1em"
      viewBox="0 0 16 16"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#google-clip)">
        <path
          d="M15.6823 8.18368C15.6823 7.63986 15.6382 7.0931 15.5442 6.55811H7.99829V9.63876H12.3194C12.1401 10.6323 11.564 11.5113 10.7203 12.0698V14.0687H13.2983C14.8122 12.6753 15.6823 10.6176 15.6823 8.18368Z"
          fill="#4285F4"
        />
        <path
          d="M7.99812 16C10.1558 16 11.9753 15.2915 13.3011 14.0687L10.7231 12.0698C10.0058 12.5578 9.07988 12.8341 8.00106 12.8341C5.91398 12.8341 4.14436 11.426 3.50942 9.53296H0.849121V11.5936C2.2072 14.295 4.97332 16 7.99812 16Z"
          fill="#34A853"
        />
        <path
          d="M3.50665 9.53295C3.17154 8.53938 3.17154 7.4635 3.50665 6.46993V4.4093H0.849292C-0.285376 6.66982-0.285376 9.33306 0.849292 11.5936L3.50665 9.53295Z"
          fill="#FBBC04"
        />
        <path
          d="M7.99812 3.16589C9.13867 3.14825 10.241 3.57743 11.067 4.36523L13.3511 2.0812C11.9048 0.723121 9.98526-0.0235266 7.99812-1.02057e-05C4.97332-1.02057e-05 2.2072 1.70493 0.849121 4.40932L3.50648 6.46995C4.13848 4.57394 5.91104 3.16589 7.99812 3.16589Z"
          fill="#EA4335"
        />
      </g>
      <defs>
        <clipPath id="google-clip">
          <rect fill="white" height="16" width="15.6825" />
        </clipPath>
      </defs>
    </svg>
  )
}
