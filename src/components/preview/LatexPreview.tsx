/**
 * LatexPreview — read-only or editable LaTeX source display.
 *
 * When editable=true, renders a textarea for direct LaTeX editing (override mode).
 */

import React, { useCallback, useEffect, useRef } from 'react'

interface LatexPreviewProps {
  content: string
  editable?: boolean
  onChange?: (value: string) => void
}

export function LatexPreview({ content, editable = false, onChange }: LatexPreviewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value)
    },
    [onChange]
  )

  // Sync external content into textarea when it changes (e.g. from storage)
  useEffect(() => {
    const el = textareaRef.current
    if (!el || !editable) return
    if (el.value !== content) {
      el.value = content
    }
  }, [content, editable])

  const editorStyles =
    'w-full h-full min-h-[200px] p-4 text-xs font-mono ' +
    'whitespace-pre-wrap break-words leading-relaxed resize-none ' +
    'border-0 outline-none focus:ring-0 ' +
    'latex-editor-light-bg latex-editor-light-text'

  if (editable) {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden latex-editor-light">
        <textarea
          ref={textareaRef}
          defaultValue={content}
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
