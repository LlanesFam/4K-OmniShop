/**
 * Debug Store
 *
 * Intercepts console.log / warn / error / info and stores them in a ring
 * buffer (max 500 entries). Not persisted — ephemeral per-session.
 *
 * Usage:
 *   import { useDebugStore } from '@/store/useDebugStore'
 *   useDebugStore.getState().init()  // call once at app root
 */

import { create } from 'zustand'

export type LogLevel = 'log' | 'warn' | 'error' | 'info'

export interface LogEntry {
  id: number
  level: LogLevel
  message: string
  timestamp: Date
}

const MAX_ENTRIES = 500

let _seq = 0

// ─── Store ────────────────────────────────────────────────────────────────────

interface DebugState {
  entries: LogEntry[]
  visible: boolean
  intercepted: boolean

  init: () => void
  clear: () => void
  show: () => void
  hide: () => void
  toggle: () => void
  push: (level: LogLevel, message: string) => void
}

export const useDebugStore = create<DebugState>((set, get) => ({
  entries: [],
  visible: false,
  intercepted: false,

  push: (level, message) => {
    const entry: LogEntry = { id: _seq++, level, message, timestamp: new Date() }
    set((s) => {
      const next = [...s.entries, entry]
      return { entries: next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next }
    })
  },

  /** Intercept native console methods — idempotent (safe to call multiple times). */
  init: () => {
    if (get().intercepted) return
    const push = get().push

    const levels: LogLevel[] = ['log', 'warn', 'error', 'info']
    for (const level of levels) {
      const original = console[level].bind(console)
      console[level] = (...args: unknown[]) => {
        original(...args)
        push(
          level,
          args
            .map((a) => {
              if (typeof a === 'string') return a
              try {
                return JSON.stringify(a, null, 2)
              } catch {
                return String(a)
              }
            })
            .join(' ')
        )
      }
    }
    set({ intercepted: true })
  },

  clear: () => set({ entries: [] }),
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
  toggle: () => set((s) => ({ visible: !s.visible }))
}))
