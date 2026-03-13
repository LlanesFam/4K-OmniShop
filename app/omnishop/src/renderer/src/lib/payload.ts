// src/renderer/src/lib/payload.ts

const API_URL = 'http://localhost:3000/api' // Assuming your Payload CMS runs on port 3000

// ─── Types ────────────────────────────────────────────────────────────────────
// These should ideally be generated from your Payload types for full type-safety

export interface ChangelogDoc {
  id: string
  version: string
  date: string
  title: string
  type: 'feature' | 'bugfix' | 'improvement'
  content: string // Markdown content
  createdAt: string
  updatedAt: string
}

export interface HelpPageDoc {
  id: string
  title: string
  description?: string
  cards: {
    id: string
    title: string
    description: string
    action: string
    url: string
    iconName: 'BookOpen' | 'LifeBuoy' | 'MessageSquare' | 'ExternalLink' | 'HelpCircle'
    external?: boolean
  }[]
  createdAt: string
  updatedAt: string
}

export interface FaqDoc {
  id: string
  question: string
  answer: string
  createdAt: string
  updatedAt: string
}

// ─── Fetcher function ─────────────────────────────────────────────────────────

async function fetchFromPayload<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_URL}/${endpoint}`)
    if (!response.ok) {
      throw new Error(`Payload API error: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    return data.docs as T
  } catch (error) {
    console.error(`[Payload] Fetch failed for endpoint "${endpoint}":`, error)
    throw error
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchChangelogs(): Promise<ChangelogDoc[]> {
  // Assuming 'changelog' is the slug, fetching sorted by date descending
  return fetchFromPayload<ChangelogDoc[]>('changelog?sort=-date')
}

export async function fetchHelpPage(): Promise<HelpPageDoc | null> {
  // Help pages are often singletons, fetching the first one found.
  const helpPages = await fetchFromPayload<HelpPageDoc[]>('helpPage?limit=1')
  return helpPages?.[0] || null
}

export async function fetchFaqs(): Promise<FaqDoc[]> {
  return fetchFromPayload<FaqDoc[]>('faq')
}
