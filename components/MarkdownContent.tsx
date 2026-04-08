interface Props {
  body: string
  className?: string
}

export function MarkdownContent({ body, className = '' }: Props) {
  // Render simple markdown: paragraphs, bold, italic, headings, lists
  const lines = body.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let key = 0

  function flushList() {
    if (listItems.length === 0) return
    if (listType === 'ul') {
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-gray-700">{renderInline(item)}</li>
          ))}
        </ul>
      )
    } else {
      elements.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-gray-700">{renderInline(item)}</li>
          ))}
        </ol>
      )
    }
    listItems = []
    listType = null
  }

  function renderInline(text: string): React.ReactNode {
    // Bold: **text**
    // Italic: *text* or _text_
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={i}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(<h2 key={key++} className="text-xl font-bold text-gray-900 mb-2 mt-4">{trimmed.slice(2)}</h2>)
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={key++} className="text-lg font-semibold text-gray-900 mb-2 mt-3">{trimmed.slice(3)}</h3>)
    } else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(<h4 key={key++} className="text-base font-semibold text-gray-800 mb-1 mt-2">{trimmed.slice(4)}</h4>)
    } else if (/^[-*] /.test(trimmed)) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(trimmed.slice(2))
    } else if (/^\d+\. /.test(trimmed)) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(trimmed.replace(/^\d+\. /, ''))
    } else if (trimmed === '') {
      flushList()
      elements.push(<div key={key++} className="mb-2" />)
    } else {
      flushList()
      elements.push(
        <p key={key++} className="text-sm text-gray-700 leading-relaxed mb-3">
          {renderInline(trimmed)}
        </p>
      )
    }
  }
  flushList()

  return (
    <div className={`prose-sm max-w-none ${className}`}>
      {elements}
    </div>
  )
}
