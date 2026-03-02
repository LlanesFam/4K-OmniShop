import * as React from 'react'

// ── Minimal GitHub-flavoured markdown renderer ────────────────────────────────
// Handles the patterns typically found in GitHub Release notes:
//   ## Heading 2 / ### Heading 3
//   **bold** / *italic*
//   - bullet / * bullet
//   `inline code`
//   blank lines → paragraph break

interface Props {
  markdown: string
}

export function ReleaseNotes({ markdown }: Props): React.JSX.Element {
  const nodes = React.useMemo(() => parseMarkdown(markdown), [markdown])
  return <div className="space-y-2 text-sm text-foreground/90">{nodes}</div>
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n')
  const result: React.ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  function flushList(): void {
    if (listItems.length === 0) return
    result.push(
      <ul key={key++} className="ml-4 list-disc space-y-0.5 text-muted-foreground">
        {listItems.map((item, i) => (
          <li key={i}>{inlineFormat(item)}</li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Heading 1
    if (/^# /.test(line)) {
      flushList()
      result.push(
        <h2 key={key++} className="text-base font-bold">
          {line.slice(2)}
        </h2>
      )
      continue
    }

    // Heading 2
    if (/^## /.test(line)) {
      flushList()
      result.push(
        <h3 key={key++} className="text-sm font-semibold text-foreground">
          {line.slice(3)}
        </h3>
      )
      continue
    }

    // Heading 3
    if (/^### /.test(line)) {
      flushList()
      result.push(
        <h4
          key={key++}
          className="text-xs font-semibold uppercase tracking-wide text-foreground/60"
        >
          {line.slice(4)}
        </h4>
      )
      continue
    }

    // Bullet list item
    if (/^[-*+] /.test(line)) {
      listItems.push(line.slice(2))
      continue
    }

    // Blank line
    if (line.trim() === '') {
      flushList()
      continue
    }

    // Regular paragraph
    flushList()
    result.push(
      <p key={key++} className="text-muted-foreground leading-relaxed">
        {inlineFormat(line)}
      </p>
    )
  }

  flushList()
  return result
}

// ── Inline formatting (bold, italic, inline code) ─────────────────────────────

function inlineFormat(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  if (parts.length === 1) return text

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
