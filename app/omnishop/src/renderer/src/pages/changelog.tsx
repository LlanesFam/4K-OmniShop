import React, { useState, useEffect } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { ChangelogSidebar, ChangelogCategory } from '@/components/changelog-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'

export default function ChangelogPage(): React.JSX.Element {
  // Using local state to prepare for sanity data loading
  const [categories, setCategories] = useState<ChangelogCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching Sanity data
    /*
    import { getClient } from '@/lib/sanity'
    getClient().fetch(`*[_type == "changelog"] | order(date desc) {...}`)
      .then(data => {
        const mappedCategories = mapSanityToCategories(data)
        setCategories(mappedCategories)
      })
    */

    // Mock response to mimic sanity response mappings
    setTimeout(() => {
      setCategories([
        {
          title: 'Version History',
          url: '#',
          items: [
            { title: 'v1.1.0 - Theme Polish', url: '#v1-1-0', isActive: true },
            { title: 'v1.0.0 - Initial Release', url: '#v1-0-0' }
          ]
        },
        {
          title: 'Guides',
          url: '#',
          items: [
            { title: 'Sanity CMS Setup', url: '#sanity-setup' },
            { title: 'Deployment Guide', url: '#deploy' }
          ]
        }
      ])
      setLoading(false)
    }, 500)
  }, [])

  return (
    <SidebarProvider>
      <ChangelogSidebar categories={categories.length > 0 ? categories : undefined} />
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
            <h1 className="text-4xl font-bold tracking-tight">Changelog & Documentation</h1>
            <p className="text-lg text-muted-foreground">
              Discover the latest updates, fixes, and improvements to OmniShop.
            </p>

            <div className="prose prose-invert mt-8 max-w-none w-full pb-20">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 w-1/3 bg-muted rounded"></div>
                  <div className="h-4 w-full bg-muted rounded"></div>
                  <div className="h-4 w-5/6 bg-muted rounded"></div>
                </div>
              ) : (
                <>
                  <div id="v1-1-0" className="mb-16 scroll-mt-20">
                    <h2>v1.1.0 - Theme Polish & Documentation</h2>
                    <p className="text-muted-foreground">March 2, 2026</p>
                    <ul>
                      <li>Added dedicated documentation layout with sidebar component.</li>
                      <li>Resolved ESLint and Tailwind configuration warnings.</li>
                      <li>
                        Implemented Radix Slot polymorphic <code>asChild</code> patterns for the
                        Badge component.
                      </li>
                    </ul>
                  </div>

                  <div id="v1-0-0" className="mb-16 scroll-mt-20">
                    <h2>v1.0.0 - Initial Release</h2>
                    <p className="text-muted-foreground">March 1, 2026</p>
                    <p>Initial stable release of OmniShop.</p>
                    <ul>
                      <li>Dynamic particle canvas backgrounds</li>
                      <li>Role-based Routing and Layout structure</li>
                      <li>Authentication guards (Login, Signup, Pending Approval)</li>
                      <li>Global theme switcher (Light / Dark mode support)</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
