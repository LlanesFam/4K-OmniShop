import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Check, Eye, EyeOff, Loader2, X } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters.')
      .max(50, 'Name must be less than 50 characters.')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes.')
      .trim(),
    email: z.string().email('Please enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  })

type SignUpValues = z.infer<typeof signUpSchema>

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Sign-up page.
 *
 * Registration flow:
 * 1. User fills in Name, Email, Password, and Confirm Password.
 * 2. Firebase account is created and `displayName` is set.
 * 3. A verification email is sent to the user's address.
 * 4. A Firestore profile document is written with `status: 'pending'`.
 * 5. User is redirected to `/verify-email`.
 *
 * Google SSO follows the same Firestore profile creation but skips email verification.
 */
export default function SignUp(): React.JSX.Element {
  const theme = useResolvedTheme()
  const isDark = theme === 'dark'

  const { signUp, loginWithGoogle, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { navigateTo, exiting } = useTransitionNavigate()

  const form = useForm<SignUpValues>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
    resolver: zodResolver(signUpSchema)
  })

  const passwordValue = form.watch('password')

  const handleSubmit = async (data: SignUpValues): Promise<void> => {
    setIsSubmitting(true)
    clearError()
    try {
      await signUp(data.name, data.email, data.password)
      // Account created + verification email sent → prompt user to check inbox
      navigate('/verify-email', { replace: true })
    } catch {
      // Error already stored in auth store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async (): Promise<void> => {
    setIsGoogleLoading(true)
    clearError()
    try {
      await loginWithGoogle()
      // Google users skip email verification → go straight to pending-approval
      navigate('/pending-approval', { replace: true })
    } catch {
      // Error stored in auth store
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <PageTransition exiting={exiting}>
      <div className="relative flex min-h-screen overflow-hidden bg-background">
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
              <OmnishopWordmark className="w-36" />
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign up and an admin will review your application.
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

            <div className="space-y-5">
              {/* Google SSO */}
              <Button
                className="w-full gap-2.5"
                disabled={isSubmitting || isGoogleLoading}
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

              {/* Sign-up form */}
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                  {/* Full name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="name"
                            placeholder="Maria Santos"
                            type="text"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
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

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              autoComplete="new-password"
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
                        {/* Live strength checklist – visible as soon as the user starts typing */}
                        {passwordValue.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <PasswordCheckItem
                              ok={passwordValue.length >= 8}
                              label="At least 8 characters"
                            />
                            <PasswordCheckItem
                              ok={/[A-Z]/.test(passwordValue)}
                              label="One uppercase letter"
                            />
                            <PasswordCheckItem
                              ok={/[0-9]/.test(passwordValue)}
                              label="One number"
                            />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              autoComplete="new-password"
                              className="pr-10"
                              placeholder="••••••••"
                              type={showConfirmPassword ? 'text' : 'password'}
                              {...field}
                            />
                            <button
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowConfirmPassword((s) => !s)}
                              tabIndex={-1}
                              type="button"
                            >
                              {showConfirmPassword ? (
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
                    Create account
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
                  onClick={() => navigateTo('/login')}
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel (decorative) ── */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted border-l">
          <div className="flex flex-col items-center gap-6 p-12 text-center max-w-sm">
            <OmnishopWordmark className="w-48" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">How it works</h2>
              <div className="space-y-3 text-left">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  'Create your account with your name, email, and a strong password.',
  'Verify your email address by clicking the link we send you.',
  'An admin will review and approve your account.',
  'Once approved, you can access the dashboard and POS.'
]

// ─── Password check item ──────────────────────────────────────────────────────

function PasswordCheckItem({ ok, label }: { ok: boolean; label: string }): React.JSX.Element {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
    >
      {ok ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
      {label}
    </div>
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
      <g clipPath="url(#google-clip-signup)">
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
        <clipPath id="google-clip-signup">
          <rect fill="white" height="16" width="15.6825" />
        </clipPath>
      </defs>
    </svg>
  )
}
