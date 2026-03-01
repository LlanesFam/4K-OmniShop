import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

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

  const isAdmin = profile?.role === 'admin'

  // Start shop subscription once we know the user is approved
  useEffect(() => {
    if (!user || !profile || profile.status !== 'approved') return
    subscribeShop(user.uid)
    return () => clearShop()
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

  if (isLoadingAny) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading&hellip;
      </div>
    )
  }

  // Redirect is in progress; render nothing to avoid flash.
  if (!user || !profile || profile.status !== 'approved') {
    return null
  }
  if (!isAdmin && !shop) {
    return null
  }

  return (
    <SidebarProvider className="h-screen w-screen overflow-hidden">
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
  )
}
