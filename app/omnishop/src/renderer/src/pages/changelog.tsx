import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { ChangelogSidebar, type ChangelogCategory } from '@/components/changelog-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchChangelogs, type ChangelogDoc } from '@/lib/payload'
import { cn } from '@/lib/utils'

// ─── Tag badge ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  feature: 'bg-blue-500/15 text-blue-400',
  bugfix: 'bg-green-500/15 text-green-400',
  improvement: 'bg-purple-500/15 text-purple-400',
  internal: 'bg-muted text-muted-foreground'
}

function TagBadge({ tag }: { tag: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        'rounded px-2 py-0.5 text-xs font-medium capitalize',
        TAG_STYLES[tag] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {tag}
    </span>
  )
}

// ─── Markdown Components ──────────────────────────────────────────────────

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  h2: ({ children }) => <h2 className="mt-6 mb-2 text-xl font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 mb-1.5 text-base font-semibold">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground mb-3">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>
  ),
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>
}

// ─── Anchor id helper ─────────────────────────────────────────────────────────

function versionAnchor(version: string): string {
  return `v${version.replace(/\./g, '-')}`
}

export default function ChangelogPage(): React.JSX.Element {
  const [entries, setEntries] = useState<ChangelogDoc[]>([])
  const [categories, setCategories] = useState<ChangelogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChangelogs()
      .then((docs) => {
        setEntries(docs)
        setCategories([
          {
            title: 'Version History',
            url: '#',
            items: docs.map((d, i) => ({
              title: `v${d.version} — ${d.title}`,
              url: `#${versionAnchor(d.version)}`,
              isActive: i === 0
            }))
          }
        ])
      })
      .catch((err) => {
        console.error('[Changelog] Payload fetch failed', err)
        setError('Could not load changelog. Check your connection.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <SidebarProvider>
      <ChangelogSidebar
        categories={categories.length > 0 ? categories : undefined}
        latestVersion={entries[0]?.version}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Changelog</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
            <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
            <p className="text-lg text-muted-foreground">
              Latest updates, fixes, and improvements to OmniShop.
            </p>

            <div className="mt-4 w-full pb-20 space-y-16">
              {loading ? (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-8 w-48 rounded" />
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-5/6 rounded" />
                      <Skeleton className="h-4 w-4/6 rounded" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries published yet.</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    id={versionAnchor(entry.version)}
                    className="scroll-mt-20 border-b pb-12 last:border-0"
                  >
                    {/* Version header */}
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold">
                        v{entry.version}
                        {entry.title && (
                          <span className="ml-2 text-muted-foreground font-normal text-lg">
                            — {entry.title}
                          </span>
                        )}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.date
                          ? new Date(entry.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <TagBadge tag={entry.type} />
                      </div>
                    </div>

                    {/* Rich-text notes */}
                    {entry.content ? (
                      <div className="text-sm">
                        <ReactMarkdown components={markdownComponents}>
                          {entry.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No notes provided.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
