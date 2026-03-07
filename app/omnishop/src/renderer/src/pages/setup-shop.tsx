import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Store, Phone, MapPin, Loader2, FileText, Sparkles, Search, Check, Key } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import {
  createShopProfile,
  SHOP_CATEGORIES,
  CATEGORY_TAXONOMY,
  validateInviteCode,
  consumeInviteCode,
  type ShopCategory
} from '@/lib/shopService'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const ALL_CATEGORY_VALUES = [
  'electronics_tech',
  'mobile_gadgets',
  'clothing_fashion',
  'food_beverage',
  'hardware_diy',
  'beauty_wellness',
  'home_living',
  'gaming_hobbies',
  'digital_products',
  'printing_creative',
  'health_pharmacy',
  'cafe_coffee',
  'stationery_school',
  'professional_services',
  'events_booths',
  'pet_supplies',
  'automotive_parts',
  'other'
] as const

const shopSchema = z
  .object({
    shopName: z.string().min(3, 'Shop name must be at least 3 characters.'),
    description: z.string().min(10, 'Description must be at least 10 characters.'),
    categories: z
      .array(z.enum(ALL_CATEGORY_VALUES))
      .min(1, 'Select at least one business category.'),
    subCategories: z.array(z.string()),
    otherCategoryDetails: z.string().optional(),
    phone: z
      .string()
      .min(7, 'Enter a valid phone number.')
      .regex(/^[0-9+\-\s()]+$/, 'Enter a valid phone number.'),
    address: z.string().min(5, 'Enter your business address.')
  })
  .superRefine((data, ctx) => {
    const hasOther = data.categories.includes('other')
    const hasNonOther = data.categories.some((c) => c !== 'other')
    if (hasOther && (!data.otherCategoryDetails || data.otherCategoryDetails.length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please describe your category (at least 3 characters).',
        path: ['otherCategoryDetails']
      })
    }
    if (hasNonOther && data.subCategories.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one sub-category.',
        path: ['subCategories']
      })
    }
  })

type ShopFormValues = z.infer<typeof shopSchema>

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = ['Join Store', 'Business Info', 'Category', 'Contact'] as const
type Step = 0 | 1 | 2 | 3

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Shop setup onboarding page.
 *
 * Shown to approved users who have not yet created their shop profile.
 * Admins are never shown this page (they bypass it in DashboardLayout).
 */
export default function SetupShopPage(): React.JSX.Element {
  const { user, profile, logout, refreshProfile } = useAuthStore()
  const { shop, shopLoading } = useShopStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(0)
  // catPhase: 0 = pick main categories, 1 = pick sub-categories per chosen category
  const [catPhase, setCatPhase] = useState<0 | 1>(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [validatingInvite, setValidatingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      shopName: '',
      description: '',
      categories: [] as ShopCategory[],
      subCategories: [],
      phone: '',
      address: ''
    }
  })

  // Guard: must be logged-in and approved
  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user, navigate])

  // If shop already exists, skip to dashboard
  useEffect(() => {
    if (!shopLoading && shop) navigate('/dashboard', { replace: true })
  }, [shop, shopLoading, navigate])

  const onSubmit = async (values: ShopFormValues): Promise<void> => {
    if (!user) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createShopProfile(user.uid, {
        shopName: values.shopName.trim(),
        description: values.description.trim(),
        categories: values.categories as ShopCategory[],
        subCategories: values.subCategories,
        ...(values.otherCategoryDetails?.trim()
          ? { otherCategoryDetails: values.otherCategoryDetails.trim() }
          : {}),
        phone: values.phone.trim(),
        address: values.address.trim()
      })
      // useShopStore subscription will pick up the new doc;
      // navigate immediately for snappy UX.
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setSubmitError('Something went wrong saving your shop. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInviteCode = async (): Promise<void> => {
    if (!user || !inviteCode.trim()) return
    setValidatingInvite(true)
    setInviteError(null)
    try {
      const invite = await validateInviteCode(inviteCode)
      if (!invite) {
        setInviteError('Invalid or expired invite code.')
        return
      }
      await consumeInviteCode(user.uid, inviteCode)
      await refreshProfile()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      console.error(err)
      setInviteError('Something went wrong. Please try again.')
    } finally {
      setValidatingInvite(false)
    }
  }

  const handleNext = async (): Promise<void> => {
    if (step === 0) {
      setStep(1) // Move to create new store info
    } else if (step === 1) {
      const valid = await form.trigger(['shopName', 'description'])
      if (valid) setStep(2)
    } else if (step === 2) {
      if (catPhase === 0) {
        const valid = await form.trigger(['categories'])
        if (valid) setCatPhase(1)
      } else {
        const cats = form.getValues('categories')
        const hasNonOther = cats.some((c) => c !== 'other')
        const hasOther = cats.includes('other')
        const fields: (keyof ShopFormValues)[] = []
        if (hasNonOther) fields.push('subCategories')
        if (hasOther) fields.push('otherCategoryDetails')
        const valid = await form.trigger(fields.length > 0 ? fields : ['subCategories'])
        if (valid) setStep(3)
      }
    }
  }

  const displayName = profile?.displayName ?? user?.displayName ?? 'there'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      {/* ── Branding ── */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Logo className="size-10" />
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set up your shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, <span className="font-medium text-foreground">{displayName}</span>! Tell us
            about your business before you get started.
          </p>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <Form {...form}>
          {/* ── Progress ── */}
          <div className="mb-8 flex justify-between gap-2 px-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-2">
                <div
                  className={cn(
                    'h-1.5 w-full rounded-full transition-colors',
                    i <= step ? 'bg-primary' : 'bg-muted'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    i === step ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>

          {/* ── Step 0: Join or Create ── */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-6 flex flex-col items-center gap-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <Key className="size-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Join an existing Store</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the invite code provided by your store owner.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter Invite Code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="text-center font-mono text-lg tracking-widest uppercase"
                      maxLength={10}
                    />
                    {inviteError && (
                      <p className="text-center text-xs font-medium text-destructive">
                        {inviteError}
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={!inviteCode.trim() || validatingInvite}
                    onClick={handleInviteCode}
                  >
                    {validatingInvite ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Validate Code'
                    )}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">OR</span>
                </div>
              </div>

              <div
                className="rounded-xl border border-dashed p-6 text-center transition-colors hover:bg-muted/30 cursor-pointer"
                onClick={handleNext}
              >
                <div className="mb-4 flex flex-col items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Store className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Create a new Store</h3>
                    <p className="text-xs text-muted-foreground">
                      Start your own business and invite your team later.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  Continue Setup
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1: Business Info (Previously Step 0) ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Store className="size-4" />
                Business Information
              </div>

              <FormField
                control={form.control}
                name="shopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Name</FormLabel>
                    <FormControl>
                      <Input placeholder={`${displayName}'s Shop`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Description</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Tell customers what your shop is about…"
                        rows={3}
                        className={cn(
                          'flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm',
                          'shadow-sm placeholder:text-muted-foreground',
                          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* ── Step 2: Category ── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <FileText className="size-4" />
                Business Category
              </div>

              {/* ── Phase 0: Pick main categories ── */}
              {catPhase === 0 && (
                <>
                  <p className="text-sm text-muted-foreground -mt-1">
                    Select all categories that describe your shop. You can pick more than one.
                  </p>

                  {/* Smart search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search a niche… (e.g. RAM, Espresso, Banners)"
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Search results */}
                  {searchQuery.trim().length > 0 && (
                    <div className="rounded-lg border bg-card p-3 space-y-3 max-h-52 overflow-y-auto">
                      {(() => {
                        const q = searchQuery.toLowerCase()
                        const results = SHOP_CATEGORIES.flatMap((cat) => {
                          const subMatches = cat.subs.filter((s) => s.toLowerCase().includes(q))
                          const catMatch = cat.label.toLowerCase().includes(q)
                          if (!catMatch && subMatches.length === 0) return []
                          return [{ cat, subs: catMatch ? cat.subs : subMatches }]
                        })
                        if (results.length === 0)
                          return (
                            <p className="text-sm text-muted-foreground py-2 text-center">
                              No matches found.
                            </p>
                          )
                        return results.map(({ cat, subs }) => (
                          <div key={cat.value}>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                              {cat.emoji} {cat.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {subs.map((sub) => (
                                <button
                                  key={sub}
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:border-primary hover:bg-primary/5 transition-colors"
                                  onClick={() => {
                                    const currentCats = form.getValues('categories') ?? []
                                    if (!currentCats.includes(cat.value)) {
                                      form.setValue(
                                        'categories',
                                        [...currentCats, cat.value] as ShopCategory[],
                                        { shouldValidate: true }
                                      )
                                    }
                                    const currentSubs = form.getValues('subCategories') ?? []
                                    if (!currentSubs.includes(sub)) {
                                      form.setValue('subCategories', [...currentSubs, sub], {
                                        shouldValidate: true
                                      })
                                    }
                                    setSearchQuery('')
                                  }}
                                >
                                  {sub}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}

                  {/* Main category multi-select grid */}
                  {searchQuery.trim().length === 0 && (
                    <FormField
                      control={form.control}
                      name="categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-80 overflow-y-auto pr-0.5">
                              <TooltipProvider delayDuration={300}>
                                {SHOP_CATEGORIES.map((cat) => {
                                  const selected = (field.value as ShopCategory[]).includes(
                                    cat.value
                                  )
                                  const hasSubs = cat.subs.length > 0
                                  return (
                                    <Tooltip key={cat.value} disableHoverableContent>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = field.value as ShopCategory[]
                                            if (selected) {
                                              // deselect: also strip subs that belong to this category
                                              const catSubs = CATEGORY_TAXONOMY[cat.value].subs
                                              form.setValue(
                                                'subCategories',
                                                form
                                                  .getValues('subCategories')
                                                  .filter((s) => !catSubs.includes(s)),
                                                { shouldValidate: false }
                                              )
                                              if (cat.value === 'other')
                                                form.setValue('otherCategoryDetails', '')
                                              field.onChange(current.filter((c) => c !== cat.value))
                                            } else {
                                              field.onChange([...current, cat.value])
                                            }
                                          }}
                                          className={cn(
                                            'relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all w-full',
                                            'hover:border-primary/50 hover:bg-primary/5',
                                            selected
                                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                              : 'border-border bg-background'
                                          )}
                                        >
                                          {selected && (
                                            <span className="absolute top-1.5 right-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                              <Check className="size-2.5" />
                                            </span>
                                          )}
                                          <span className="text-xl">{cat.emoji}</span>
                                          <span className="text-xs font-medium leading-tight">
                                            {cat.label}
                                          </span>
                                        </button>
                                      </TooltipTrigger>
                                      {hasSubs && (
                                        <TooltipContent side="top" className="max-w-[180px] p-2.5">
                                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Includes
                                          </p>
                                          <ul className="space-y-0.5">
                                            {cat.subs.map((sub) => (
                                              <li
                                                key={sub}
                                                className="flex items-center gap-1.5 text-xs"
                                              >
                                                <span className="size-1 shrink-0 rounded-full bg-primary" />
                                                {sub}
                                              </li>
                                            ))}
                                          </ul>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  )
                                })}
                              </TooltipProvider>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {/* ── Phase 1: Sub-categories per chosen category ── */}
              {catPhase === 1 && (
                <>
                  <p className="text-sm text-muted-foreground -mt-1">
                    Now pick the specialties that best describe your inventory.
                  </p>

                  {/* Selected category chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {(form.getValues('categories') as ShopCategory[]).map((catKey) => (
                      <span
                        key={catKey}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30"
                      >
                        {CATEGORY_TAXONOMY[catKey].emoji} {CATEGORY_TAXONOMY[catKey].label}
                      </span>
                    ))}
                  </div>

                  {/* Sub-category sections grouped by category */}
                  <FormField
                    control={form.control}
                    name="subCategories"
                    render={({ field: subField }) => (
                      <FormItem>
                        <div className="space-y-4">
                          {(form.getValues('categories') as ShopCategory[])
                            .filter((c) => c !== 'other')
                            .map((catKey) => (
                              <div key={catKey}>
                                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {CATEGORY_TAXONOMY[catKey].emoji}{' '}
                                  {CATEGORY_TAXONOMY[catKey].label}
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {CATEGORY_TAXONOMY[catKey].subs.map((sub) => {
                                    const checked = subField.value?.includes(sub) ?? false
                                    return (
                                      <button
                                        key={sub}
                                        type="button"
                                        onClick={() => {
                                          const next = checked
                                            ? subField.value.filter((s) => s !== sub)
                                            : [...(subField.value ?? []), sub]
                                          subField.onChange(next)
                                        }}
                                        className={cn(
                                          'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                                          'hover:border-primary/50 hover:bg-primary/5',
                                          checked
                                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                            : 'border-border bg-background'
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                                            checked
                                              ? 'border-primary bg-primary text-primary-foreground'
                                              : 'border-muted-foreground/40'
                                          )}
                                        >
                                          {checked && <Check className="size-3" />}
                                        </span>
                                        {sub}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}

                          {/* Other: free-text */}
                          {(form.getValues('categories') as ShopCategory[]).includes('other') && (
                            <FormField
                              control={form.control}
                              name="otherCategoryDetails"
                              render={({ field: otherField }) => (
                                <FormItem>
                                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    📦 Other
                                  </p>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g. Vintage Furniture, Imported Goods…"
                                      {...otherField}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Contact ── */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Phone className="size-4" />
                Contact Details
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +63 917 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        Business Address
                      </span>
                    </FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="e.g. 123 Rizal St., Barangay San Jose, Quezon City"
                        rows={3}
                        className={cn(
                          'flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm',
                          'shadow-sm placeholder:text-muted-foreground',
                          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit error */}
              {submitError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {submitError}
                </p>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between pt-6 border-t mt-8">
            {step > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (step === 2 && catPhase === 1) {
                    setCatPhase(0)
                  } else {
                    setStep((s) => (s - 1) as Step)
                  }
                }}
                disabled={submitting}
              >
                ← Back
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => void logout().then(() => navigate('/login', { replace: true }))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            )}

            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Continue →
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2"
                onClick={form.handleSubmit(onSubmit)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating shop…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Launch my shop
                  </>
                )}
              </Button>
            )}
          </div>
        </Form>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        You can update your shop details anytime from Settings.
      </p>
    </div>
  )
}
