import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { Monitor, Moon, PowerOff, Sun } from 'lucide-react'

import { type Theme, useThemeStore } from '@/store/useThemeStore'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { quitApp } from '@/lib/tauri'
import { UpdateBadge } from '@/components/ui/update-badge'
import { UpdateDialog } from '@/components/update-dialog'

// ── Route map ─────────────────────────────────────────────────────────────────
// Flat lookup: pathname → { group label | null, page title }

interface RouteInfo {
  group: string | null
  title: string
}

const ROUTE_MAP: Record<string, RouteInfo> = {
  '/dashboard': { group: null, title: 'Overview' },
  '/dashboard/products': { group: 'Store', title: 'Products' },
  '/dashboard/categories': { group: 'Store', title: 'Categories' },
  '/dashboard/price-list': { group: 'Store', title: 'Price List' },
  '/dashboard/transactions': { group: 'Sales', title: 'Transactions' },
  '/dashboard/reports': { group: 'Sales', title: 'Reports' },
  '/dashboard/users': { group: 'Admin', title: 'All Users' },
  '/dashboard/approvals': { group: 'Admin', title: 'Pending Approvals' },
  '/dashboard/messenger': { group: 'Socials', title: 'Messenger' },
  '/dashboard/gmail': { group: 'Socials', title: 'Gmail' },
  '/dashboard/settings': { group: null, title: 'Settings' },
  '/dashboard/help': { group: null, title: 'Help & Support' }
}

// ── Clock hook ────────────────────────────────────────────────────────────────

function useClock(): { date: string; time: string } {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const date = now.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  const time = now.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  return { date, time }
}

// ── Theme cycle button ────────────────────────────────────────────────────────

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']

const THEME_META: Record<Theme, { icon: React.ElementType; label: string }> = {
  light: { icon: Sun, label: 'Light' },
  dark: { icon: Moon, label: 'Dark' },
  system: { icon: Monitor, label: 'System' }
}

function ThemeCycleButton(): React.JSX.Element {
  const { theme, setTheme } = useThemeStore()
  const { icon: Icon, label } = THEME_META[theme]

  function handleCycle(): void {
    const idx = THEME_CYCLE.indexOf(theme)
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]
    setTheme(next)
  }

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCycle}
            className={cn(
              'flex size-8 items-center justify-center rounded-md text-muted-foreground',
              'transition-colors hover:bg-accent hover:text-accent-foreground'
            )}
            aria-label={`Current theme: ${label}. Click to cycle.`}
          >
            <Icon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label} theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ── DashboardHeader ───────────────────────────────────────────────────────────

export function DashboardHeader(): React.JSX.Element {
  const { pathname } = useLocation()
  const { date, time } = useClock()
  const [showQuitConfirm, setShowQuitConfirm] = React.useState(false)

  const route = ROUTE_MAP[pathname] ?? { group: null, title: 'Dashboard' }

  return (
    <>
      <header className="flex h-12 w-full shrink-0 items-center gap-2 border-b bg-muted px-4">
        {/* Sidebar toggle */}
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />

        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            {route.group && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    {/* Group label is not a navigable route — render as plain text */}
                    <span className="text-muted-foreground">{route.group}</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{route.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date & time */}
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <span>{date}</span>
          <Separator orientation="vertical" className="mx-1 h-3" />
          <span className="tabular-nums">{time}</span>
        </div>

        <Separator orientation="vertical" className="hidden h-4 sm:block" />

        {/* Quick theme cycle */}
        <ThemeCycleButton />

        <Separator orientation="vertical" className="h-4" />

        {/* Update indicator */}
        <UpdateBadge />

        <Separator orientation="vertical" className="h-4" />

        {/* Quit */}
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowQuitConfirm(true)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-md text-muted-foreground',
                  'transition-colors hover:bg-destructive/10 hover:text-destructive'
                )}
                aria-label="Quit app"
              >
                <PowerOff className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Quit OmniShop</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

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

      {/* ── Update install dialog ── */}
      <UpdateDialog />
    </>
  )
}
