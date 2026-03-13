import React, { useEffect, useState } from 'react'
import {
  BookOpen,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  LucideIcon
} from 'lucide-react'
import { fetchHelpPage, fetchFaqs, type HelpPageDoc, type FaqDoc } from '@/lib/payload'

// ─── Config ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  LifeBuoy,
  MessageSquare,
  ExternalLink,
  HelpCircle
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Help & Support page — documentation links, support channels, and FAQ.
 * Content is managed via Payload CMS.
 */
export default function HelpPage(): React.JSX.Element {
  const [helpPage, setHelpPage] = useState<HelpPageDoc | null>(null)
  const [faqs, setFaqs] = useState<FaqDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [pageData, faqsData] = await Promise.all([fetchHelpPage(), fetchFaqs()])
        setHelpPage(pageData)
        setFaqs(faqsData)
      } catch (err) {
        console.error('Failed to load Help data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading help content...</p>
      </div>
    )
  }

  const title = helpPage?.title || 'Help & Support'
  const description =
    helpPage?.description || 'Guides, FAQs, and support channels — all in one place.'
  const cards = helpPage?.cards || []

  return (
    <div className="w-full flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="size-6" />
          {title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>

      {/* Quick links */}
      {cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map(({ title, description, action, url, iconName, external }, i) => {
            const Icon = ICON_MAP[iconName] || HelpCircle
            return (
              <a
                key={i}
                href={url || '#'}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="group flex flex-col gap-3 rounded-xl border bg-card text-card-foreground shadow-sm p-5 hover:border-primary/50 transition-colors"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {description}
                  </p>
                </div>
                <span className="text-xs font-medium text-primary flex items-center gap-1 mt-auto">
                  {action}
                  {external && <ExternalLink className="size-3" />}
                </span>
              </a>
            )
          })}
        </div>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {faqs.map(({ id, question, answer }) => (
              <div
                key={id}
                className="rounded-xl border bg-card text-card-foreground shadow-sm px-5 py-4"
              >
                <p className="text-sm font-medium">{question}</p>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
