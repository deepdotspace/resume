/**
 * LatexPreview — read-only or editable LaTeX source display.
 *
 * When `editable`, the textarea is fully controlled by `content`/`onChange`.
 * Read-only mode renders a `<pre>` so the source is still selectable.
 */

import React, { useCallback } from 'react'

interface LatexPreviewProps {
  content: string
  editable?: boolean
  onChange?: (value: string) => void
}

export function LatexPreview({ content, editable = false, onChange }: LatexPreviewProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value)
    },
    [onChange]
  )

  const editorStyles =
    'w-full h-full min-h-[200px] p-4 text-xs font-mono ' +
    'whitespace-pre-wrap break-words leading-relaxed resize-none ' +
    'border-0 outline-none focus:ring-0 ' +
    'latex-editor-light-bg latex-editor-light-text'

  if (editable) {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden latex-editor-light">
        <textarea
          // Controlled input — the parent owns the string, and the debounce
          // that persists to storage lives there. Being controlled means the
          // user's caret and selection aren't clobbered when a new content
          // value arrives (e.g. a fresh compile or an agent-driven update).
          value={content}
          onChange={handleChange}
          className={editorStyles}
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}
          placeholder="% Edit LaTeX directly. Changes will not sync to form fields."
          spellCheck={false}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto latex-editor-light">
      <pre
        className="block p-4 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed latex-editor-light-bg latex-editor-light-text"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}
      >
        {content || '% Add content and compile to see generated LaTeX'}
      </pre>
    </div>
  )
}
