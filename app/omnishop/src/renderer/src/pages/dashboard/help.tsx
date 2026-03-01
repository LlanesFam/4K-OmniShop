import React from 'react'
import { BookOpen, ExternalLink, HelpCircle, LifeBuoy, MessageSquare } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HelpCard {
  icon: React.ElementType
  title: string
  description: string
  action: string
  href: string
  external?: boolean
}

// ─── Config ──────────────────────────────────────────────────────────────────

const HELP_CARDS: HelpCard[] = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description:
      'Step-by-step guides for setting up your store, managing inventory, and using the POS.',
    action: 'Browse docs',
    href: '#',
    external: false
  },
  {
    icon: LifeBuoy,
    title: 'Support',
    description: 'Reach out to our support team for help with billing, bugs, or account issues.',
    action: 'Contact support',
    href: '#',
    external: true
  },
  {
    icon: MessageSquare,
    title: 'Community',
    description:
      'Join the discussion with other OmniShop users for tips, tricks, and feature ideas.',
    action: 'Join community',
    href: '#',
    external: true
  }
]

const FAQ_ITEMS = [
  {
    q: 'Does OmniShop work without internet?',
    a: 'Yes. OmniShop is offline-first. The POS and inventory management work fully offline using local Firestore cache. Data syncs automatically when you reconnect.'
  },
  {
    q: 'How do I add a new user?',
    a: 'Users register via the sign-up page. Once they verify their email, their account enters Pending Approval. An admin must then approve them from the Pending Approvals page.'
  },
  {
    q: 'Can I import products in bulk?',
    a: 'Bulk CSV import is on the roadmap. For now, products are added individually through the Products page.'
  },
  {
    q: 'How are images stored?',
    a: 'Product images are uploaded to Cloudinary with automatic optimisation (f_auto, q_auto). When offline, images are queued locally and synced on reconnect.'
  }
]

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Help & Support page — documentation links, support channels, and FAQ.
 * Long-form articles are managed via Sanity.io CMS (coming soon).
 */
export default function HelpPage(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="size-6" />
          Help &amp; Support
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Guides, FAQs, and support channels — all in one place.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        {HELP_CARDS.map(({ icon: Icon, title, description, action, href, external }) => (
          <a
            key={title}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="group flex flex-col gap-3 rounded-xl border bg-card text-card-foreground shadow-sm p-5 hover:border-primary/50 transition-colors"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
            <span className="text-xs font-medium text-primary flex items-center gap-1 mt-auto">
              {action}
              {external && <ExternalLink className="size-3" />}
            </span>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-xl border bg-card text-card-foreground shadow-sm px-5 py-4"
            >
              <p className="text-sm font-medium">{q}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
