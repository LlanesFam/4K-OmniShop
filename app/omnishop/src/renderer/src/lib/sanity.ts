/**
 * Sanity Client
 *
 * Used to query public content (changelog, guides) from the Sanity CDN.
 * No auth token required — the dataset is public read.
 */

import { createClient } from '@sanity/client'
import type { PortableTextBlock } from '@portabletext/react'

export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID as string,
  dataset: import.meta.env.VITE_SANITY_DATASET as string,
  apiVersion: '2024-01-01',
  useCdn: true
})

// ─── Changelog types ──────────────────────────────────────────────────────────

export interface ChangelogDoc {
  _id: string
  version: string
  title: string
  publishedAt: string // ISO date string "YYYY-MM-DD"
  summary: string
  tags: string[]
  notes: PortableTextBlock[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const CHANGELOG_QUERY = `
  *[_type == "changelog"] | order(publishedAt desc) {
    _id,
    version,
    title,
    publishedAt,
    summary,
    tags,
    notes
  }
`

export async function fetchChangelogs(): Promise<ChangelogDoc[]> {
  return sanityClient.fetch<ChangelogDoc[]>(CHANGELOG_QUERY)
}
