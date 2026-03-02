import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  /** Page content */
  children: React.ReactNode
  /**
   * Pass `true` while the page is navigating away to play the leave animation
   * before React unmounts the component.
   * Pair with `useTransitionNavigate` for automatic timing.
   */
  exiting?: boolean
  className?: string
}

/**
 * Wraps a full page with:
 * - **Enter**: fade-in + slide-up (plays once on mount via Tailwind `animate-in`)
 * - **Exit**: fade-out + slide-down (plays when `exiting` prop is `true`)
 *
 * @example
 * ```tsx
 * const { navigateTo, exiting } = useTransitionNavigate()
 * return (
 *   <PageTransition exiting={exiting}>
 *     <button onClick={() => navigateTo('/login')}>Get Started</button>
 *   </PageTransition>
 * )
 * ```
 */
export function PageTransition({
  children,
  exiting = false,
  className
}: PageTransitionProps): React.JSX.Element {
  return (
    <div
      className={cn(
        // ── Enter animation (plays once on mount) ──────────────────────────
        'animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-out',
        // ── Exit animation (triggered by exiting prop) ─────────────────────
        exiting &&
          'opacity-0 translate-y-3 pointer-events-none transition-all duration-[220ms] ease-in',
        className
      )}
    >
      {children}
    </div>
  )
}
