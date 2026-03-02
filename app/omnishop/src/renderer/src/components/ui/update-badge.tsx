import * as React from 'react'
import { ArrowDownToLine, Loader2, RotateCcw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useUpdaterStore } from '@/store/useUpdaterStore'

// ── Pulsing dot badge ─────────────────────────────────────────────────────────

function PulseDot({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        'absolute -right-0.5 -top-0.5 size-2.5 rounded-full',
        'bg-teal-400',
        // outer ring pulse
        'before:absolute before:inset-0 before:rounded-full before:bg-teal-400',
        'before:animate-ping before:opacity-75',
        className
      )}
    />
  )
}

// ── UpdateBadge ───────────────────────────────────────────────────────────────

export function UpdateBadge(): React.JSX.Element {
  const { status, openUpdateDialog } = useUpdaterStore()

  const isChecking = status.state === 'checking'
  const isDownloading = status.state === 'downloading'
  const isDownloaded = status.state === 'downloaded'
  const isError = status.state === 'error'
  const isActive = status.state === 'available' || isDownloading || isDownloaded

  function handleClick(): void {
    if (isDownloaded) {
      openUpdateDialog()
      return
    }
    if (isError || status.state === 'idle') {
      window.api?.checkForUpdates?.().catch(() => {})
      return
    }
  }

  function getTooltip(): string {
    switch (status.state) {
      case 'checking':
        return 'Checking for updates…'
      case 'available':
        return `Update available — v${status.version}`
      case 'downloading':
        return `Downloading v${status.version} — ${status.percent}%`
      case 'downloaded':
        return `v${status.version} ready — click to install`
      case 'error':
        return `Update error — click to retry`
      default:
        return 'Check for updates'
    }
  }

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isChecking || isDownloading}
            aria-label={getTooltip()}
            className={cn(
              'relative flex size-8 items-center justify-center rounded-md',
              'text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'disabled:pointer-events-none disabled:opacity-50',
              isError && 'text-destructive hover:text-destructive hover:bg-destructive/10',
              isActive && 'text-teal-400 hover:text-teal-400 hover:bg-teal-400/10'
            )}
          >
            {isChecking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isError ? (
              <RotateCcw className="size-4" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}

            {/* Pulsing dot — only when downloaded and ready */}
            {isDownloaded && <PulseDot />}

            {/* Spinning ring — while downloading */}
            {isDownloading && (
              <span className="absolute inset-0 rounded-md ring-2 ring-teal-400/40 animate-pulse" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{getTooltip()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
