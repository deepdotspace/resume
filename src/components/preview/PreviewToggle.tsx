/**
 * PreviewToggle — Glassmorphic pill tab switcher for PDF / LaTeX preview.
 */

import React from 'react'
import { FileText, Code, Pencil } from 'lucide-react'

type PreviewTab = 'pdf' | 'latex'

interface PreviewToggleProps {
  activeTab: PreviewTab
  onTabChange: (tab: PreviewTab) => void
  overrideMode?: boolean
  onToggleOverride?: () => void
}

export function PreviewToggle({
  activeTab,
  onTabChange,
  overrideMode = false,
  onToggleOverride,
}: PreviewToggleProps) {
  return (
    <div className="preview-toggle-wrapper">
      <div className="preview-toggle-pill">
        <button
          type="button"
          onClick={() => onTabChange('pdf')}
          className={`preview-toggle-tab ${activeTab === 'pdf' ? 'active' : ''}`}
        >
          <FileText className="w-3.5 h-3.5" />
          PDF
        </button>
        <button
          type="button"
          onClick={() => onTabChange('latex')}
          className={`preview-toggle-tab ${activeTab === 'latex' ? 'active' : ''}`}
        >
          <Code className="w-3.5 h-3.5" />
          LaTeX
          {overrideMode && <Pencil className="w-3 h-3 opacity-60" />}
        </button>
      </div>
      {onToggleOverride && !overrideMode && activeTab === 'latex' && (
        <button
          type="button"
          onClick={onToggleOverride}
          className="preview-toggle-edit"
          title="Edit LaTeX directly (form will become read-only)"
        >
          <Pencil className="w-3 h-3" />
          Edit LaTeX
        </button>
      )}
    </div>
  )
}
