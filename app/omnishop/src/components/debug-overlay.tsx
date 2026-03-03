/**
 * Debug Overlay
 *
 * Toggled by Ctrl+Alt+F12.
 * Shows a floating panel with intercepted console logs.
 * Also provides a button to open the native DevTools window.
 *
 * Mount this once at the App root (outside any route context).
 */

import React, { useEffect, useRef } from 'react'
import { X, Trash2, Monitor, ChevronDown } from 'lucide-react'
import { useDebugStore, type LogEntry, type LogLevel } from '@/store/useDebugStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { openDevTools } from '@/lib/tauri'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<LogLevel, string> = {
  log: 'text-foreground',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400'
}

const LEVEL_PREFIX: Record<LogLevel, string> = {
  log: 'LOG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR'
}

function LogRow({ entry }: { entry: LogEntry }): React.JSX.Element {
  const time = entry.timestamp.toTimeString().slice(0, 8)
  return (
    <div
      className={cn(
        'flex gap-2 py-0.5 font-mono text-xs leading-relaxed',
        LEVEL_STYLES[entry.level]
      )}
    >
      <span className="shrink-0 text-muted-foreground/60 select-none">{time}</span>
      <span className={cn('shrink-0 font-bold select-none', LEVEL_STYLES[entry.level])}>
        [{LEVEL_PREFIX[entry.level]}]
      </span>
      <span className="break-all whitespace-pre-wrap">{entry.message}</span>
    </div>
  )
}

// ─── Overlay Component ────────────────────────────────────────────────────────

export function DebugOverlay(): React.JSX.Element | null {
  const { visible, entries, hide, clear, init } = useDebugStore()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [filter, setFilter] = React.useState<LogLevel | 'all'>('all')

  // Intercept console methods once on mount
  useEffect(() => {
    init()
  }, [init])

  // Keyboard shortcut: Ctrl+Alt+F12
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.altKey && e.key === 'F12') {
        useDebugStore.getState().toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (visible) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries.length, visible])

  if (!visible) return null

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.level === filter)

  const handleOpenDevTools = (): void => {
    openDevTools().catch(console.error)
  }

  const levels: (LogLevel | 'all')[] = ['all', 'log', 'info', 'warn', 'error']

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col border-t bg-background/95 backdrop-blur shadow-2xl"
      style={{ height: '38vh', minHeight: 220, maxHeight: 500 }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/40 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground tracking-wide select-none">
          DEBUG CONSOLE
        </span>

        {/* Level filters */}
        <div className="flex items-center gap-0.5 ml-2">
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                filter === l
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {l === 'all' ? 'All' : LEVEL_PREFIX[l as LogLevel]}
            </button>
          ))}
        </div>

        <span className="ml-1 text-xs text-muted-foreground/60">({filtered.length})</span>

        <div className="flex-1" />

        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1.5"
          onClick={handleOpenDevTools}
        >
          <Monitor className="size-3.5" />
          DevTools
        </Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={clear} title="Clear logs">
          <Trash2 className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={hide}
          title="Close (Ctrl+Alt+F12)"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 text-xs select-none">
            <ChevronDown className="size-6 mb-1 opacity-40" />
            No logs captured yet.
          </div>
        ) : (
          <>
            {filtered.map((e) => (
              <LogRow key={e.id} entry={e} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}
