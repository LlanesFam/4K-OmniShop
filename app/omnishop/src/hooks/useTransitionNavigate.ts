import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Wraps `useNavigate` with an exit-animation delay so page-leave animations
 * can finish before React unmounts the component.
 *
 * Usage:
 * ```tsx
 * const { navigateTo, exiting } = useTransitionNavigate()
 * // ...
 * <PageTransition exiting={exiting}>…</PageTransition>
 * // ...
 * <button onClick={() => navigateTo('/login')}>Go</button>
 * ```
 */
export function useTransitionNavigate(exitDurationMs = 220): {
  exiting: boolean
  navigateTo: (to: string, options?: { replace?: boolean }) => void
} {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  const navigateTo = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      setExiting(true)
      setTimeout(() => navigate(to, options ?? {}), exitDurationMs)
    },
    [navigate, exitDurationMs]
  )

  return { exiting, navigateTo }
}
