/**
 * OnboardingChecklist
 *
 * Shown on the Overview page until the seller completes all setup tasks.
 * Tracks: logo uploaded, banner uploaded, at least 1 product added.
 * Dismissed by clicking "Mark as done" which sets onboardingComplete = true.
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react'
import { updateShopProfile } from '@/lib/shopService'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopStore } from '@/store/useShopStore'
import { useProductStore } from '@/store/useProductStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  label: string
  description: string
  done: boolean
  action?: { label: string; href: string }
}

export function OnboardingChecklist(): React.JSX.Element | null {
  const { user } = useAuthStore()
  const { shop } = useShopStore()
  const { products, loading: productsLoading } = useProductStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  // Don't render if onboarding already done or shop not loaded yet
  if (!shop || shop.onboardingComplete) return null

  const items: ChecklistItem[] = [
    {
      id: 'logo',
      label: 'Upload a shop logo',
      description: 'Your logo appears on receipts and your storefront.',
      done: !!shop.logoUrl,
      action: { label: 'Go to Store Settings', href: '/dashboard/settings?tab=store' }
    },
    {
      id: 'banner',
      label: 'Add a shop banner',
      description: 'A banner gives your shop a professional look.',
      done: !!shop.bannerUrl,
      action: { label: 'Go to Store Settings', href: '/dashboard/settings?tab=store' }
    },
    {
      id: 'product',
      label: 'Add your first product',
      description: 'Start building your catalog so customers can browse.',
      done: !productsLoading && products.length > 0,
      action: { label: 'Go to Products', href: '/dashboard/products' }
    }
  ]

  const doneCount = items.filter((i) => i.done).length
  const total = items.length
  const allDone = doneCount === total
  const progressPct = Math.round((doneCount / total) * 100)

  const handleDismiss = async (): Promise<void> => {
    if (!user) return
    setDismissing(true)
    try {
      await updateShopProfile(user.uid, { onboardingComplete: true })
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="w-full rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold">
              {allDone ? '🎉 Setup complete!' : 'Finish setting up your shop'}
            </p>
            <p className="text-xs text-muted-foreground">
              {doneCount} of {total} steps done
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Progress bar */}
          <div className="hidden sm:flex h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {collapsed ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-4 px-6 py-4 transition-colors',
                item.done && 'bg-muted/20'
              )}
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
              )}

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    item.done && 'line-through text-muted-foreground'
                  )}
                >
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>

              {!item.done && item.action && (
                <button
                  type="button"
                  onClick={() => navigate(item.action!.href)}
                  className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
                >
                  {item.action.label}
                  <ArrowRight className="size-3" />
                </button>
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-6 py-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              You can always come back to finish this later.
            </p>
            <Button
              size="sm"
              variant={allDone ? 'default' : 'outline'}
              disabled={dismissing}
              onClick={() => void handleDismiss()}
              className="shrink-0 text-xs"
            >
              {dismissing ? 'Saving…' : allDone ? '✓ Complete setup' : 'Dismiss'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
