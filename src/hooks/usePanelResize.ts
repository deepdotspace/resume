/**
 * usePanelResize — two-panel resize for form (left) and preview (right).
 *
 * Stores editor ratio in localStorage.
 */

import { useState, useCallback, useRef } from 'react'

const EDITOR_RATIO_MIN = 0.3
const EDITOR_RATIO_MAX = 0.7
const EDITOR_RATIO_DEFAULT = 0.45

const STORAGE_KEY = 'resume-builder-panel-sizes'

function loadRatio(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const r = parsed?.editorRatio ?? EDITOR_RATIO_DEFAULT
      return Math.max(EDITOR_RATIO_MIN, Math.min(EDITOR_RATIO_MAX, r))
    }
  } catch { /* ignore */ }
  return EDITOR_RATIO_DEFAULT
}

function saveRatio(ratio: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ editorRatio: ratio }))
  } catch { /* ignore */ }
}

export function usePanelResize() {
  const [editorRatio, setEditorRatio] = useState(loadRatio)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleEditorResize = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dividerWidth = 6
    const availableWidth = rect.width - dividerWidth * 2
    const relativeX = clientX - rect.left - dividerWidth

    const ratio = Math.max(EDITOR_RATIO_MIN, Math.min(EDITOR_RATIO_MAX, relativeX / availableWidth))

    setEditorRatio(prev => {
      saveRatio(ratio)
      return ratio
    })
  }, [])

  return {
    editorRatio,
    containerRef,
    handleEditorResize,
  }
}
