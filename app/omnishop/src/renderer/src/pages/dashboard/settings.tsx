import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Monitor,
  Moon,
  Settings,
  Sun,
  Maximize2,
  AppWindow,
  Loader2,
  User,
  Palette,
  MonitorSmartphone,
  Bell,
  Camera,
  ShieldAlert,
  Cpu
} from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { type Theme, type ColorTheme, useThemeStore } from '@/store/useThemeStore'
import { type DisplayMode, type Resolution, useDisplayStore } from '@/store/useDisplayStore'
import { uploadImage } from '@/lib/cloudinaryService'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  const [displays, setDisplays] = useState<Electron.Display[]>([])
  const [currentDisplayId, setCurrentDisplayId] = useState<number | undefined>(undefined)

  const prevModeRef = useRef<DisplayMode>(mode)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Load displays on mount
    window.api.getDisplays().then((all) => {
      setDisplays(all)
      // Heuristic: assume window is on primary or first display initially if unknown
      // Ideally main process tells us which display we are on, but for now we let user pick.
    })
  }, [])

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

  const handleDisplaySelect = (displayId: number): void => {
    setCurrentDisplayId(displayId)
    window.api.setWindowDisplay(displayId)
    // If not already fullscreen, switch to it? Or just let user decide.
    // Usually people pick a screen for fullscreen.
    if (mode !== 'fullscreen') {
      handleModeClick('fullscreen')
    }
  }

  // Clean up interval on unmount
  useEffect(() => () => stopTick(), [stopTick])

  return (
    <div className="space-y-4">
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

      {mode === 'fullscreen' && displays.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Select Display</span>
          <div className="flex flex-wrap gap-2">
            {displays.map((display, index) => (
              <button
                key={display.id}
                onClick={() => handleDisplaySelect(display.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-md border px-4 py-2 text-xs transition-colors',
                  currentDisplayId === display.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <Monitor className="size-4" />
                <span>Display {index + 1}</span>
                <span className="text-[10px] text-muted-foreground">
                  {display.bounds.width}x{display.bounds.height}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
    </div>
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

// ─── Page ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'display', label: 'Display', icon: MonitorSmartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System', icon: Cpu },
  { id: 'danger', label: 'Danger Zone', icon: ShieldAlert }
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function SettingsPage(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId>('account')

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="size-6" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account details and application preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Sidebar Nav */}
        <nav className="flex flex-row md:flex-col gap-1 w-full md:w-[220px] shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                activeSection === id
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Right Panel Content */}
        <div className="flex-1 w-full max-w-2xl">
          {activeSection === 'account' && <AccountTab />}

          {activeSection === 'appearance' && (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
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
          )}

          {activeSection === 'display' && (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
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
          )}

          {activeSection === 'notifications' && (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="divide-y">
                <SettingRow
                  label="Desktop Notifications"
                  description="Show system notifications for new orders and approvals."
                  control={
                    <Badge variant="outline" className="font-medium text-muted-foreground">
                      Coming soon
                    </Badge>
                  }
                />
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="divide-y">
                <SettingRow
                  label="Auto Start"
                  description="Launch OmniShop automatically when you turn on your computer."
                  control={
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        Coming soon
                      </Badge>
                      <div className="size-5 rounded-full border bg-muted" />
                    </div>
                  }
                />
                <SettingRow
                  label="Auto Update"
                  description="Keep OmniShop updated with the latest features and security fixes."
                  control={
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        Coming soon
                      </Badge>
                      <div className="size-5 rounded-full border bg-muted" />
                    </div>
                  }
                />
              </div>
            </div>
          )}

          {activeSection === 'danger' && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 text-card-foreground shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="size-5" />
                  <h3 className="text-sm font-semibold">Danger Zone</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Irreversible actions. Please proceed with caution.
                </p>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-background/50 p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently remove your account and all associated data.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" className="h-8 text-xs font-semibold">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
