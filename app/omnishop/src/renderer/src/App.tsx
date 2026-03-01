import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/login'
import SignUp from './components/signup'
import DashboardLayout from './layouts/DashboardLayout'
import VerifyEmailPage from './pages/auth/verify-email'
import PendingApprovalPage from './pages/auth/pending-approval'
import SetupShopPage from './pages/setup-shop'
import { useAuthStore } from './store/useAuthStore'
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
import SettingsPage from './pages/dashboard/settings'
import HelpPage from './pages/dashboard/help'

function App(): React.JSX.Element {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <p>Loading&hellip;</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {/* ── Public pages ── */}
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/changelog" element={<ChangelogPage />} />

        {/* ── Auth ── */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/dashboard" replace />} />

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
  )
}

export default App
