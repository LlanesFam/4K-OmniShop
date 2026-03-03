import { useState, useEffect } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * A lightweight Google endpoint that always returns HTTP 204 with no body.
 * It is the most reliable probe target because it has no CORS restrictions,
 * returns instantly, and requires no data transfer.
 */
const PROBE_URL = 'https://www.gstatic.com/generate_204'

/** How often to actively probe for internet connectivity (ms). */
const PROBE_INTERVAL_MS = 15_000

/** Abort the fetch after this many ms to avoid hanging indefinitely. */
const PROBE_TIMEOUT_MS = 3_000

// ─── Probe ───────────────────────────────────────────────────────────────────

/**
 * Sends a single lightweight HEAD request to gstatic.
 * Returns `true` if the response arrives within the timeout, `false` otherwise.
 *
 * This is more accurate than `navigator.onLine` which only reflects whether the
 * network interface is up (WiFi/ethernet connected), NOT whether packets can
 * actually reach the internet.
 */
async function probeInternet(): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    // mode: 'no-cors' bypasses CORS enforcement — the response is opaque (status 0)
    // but fetch *resolves* when internet is reachable and *throws* only on a real
    // network failure (DNS error, timeout, unreachable host).
    // Without this, Chromium rejects every request to gstatic.com with a CORS
    // error because the server doesn't return Access-Control-Allow-Origin,
    // causing the catch block to always return false (always "offline").
    await fetch(PROBE_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    })
    return true // resolved = internet reachable
  } catch {
    return false // threw = network failure or timeout
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns `true` when the device has verified internet connectivity and
 * `false` when the probe fails or the interface is down.
 *
 * Uses an active HTTP probe every {@link PROBE_INTERVAL_MS} ms rather than
 * relying on `navigator.onLine` / browser `online`/`offline` events, which only
 * detect interface-level changes and remain `true` when an internet gateway
 * blocks traffic (e.g. behind a captive portal, or ISP outage).
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    let cancelled = false

    // Inline probe so the linter can confirm setState is called asynchronously.
    const probe = (): void => {
      probeInternet().then((online) => {
        if (!cancelled) setIsOnline(online)
      })
    }

    // Probe immediately on mount
    probe()

    // Periodic probe
    const interval = setInterval(probe, PROBE_INTERVAL_MS)

    // Native events: offline is instant, online triggers a real probe first
    const handleOnline = (): void => probe()
    const handleOffline = (): void => {
      if (!cancelled) setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
