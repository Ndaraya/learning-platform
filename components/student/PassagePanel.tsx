'use client'

import React from 'react'

interface PassagePanelProps {
  title: string
  body: string
}

/**
 * Renders a reading passage in the left panel of the split-screen layout.
 * Handles the HTML tags emitted by import_questions.py:
 *   <u>...</u>   — ACT underline convention (words being tested)
 *   <table>...</table> — converted from markdown tables during import
 *   \n\n         — paragraph breaks
 */
function PassageBody({ text }: { text: string }) {
  // Split into paragraphs on double newlines
  const paragraphs = text.split(/\n\n+/)

  return (
    <>
      {paragraphs.map((para, pi) => {
        // Render ## or ### lines as section headings (e.g. "## PASSAGE A: Title")
        const headingMatch = para.match(/^#{2,3}\s+(.+)/)
        if (headingMatch) {
          return (
            <h3 key={pi} className="font-semibold text-gray-900 text-sm mt-6 mb-2 border-b border-gray-200 pb-1">
              {headingMatch[1]}
            </h3>
          )
        }
        return (
          <p key={pi} className="mb-4 last:mb-0" style={{ whiteSpace: 'pre-line' }}>
            <InlineContent text={para} />
          </p>
        )
      })}
    </>
  )
}

/**
 * Parse a single paragraph's inline content, handling <u>, <b>, <strong>,
 * and <table> tags emitted by the import script.
 */
function InlineContent({ text }: { text: string }) {
  // Handle block-level <table> — render as its own element
  if (text.includes('<table>')) {
    const parts = text.split(/(<table>[\s\S]*?<\/table>)/)
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('<table>')) {
            return <HtmlTable key={i} html={part} />
          }
          return <InlineTags key={i} text={part} />
        })}
      </>
    )
  }

  return <InlineTags text={text} />
}

/** Renders <u> and <b>/<strong> inline tags as React elements */
function InlineTags({ text }: { text: string }) {
  const parts = text.split(/(<u>[\s\S]*?<\/u>|<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>)/)
  return (
    <>
      {parts.map((part, i) => {
        if (/^<u>([\s\S]*?)<\/u>$/.test(part)) {
          return <u key={i}>{part.replace(/<\/?u>/g, '')}</u>
        }
        if (/^<(b|strong)>([\s\S]*?)<\/(b|strong)>$/.test(part)) {
          return <strong key={i}>{part.replace(/<\/?(b|strong)>/g, '')}</strong>
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}

/** Converts an HTML <table> string to a styled React table */
function HtmlTable({ html }: { html: string }) {
  const rows: { cells: string[]; isHeader: boolean }[] = []
  const trPattern = /<tr>([\s\S]*?)<\/tr>/g
  let trMatch
  while ((trMatch = trPattern.exec(html)) !== null) {
    const rowHtml = trMatch[1]
    const isHeader = rowHtml.includes('<th>')
    const cellPattern = /<t[hd]>([\s\S]*?)<\/t[hd]>/g
    const cells: string[] = []
    let cellMatch
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1])
    }
    rows.push({ cells, isHeader })
  }

  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map((row, ri) =>
            row.isHeader ? (
              <tr key={ri} className="bg-gray-100">
                {row.cells.map((cell, ci) => (
                  <th key={ci} className="border border-gray-300 px-2 py-1 font-semibold text-left">
                    {cell}
                  </th>
                ))}
              </tr>
            ) : (
              <tr key={ri} className="even:bg-gray-50">
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="border border-gray-300 px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

export function PassagePanel({ title, body }: PassagePanelProps) {
  return (
    <div className="h-full overflow-y-auto border-r border-gray-200 bg-gray-50 px-8 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Passage
      </p>
      <h2 className="font-semibold text-base text-gray-900 mb-5">{title}</h2>
      <div className="text-sm leading-7 text-gray-800">
        <PassageBody text={body} />
      </div>
    </div>
  )
}
