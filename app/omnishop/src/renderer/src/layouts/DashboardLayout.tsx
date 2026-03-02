import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useProductStore } from '@/store/useProductStore'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppLoader } from '@/components/ui/app-loader'
import { WhatsNewDialog } from '@/components/whats-new-dialog'
import { useUpdater } from '@/hooks/useUpdater'

/**
 * Protected layout wrapping all Dashboard-mode routes.
 *
 * Guards (in priority order):
 * 1. No user → /login
 * 2. Password-provider user without verified email → /verify-email
 * 3. Profile not yet approved → /pending-approval
 *
 * Waits for both auth loading AND profile loading to finish before
 * making any redirect decision to avoid false redirects on first render.
 */
export default function DashboardLayout(): React.JSX.Element | null {
  const { user, loading, profile, profileLoading } = useAuthStore()
  const { shop, shopLoading, subscribeShop, clearShop } = useShopStore()
  const navigate = useNavigate()
  const [contentReady, setContentReady] = React.useState(false)

  const isAdmin = profile?.role === 'admin'

  // Register updater IPC listeners + trigger auto-check
  useUpdater()

  const categoryStore = useCategoryStore()
  const productStore = useProductStore()

  // Start shop + catalog subscriptions once we know the user is approved
  useEffect(() => {
    if (!user || !profile || profile.status !== 'approved') return
    subscribeShop(user.uid)
    categoryStore.subscribe(user.uid)
    productStore.subscribe(user.uid)
    return () => {
      clearShop()
      categoryStore.unsubscribe()
      productStore.unsubscribe()
    }
  }, [user?.uid, profile?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Wait for both loading states to settle
    if (loading || profileLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    // Only enforce email verification for email/password sign-ins.
    // Google and other providers are verified by the provider itself.
    const isPasswordProvider = user.providerData.some((p) => p.providerId === 'password')
    if (isPasswordProvider && !user.emailVerified) {
      navigate('/verify-email', { replace: true })
      return
    }

    if (!profile || profile.status !== 'approved') {
      navigate('/pending-approval', { replace: true })
      return
    }

    // Non-admin users must complete shop setup before accessing the dashboard
    if (!isAdmin && !shopLoading && !shop) {
      navigate('/setup-shop', { replace: true })
    }
  }, [user, loading, profile, profileLoading, isAdmin, shop, shopLoading, navigate])

  const isLoadingAny = loading || profileLoading || (!isAdmin && shopLoading)

  // Trigger content fade-in once loading finishes.
  // Delay 500ms so the content starts appearing as the loader is finishing
  // its 600ms fade — smooth crossfade instead of a hard cut.
  React.useEffect(() => {
    if (!isLoadingAny) {
      const t = setTimeout(() => setContentReady(true), 500)
      return () => clearTimeout(t)
    }
    setContentReady(false)
    return undefined
  }, [isLoadingAny])

  // Redirect is in progress; render nothing to avoid flash.
  if (!isLoadingAny && (!user || !profile || profile.status !== 'approved')) {
    return null
  }
  if (!isLoadingAny && !isAdmin && !shop) {
    return null
  }

  return (
    <>
      {/* Animated loader overlays until data is ready */}
      <AppLoader visible={isLoadingAny} label="Loading your shop…" />

      {/* Post-update What's New dialog — shown once after a successful update */}
      <WhatsNewDialog />

      <SidebarProvider
        className="h-screen w-screen overflow-hidden"
        style={{
          opacity: contentReady ? 1 : 0,
          transition: 'opacity 400ms ease-in-out'
        }}
      >
        {/* ── Collapsible Sidebar ── */}
        <AppSidebar isAdmin={profile?.role === 'admin'} />

        {/* ── Main content inset: fills remaining width, scrollable ── */}
        <SidebarInset className="flex h-screen flex-col overflow-hidden">
          <DashboardHeader />

          {/* ── Scrollable page content ── */}
          <div className="h-screen w-full flex-1 overflow-y-auto p-10">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
