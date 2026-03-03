import React, { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/login'
import SignUp from './components/signup'
import DashboardLayout from './layouts/DashboardLayout'
import VerifyEmailPage from './pages/auth/verify-email'
import PendingApprovalPage from './pages/auth/pending-approval'
import SetupShopPage from './pages/setup-shop'
import { useAuthStore } from './store/useAuthStore'
import { AppLoader } from './components/ui/app-loader'
import LandingPage from './pages/landing'
import ChangelogPage from './pages/changelog'

// ─── Dashboard Pages ──────────────────────────────────────────────────────────
import OverviewPage from './pages/dashboard/overview'
import ProductsPage from './pages/dashboard/products'
import CategoriesPage from './pages/dashboard/categories'
import PriceListPage from './pages/dashboard/price-list'
import TransactionsPage from './pages/dashboard/transactions'
import ReportsPage from './pages/dashboard/reports'
import UsersPage from './pages/dashboard/users'
import ApprovalsPage from './pages/dashboard/approvals'
import ShopsPage from './pages/dashboard/shops'
import MessengerPage from './pages/dashboard/messenger'
import GmailPage from './pages/dashboard/gmail'
import StoragePage from './pages/dashboard/storage'
import BudgetPage from './pages/dashboard/budget'
import SettingsPage from './pages/dashboard/settings'
import HelpPage from './pages/dashboard/help'
import { DebugOverlay } from './components/debug-overlay'

function App(): React.JSX.Element {
  const { user, loading } = useAuthStore()

  // ── Loader / crossfade state (mirrors DashboardLayout pattern) ────────────
  const [loaderMounted, setLoaderMounted] = useState(true)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [contentReady, setContentReady] = useState(false)

  useEffect(() => {
    if (loading) {
      // Auth check or logout in progress — show loader
      setLoaderMounted(true)
      setLoaderVisible(true)
      setContentReady(false)
    } else {
      // Auth resolved — fade out loader, then fade in content
      setLoaderVisible(false)
      const unmount = setTimeout(() => setLoaderMounted(false), 700)
      const reveal = setTimeout(() => setContentReady(true), 500)
      return () => {
        clearTimeout(unmount)
        clearTimeout(reveal)
      }
    }
    return undefined
  }, [loading])

  return (
    <>
      {loaderMounted && <AppLoader visible={loaderVisible} label="Loading OmniShop…" />}
      <div
        style={{
          opacity: contentReady ? 1 : 0,
          transition: 'opacity 400ms ease-in-out',
          pointerEvents: contentReady ? 'auto' : 'none'
        }}
      >
        <HashRouter>
          <Routes>
            {/* ── Public pages ── */}
            <Route
              path="/"
              element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/changelog" element={<ChangelogPage />} />

            {/* ── Auth ── */}
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
            />
            <Route
              path="/signup"
              element={!user ? <SignUp /> : <Navigate to="/dashboard" replace />}
            />

            {/* ── Auth flows (post-login, pre-dashboard) — self-guarded ── */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/setup-shop" element={<SetupShopPage />} />

            {/* ── Protected Dashboard ── */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<OverviewPage />} />
              {/* Store (seller) routes */}
              <Route path="/dashboard/products" element={<ProductsPage />} />
              <Route path="/dashboard/categories" element={<CategoriesPage />} />
              <Route path="/dashboard/price-list" element={<PriceListPage />} />
              <Route path="/dashboard/transactions" element={<TransactionsPage />} />
              <Route path="/dashboard/reports" element={<ReportsPage />} />
              {/* Admin-only routes */}
              <Route path="/dashboard/shops" element={<ShopsPage />} />
              <Route path="/dashboard/users" element={<UsersPage />} />
              <Route path="/dashboard/approvals" element={<ApprovalsPage />} />
              {/* Storage & Finance */}
              <Route path="/dashboard/storage" element={<StoragePage />} />
              <Route path="/dashboard/budget" element={<BudgetPage />} />
              {/* Socials (user) */}
              <Route path="/dashboard/messenger" element={<MessengerPage />} />
              <Route path="/dashboard/gmail" element={<GmailPage />} />
              {/* System */}
              <Route path="/dashboard/settings" element={<SettingsPage />} />
              <Route path="/dashboard/help" element={<HelpPage />} />
            </Route>

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
          </Routes>
        </HashRouter>
      </div>
      <DebugOverlay />
    </>
  )
}

export default App
