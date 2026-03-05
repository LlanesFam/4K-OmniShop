import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Monitor,
  Moon,
  Settings,
  Sun,
  Maximize2,
  AppWindow,
  Store,
  Save,
  Loader2,
  User,
  Palette,
  MonitorSmartphone,
  Bell,
  Camera,
  Power,
  AlertCircle,
  Trash2,
  ShieldAlert
} from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import { type Theme, type ColorTheme, useThemeStore } from '@/store/useThemeStore'
import { type DisplayMode, type Resolution, useDisplayStore } from '@/store/useDisplayStore'
import {
  createShopProfile,
  updateShopProfile,
  SHOP_CATEGORIES,
  CATEGORY_TAXONOMY,
  type ShopCategory
} from '@/lib/shopService'
import { uploadImage } from '@/lib/cloudinaryService'
import { updateUserPreferences } from '@/lib/userPreferencesService'
import { isAutostartEnabled, setAutostart } from '@/lib/tauri'
import { ImageUpload } from '@/components/ui/image-upload'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' }
]

function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex overflow-hidden rounded-md border">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 border-r px-3 py-1.5 text-xs font-medium transition-colors last:border-r-0',
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-muted'
          )}
        >
          <Icon className="size-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

const COLOR_THEME_OPTIONS: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'modern-minimal', label: 'Default', color: 'bg-zinc-950' },
  { value: 'dark-matter', label: 'Dark Matter', color: 'bg-indigo-950' },
  { value: 'amber-minimal', label: 'Amber', color: 'bg-amber-600' },
  { value: 'caffeine', label: 'Caffeine', color: 'bg-orange-800' },
  { value: 'nature', label: 'Nature', color: 'bg-emerald-700' },
  { value: 'violet-bloom', label: 'Violet', color: 'bg-violet-700' },
  { value: 'moca-mousse', label: 'Moca', color: 'bg-stone-600' }
]

function ColorThemeToggle(): React.JSX.Element {
  const { colorTheme, setColorTheme } = useThemeStore()

  return (
    <div className="flex flex-wrap gap-2 justify-end max-w-[280px]">
      {COLOR_THEME_OPTIONS.map(({ value, label, color }) => (
        <button
          key={value}
          onClick={() => setColorTheme(value)}
          title={label}
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            colorTheme === value
              ? 'border-primary ring-1 ring-ring bg-accent text-accent-foreground'
              : 'border-transparent bg-muted text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:border-border'
          )}
        >
          <span className={cn('size-3 rounded-full', color)} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Display Mode Toggle ──────────────────────────────────────────────────────

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; icon: React.ElementType; label: string }[] = [
  { value: 'fullscreen', icon: Maximize2, label: 'Full Screen' },
  { value: 'borderless', icon: Monitor, label: 'Borderless' },
  { value: 'windowed', icon: AppWindow, label: 'Windowed' }
]

const RESOLUTION_OPTIONS: { value: Resolution; label: string; sub: string }[] = [
  { value: '1280x720', label: '720p', sub: '1280×720' },
  { value: '1366x768', label: '768p', sub: '1366×768' },
  { value: '1600x900', label: '900p', sub: '1600×900' },
  { value: '1920x1080', label: '1080p', sub: '1920×1080' }
]

function DisplayModeToggle(): React.JSX.Element {
  const { mode, setMode } = useDisplayStore()
  // Confirmation state for the fullscreen switch (auto-reverts if not confirmed)
  const [confirming, setConfirming] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const prevModeRef = useRef<DisplayMode>(mode)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const revertFullscreen = useCallback(() => {
    stopTick()
    setConfirming(false)
    setCountdown(10)
    setMode(prevModeRef.current)
  }, [stopTick, setMode])

  const confirmFullscreen = useCallback(() => {
    stopTick()
    setConfirming(false)
    setCountdown(10)
    // Mode is already applied — nothing else to do.
  }, [stopTick])

  const handleModeClick = useCallback(
    (value: DisplayMode) => {
      if (value === 'fullscreen' && mode !== 'fullscreen') {
        prevModeRef.current = mode
        setMode('fullscreen')
        setConfirming(true)
        setCountdown(10)
        tickRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              // Auto-revert when countdown hits 0
              stopTick()
              setConfirming(false)
              setMode(prevModeRef.current)
              return 10
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setMode(value)
      }
    },
    [mode, setMode, stopTick]
  )

  // Clean up interval on unmount
  useEffect(() => () => stopTick(), [stopTick])

  return (
    <>
      <div className="flex overflow-hidden rounded-md border">
        {DISPLAY_MODE_OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => handleModeClick(value)}
            title={label}
            className={cn(
              'flex items-center gap-1.5 border-r px-3 py-1.5 text-xs font-medium transition-colors last:border-r-0',
              mode === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Fullscreen confirmation overlay ────────────────────────────── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-10 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-card shadow-xl px-5 py-3.5 text-sm">
            <span className="font-medium">Keep Full Screen?</span>
            <span className="text-muted-foreground text-xs">
              Reverting in <span className="font-semibold tabular-nums">{countdown}s</span>
            </span>
            <button
              onClick={confirmFullscreen}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Keep
            </button>
            <button
              onClick={revertFullscreen}
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >
              Revert
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function ResolutionToggle(): React.JSX.Element {
  const { resolution, setResolution, mode } = useDisplayStore()
  const isDisabled = mode === 'fullscreen' || mode === 'borderless'

  return (
    <div className="flex flex-wrap gap-2 justify-end max-w-[280px]">
      {RESOLUTION_OPTIONS.map(({ value, label, sub }) => (
        <button
          key={value}
          onClick={() => !isDisabled && setResolution(value)}
          disabled={isDisabled}
          title={isDisabled ? 'Only available in Windowed mode' : sub}
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            isDisabled
              ? 'cursor-not-allowed opacity-40 border-transparent bg-muted text-muted-foreground'
              : resolution === value
                ? 'border-primary ring-1 ring-ring bg-accent text-accent-foreground'
                : 'border-transparent bg-muted text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:border-border'
          )}
        >
          <span className="font-semibold">{label}</span>
          <span className="text-muted-foreground/60 text-[10px]">{sub}</span>
        </button>
      ))}
    </div>
  )
}
// ─── Shared helper ────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  control,
  align = 'center'
}: {
  label: string
  description: string
  control: React.ReactNode
  align?: 'center' | 'start'
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-4 px-6 py-4 justify-between',
        align === 'start' ? 'items-start' : 'items-center'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

// ─── Store Tab ────────────────────────────────────────────────────────────────

function StoreTab(): React.JSX.Element {
  const { user, profile } = useAuthStore()
  const { shop } = useShopStore()
  const isAdmin = profile?.role === 'admin'

  const [categories, setCategories] = useState<ShopCategory[]>(shop?.categories ?? [])
  const [subCategories, setSubCategories] = useState<string[]>(shop?.subCategories ?? [])
  const [logoUrl, setLogoUrl] = useState(shop?.logoUrl ?? '')
  const [bannerUrl, setBannerUrl] = useState(shop?.bannerUrl ?? '')
  const [defaultProductImageUrl, setDefaultProductImageUrl] = useState(
    shop?.defaultProductImageUrl ?? ''
  )
  // Admins who haven't set up a shop yet default to the "OmniShop" name.
  const [shopName, setShopName] = useState(shop?.shopName ?? (isAdmin ? 'OmniShop' : ''))
  const [description, setDescription] = useState(shop?.description ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [address, setAddress] = useState(shop?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pre-fill once — fires as soon as shop data arrives from Firestore,
  // whether the component mounted before or after the subscription resolved.
  // The ref prevents overwriting in-progress user edits on subsequent renders.
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    if (!shop) {
      // No shop yet. For admin, defaults are already set via useState initial
      // values ("OmniShop"). Mark initialized so this effect doesn't keep
      // running if Firestore confirms the shop truly doesn't exist.
      if (isAdmin) initialized.current = true
      return
    }
    initialized.current = true
    setCategories(shop.categories ?? [])
    setSubCategories(shop.subCategories ?? [])
    setLogoUrl(shop.logoUrl ?? '')
    setBannerUrl(shop.bannerUrl ?? '')
    setDefaultProductImageUrl(shop.defaultProductImageUrl ?? '')
    setShopName(shop.shopName ?? '')
    setDescription(shop.description ?? '')
    setPhone(shop.phone ?? '')
    setAddress(shop.address ?? '')
  }, [shop, isAdmin])

  const handleSave = async (): Promise<void> => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      const data = {
        categories,
        subCategories,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        defaultProductImageUrl: defaultProductImageUrl || undefined,
        shopName,
        description,
        phone,
        address
      }
      if (!shop) {
        // No Firestore document exists yet (first-time admin shop setup).
        // updateDoc would throw on a non-existent document, so we use
        // createShopProfile (setDoc) to initialise it instead.
        await createShopProfile(user.uid, data)
      } else {
        await updateShopProfile(user.uid, data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Admin first-time setup hint */}
      {isAdmin && !shop && (
        <div className="flex items-start gap-3 border-b bg-primary/5 px-6 py-4">
          <Store className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Set up your OmniShop</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              As admin your shop is called{' '}
              <span className="font-medium text-foreground">OmniShop</span>. Fill in the details
              below and click <span className="font-medium text-foreground">Save changes</span> to
              initialise it.
            </p>
          </div>
        </div>
      )}
      <div className="divide-y">
        {/* Categories */}
        <div className="px-6 py-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Shop Categories</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select all categories that describe what your shop sells.
            </p>
          </div>

          {/* Category chips — selected float to the top */}
          <div className="flex flex-wrap gap-2">
            {[...SHOP_CATEGORIES]
              .sort((a, b) => {
                const aS = categories.includes(a.value)
                const bS = categories.includes(b.value)
                if (aS && !bS) return -1
                if (!aS && bS) return 1
                return 0
              })
              .map(({ value, label, emoji }) => {
                const selected = categories.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setCategories((prev) =>
                        selected ? prev.filter((c) => c !== value) : [...prev, value]
                      )
                      // Remove subs belonging to this category when deselecting
                      if (selected) {
                        const removedSubs = CATEGORY_TAXONOMY[value].subs
                        setSubCategories((prev) => prev.filter((s) => !removedSubs.includes(s)))
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                )
              })}
          </div>

          {/* Subcategories — shown per selected parent */}
          {categories.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Subcategories
              </p>
              {categories.map((cat) => {
                const { label, emoji, subs } = CATEGORY_TAXONOMY[cat]
                if (subs.length === 0) return null
                return (
                  <div key={cat} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-foreground">
                      {emoji} {label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((sub) => {
                        const subSelected = subCategories.includes(sub)
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() =>
                              setSubCategories((prev) =>
                                subSelected ? prev.filter((s) => s !== sub) : [...prev, sub]
                              )
                            }
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                              subSelected
                                ? 'border-primary/60 bg-primary/10 text-primary'
                                : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
                            )}
                          >
                            {sub}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Banner */}
        <div className="px-6 py-4 flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium">Shop Banner</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A wide hero image displayed at the top of your storefront. Recommended: 1200×300 px.
            </p>
          </div>
          <ImageUpload
            value={bannerUrl}
            onUpload={setBannerUrl}
            folder="banners"
            aspectRatio="banner"
            label="Drag & drop or click to upload a banner"
            className="mt-1"
            cropEnabled
          />
        </div>

        {/* Logo */}
        <div className="flex items-start justify-between gap-4 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Shop Logo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Square image shown in the sidebar, receipts, and invoices.
            </p>
          </div>
          <ImageUpload
            value={logoUrl}
            onUpload={setLogoUrl}
            folder="logos"
            aspectRatio="square"
            label="Upload logo"
            className="w-28 shrink-0"
            cropEnabled
          />
        </div>

        {/* Default Product Image */}
        <div className="flex items-start justify-between gap-4 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Default Product Image</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shown for products that have no photo. Leave empty to use the OmniShop logo.
            </p>
          </div>
          <ImageUpload
            value={defaultProductImageUrl}
            onUpload={setDefaultProductImageUrl}
            folder="product-placeholders"
            aspectRatio="square"
            label="Upload placeholder"
            className="w-28 shrink-0"
            cropEnabled
          />
        </div>

        <SettingRow
          label="Shop Name"
          description="The public name of your business."
          control={
            <Input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Zen Garden Gifts"
              className="w-52 text-sm"
            />
          }
        />

        <SettingRow
          label="Description"
          description="A short summary of what your shop sells (shown on receipts)."
          align="start"
          control={
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe your shop…"
              className="w-52 shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          }
        />

        <SettingRow
          label="Phone"
          description="Contact number displayed on invoices and receipts."
          control={
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 900 000 0000"
              className="w-52 text-sm"
            />
          }
        />

        <SettingRow
          label="Address"
          description="Your physical store or business address."
          control={
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
              className="w-52 text-sm"
            />
          }
        />

        {/* Save row */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-muted/20">
          {saved ? (
            <p className="text-xs text-emerald-600 font-medium">✓ Store settings saved.</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
// ─── Account Tab ─────────────────────────────────────────────────────────────

function AccountTab(): React.JSX.Element {
  const { user, refreshUser } = useAuthStore()
  const isGoogle = user?.providerData?.some((p) => p.providerId === 'google.com') ?? false

  const [photoCropSrc, setPhotoCropSrc] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoSaved, setPhotoSaved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoCropSrc(url)
    e.target.value = ''
  }

  const handlePhotoCropApply = async (blob: Blob): Promise<void> => {
    if (photoCropSrc) URL.revokeObjectURL(photoCropSrc)
    setPhotoCropSrc(null)
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
      const result = await uploadImage(file, 'profiles')
      if (!auth.currentUser) throw new Error('Not authenticated.')
      await updateProfile(auth.currentUser, { photoURL: result.secureUrl })
      await refreshUser()
      setPhotoSaved(true)
      setTimeout(() => setPhotoSaved(false), 3000)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePhotoCropCancel = (): void => {
    if (photoCropSrc) URL.revokeObjectURL(photoCropSrc)
    setPhotoCropSrc(null)
  }

  return (
    <>
      {/* Crop modal for profile photo */}
      {photoCropSrc && (
        <ImageCropModal
          imageSrc={photoCropSrc}
          aspect={1}
          onApply={(blob) => void handlePhotoCropApply(blob)}
          onCancel={handlePhotoCropCancel}
        />
      )}

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="divide-y">
          {/* Avatar + upload */}
          <div className="flex items-center gap-5 px-6 py-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="size-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="size-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl select-none">
                  {initials}
                </div>
              )}
              {/* Upload overlay — only for non-Google */}
              {!isGoogle && (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Change profile photo"
                  className={cn(
                    'absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full',
                    'border-2 border-card bg-primary text-primary-foreground shadow',
                    'hover:bg-primary/90 transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-60'
                  )}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Camera className="size-3" />
                  )}
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handlePhotoFileChange}
              />
            </div>

            {/* Name + status */}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.displayName ?? '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? '—'}</p>
              <span
                className={cn(
                  'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  isGoogle ? 'bg-blue-500/10 text-blue-400' : 'bg-muted text-muted-foreground'
                )}
              >
                {isGoogle ? 'Google account' : 'Email account'}
              </span>
            </div>

            {/* Photo save feedback */}
            {photoSaved && (
              <p className="ml-auto text-xs text-emerald-600 font-medium shrink-0">
                ✓ Photo updated.
              </p>
            )}
            {photoError && (
              <p className="ml-auto text-xs text-destructive shrink-0">{photoError}</p>
            )}
            {!isGoogle && !photoSaved && !photoError && (
              <p className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
                Click the camera icon to change photo
              </p>
            )}
          </div>

          <SettingRow
            label="Display Name"
            description="Your name shown in the sidebar and receipts."
            control={
              <p className="max-w-[200px] truncate text-right text-sm font-medium">
                {user?.displayName ?? '—'}
              </p>
            }
          />

          <SettingRow
            label="Email"
            description="The email address associated with this account."
            control={
              <p className="max-w-[200px] truncate text-right text-sm text-muted-foreground">
                {user?.email ?? '—'}
              </p>
            }
          />

          <SettingRow
            label="Sign-in Provider"
            description="How you authenticate into this account."
            control={
              <span className="text-sm text-muted-foreground">
                {isGoogle ? 'Google' : 'Email / Password'}
              </span>
            }
          />
        </div>
      </div>
    </>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab(): React.JSX.Element {
  const { user, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const [saving, setSaving] = useState(false)

  const notifPrefs = profile?.preferences?.notifications ?? {}
  const [updateAvailable, setUpdateAvailable] = useState(notifPrefs.updateAvailable ?? true)
  const [newUserApproval, setNewUserApproval] = useState(notifPrefs.newUserApproval ?? true)

  // Sync local state when prefs arrive from Firestore
  useEffect(() => {
    const p = profile?.preferences?.notifications
    if (p) {
      setUpdateAvailable(p.updateAvailable ?? true)
      setNewUserApproval(p.newUserApproval ?? true)
    }
  }, [profile?.preferences?.notifications])

  const handleSave = async (): Promise<void> => {
    if (!user) return
    setSaving(true)
    try {
      await updateUserPreferences(user.uid, {
        notifications: {
          updateAvailable,
          newUserApproval: isAdmin ? newUserApproval : undefined
        }
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="divide-y">
        <SettingRow
          label="Update Available"
          description="Get a system notification when a new version of OmniShop is ready to install."
          control={<Switch checked={updateAvailable} onCheckedChange={setUpdateAvailable} />}
        />
        {isAdmin && (
          <SettingRow
            label="New User Approval"
            description="Get notified when a new user registers and is waiting for your approval."
            control={<Switch checked={newUserApproval} onCheckedChange={setNewUserApproval} />}
          />
        )}
        <div className="flex items-center justify-end gap-4 px-6 py-4 bg-muted/20">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── System Tab ───────────────────────────────────────────────────────────────

function SystemTab(): React.JSX.Element {
  const { user, profile } = useAuthStore()
  const [autostart, setAutostartState] = useState(false)
  const [autostartLoading, setAutostartLoading] = useState(true)
  const [autostartSaving, setAutostartSaving] = useState(false)

  const autoUpdate = profile?.preferences?.autoUpdate ?? true
  const [autoUpdateState, setAutoUpdateState] = useState(autoUpdate)
  const [savingAutoUpdate, setSavingAutoUpdate] = useState(false)

  // Sync autoUpdate from Firestore prefs
  useEffect(() => {
    const v = profile?.preferences?.autoUpdate
    if (v !== undefined) setAutoUpdateState(v)
  }, [profile?.preferences?.autoUpdate])

  // Read current autostart state from OS on mount
  useEffect(() => {
    void isAutostartEnabled().then((enabled) => {
      setAutostartState(enabled)
      setAutostartLoading(false)
    })
  }, [])

  const handleAutostartChange = async (checked: boolean): Promise<void> => {
    setAutostartSaving(true)
    try {
      await setAutostart(checked)
      setAutostartState(checked)
    } finally {
      setAutostartSaving(false)
    }
  }

  const handleAutoUpdateChange = async (checked: boolean): Promise<void> => {
    if (!user) return
    setSavingAutoUpdate(true)
    setAutoUpdateState(checked)
    try {
      await updateUserPreferences(user.uid, { autoUpdate: checked })
    } finally {
      setSavingAutoUpdate(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="divide-y">
        <SettingRow
          label="Launch at Login"
          description="Automatically start OmniShop when you log in to Windows."
          control={
            autostartLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-2">
                {autostartSaving && (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={autostart}
                  onCheckedChange={(v) => void handleAutostartChange(v)}
                  disabled={autostartSaving}
                />
              </div>
            )
          }
        />
        <SettingRow
          label="Auto-Update"
          description="Automatically download updates in the background. Disabling this means you'll need to update manually."
          control={
            <div className="flex items-center gap-2">
              {savingAutoUpdate && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={autoUpdateState}
                onCheckedChange={(v) => void handleAutoUpdateChange(v)}
                disabled={savingAutoUpdate}
              />
            </div>
          }
        />
      </div>
    </div>
  )
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerTab(): React.JSX.Element {
  const { user, deleteAccount } = useAuthStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const expectedEmail = user?.email ?? ''
  const emailMatches = emailInput.trim().toLowerCase() === expectedEmail.toLowerCase()

  const handleDelete = async (): Promise<void> => {
    if (!emailMatches) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      // If we're still here (email/password flow), auth listener clears state + redirects
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account. Your shop will be archived for 30 days and then
              removed automatically.
              <br />
              <span className="mt-2 block font-medium text-foreground">
                Type your email address to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={expectedEmail}
              className="text-sm"
              autoComplete="off"
            />
            {deleteError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {deleteError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!emailMatches || deleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5 mr-1.5" />
                  Delete my account
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-xl border border-destructive/40 bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 border-b border-destructive/20 bg-destructive/5 px-6 py-4">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Danger Zone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actions here are permanent or have significant consequences. Proceed carefully.
            </p>
          </div>
        </div>

        <div className="divide-y divide-destructive/10">
          <SettingRow
            label="Delete Account"
            description="Permanently deletes your Firebase Auth account. Your shop data will be archived for 30 days."
            align="start"
            control={
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 className="size-3.5" />
                Delete account
              </button>
            }
          />
        </div>
      </div>
    </>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'store', label: 'Store', icon: Store },
  { value: 'account', label: 'Account', icon: User },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'display', label: 'Display', icon: MonitorSmartphone },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'system', label: 'System', icon: Power },
  { value: 'danger', label: 'Danger', icon: ShieldAlert }
]

export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="size-6" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account details and application preferences.
        </p>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="w-full h-auto flex-wrap gap-1 p-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 flex-1">
              <Icon className="size-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="store" className="mt-4">
          <StoreTab />
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <AccountTab />
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="divide-y">
              <SettingRow
                label="Theme Mode"
                description="Switch between Light, Dark, or your System default."
                control={<ThemeToggle />}
              />
              <SettingRow
                label="Color Theme"
                description="Choose a primary color personality for the app."
                align="start"
                control={<ColorThemeToggle />}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="display" className="mt-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="divide-y">
              <SettingRow
                label="Window Mode"
                description="Set how the app occupies the screen."
                control={<DisplayModeToggle />}
              />
              <SettingRow
                label="Resolution Preset"
                description="Pick a fixed resolution (Windowed mode only)."
                align="start"
                control={<ResolutionToggle />}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <SystemTab />
        </TabsContent>

        <TabsContent value="danger" className="mt-4">
          <DangerTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
