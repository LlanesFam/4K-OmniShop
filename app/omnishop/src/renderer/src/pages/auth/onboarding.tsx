import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Globe, Loader2, MapPin, MessageSquare, Tag } from 'lucide-react'

import { useAuthStore, type OnboardingAnswers } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STORE_TYPES = ['Hardware', 'Clothing', 'Food', 'Electronics', 'General', 'Other']
const REFERRAL_SOURCES = ['Friend', 'GitHub', 'Social Media', 'Our Page / Ad', 'Other']

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Onboarding questionnaire page — shown to newly registered users before their
 * application enters the admin review queue (`status: 'pending'`).
 *
 * Flow: sign-up → (verify email) → /onboarding → (submit) → /pending-approval
 *
 * Guards:
 * - No user → /login
 * - status 'approved'          → /dashboard
 * - status 'pending'/'rejected' → /pending-approval
 */
export default function OnboardingPage(): React.JSX.Element {
  const { user, profile, completeOnboarding } = useAuthStore()
  const navigate = useNavigate()

  const [storeDescription, setStoreDescription] = useState('')
  const [storeType, setStoreType] = useState('')
  const [existingShopLink, setExistingShopLink] = useState('')
  const [referralSource, setReferralSource] = useState('')
  const [storeLocation, setStoreLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guards
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (!profile) return
    if (profile.status === 'approved') {
      navigate('/dashboard', { replace: true })
      return
    }
    if (profile.status === 'pending' || profile.status === 'rejected') {
      navigate('/pending-approval', { replace: true })
    }
  }, [user, profile, navigate])

  const canSubmit = storeDescription.trim().length > 0 && referralSource.length > 0

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const answers: OnboardingAnswers = {
        storeDescription: storeDescription.trim(),
        ...(storeType && { storeType }),
        ...(existingShopLink.trim() && { existingShopLink: existingShopLink.trim() }),
        referralSource,
        ...(storeLocation.trim() && { storeLocation: storeLocation.trim() })
      }
      await completeOnboarding(answers)
      navigate('/pending-approval', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return <></>

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-6 py-12 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo className="size-10" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList className="size-7" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold tracking-tight">Tell us about your store</h1>
                <p className="text-sm text-muted-foreground">
                  Answer a few quick questions so we can review your application.
                </p>
              </div>
            </div>

            {/* ── Q1: Store description ── */}
            <div className="space-y-2">
              <Label htmlFor="storeDescription" className="flex items-center gap-1.5 text-sm">
                <MessageSquare className="size-3.5" />
                What&apos;s your store about?
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <textarea
                id="storeDescription"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="e.g. A general merchandise store selling household items and school supplies in our local community."
                rows={3}
                required
                disabled={submitting}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* ── Q2: Store type chips ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Tag className="size-3.5" />
                Type of store
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {STORE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={submitting}
                    onClick={() => setStoreType((prev) => (prev === type ? '' : type))}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      storeType === type
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Q3: Existing shop link ── */}
            <div className="space-y-2">
              <Label htmlFor="shopLink" className="flex items-center gap-1.5 text-sm">
                <Globe className="size-3.5" />
                Your existing shop link
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="shopLink"
                type="url"
                value={existingShopLink}
                onChange={(e) => setExistingShopLink(e.target.value)}
                placeholder="https://facebook.com/yourshop"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Social media page, website, or any link to your existing store.
              </p>
            </div>

            {/* ── Q4: Referral source chips ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                How did you find out about us?
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {REFERRAL_SOURCES.map((src) => (
                  <button
                    key={src}
                    type="button"
                    disabled={submitting}
                    onClick={() => setReferralSource((prev) => (prev === src ? '' : src))}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      referralSource === src
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Q5: Store location ── */}
            <div className="space-y-2">
              <Label htmlFor="storeLocation" className="flex items-center gap-1.5 text-sm">
                <MapPin className="size-3.5" />
                Store location / city
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="storeLocation"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g. Cebu City, Philippines"
                disabled={submitting}
              />
            </div>

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Submit */}
            <Button type="submit" className="w-full gap-2" disabled={submitting || !canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Application'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Your answers will only be visible to store administrators during the review process.
            </p>
          </div>
        </form>

        {/* Sign out escape hatch */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={async () => {
              await useAuthStore.getState().logout()
              navigate('/login', { replace: true })
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
