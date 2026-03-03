import * as React from 'react'

// ── GitHub Release Notes renderer ─────────────────────────────────────────────
// GitHub's electron-updater returns release notes as HTML (API converts Markdown
// to HTML). We detect the format and handle both cases:
//   • HTML  → dangerouslySetInnerHTML (safe: content comes only from our own releases)
//   • Markdown → lightweight line-by-line parser

interface Props {
  markdown: string
}

function isHtml(input: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(input.trimStart())
}

export function ReleaseNotes({ markdown }: Props): React.JSX.Element {
  if (isHtml(markdown)) {
    return (
      <div
        className="space-y-1.5 text-sm text-foreground/90
          [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground
          [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-2
          [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-foreground/60
          [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-0.5
          [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-0.5
          [&_li]:text-muted-foreground
          [&_p]:text-muted-foreground [&_p]:leading-relaxed
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground
          [&_a]:text-teal-400 [&_a]:underline-offset-2 [&_a]:hover:underline"
        dangerouslySetInnerHTML={{ __html: markdown }}
      />
    )
  }

  const nodes = parseMarkdown(markdown)
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
