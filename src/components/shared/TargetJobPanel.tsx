/**
 * TargetJobPanel — Collapsible job description input for per-section tailoring.
 *
 * When set, sections show "Tailor to job description" buttons.
 */

import React, { useState, useCallback } from 'react'
import { Target, ChevronDown } from 'lucide-react'

interface TargetJobPanelProps {
  jobDescription: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export default function TargetJobPanel({
  jobDescription,
  onChange,
  readOnly,
}: TargetJobPanelProps) {
  const [expanded, setExpanded] = useState(!!jobDescription.trim())

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <div className="target-job-panel mb-4 rounded-lg border border-border bg-surface-elevated overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="target-job-toggle w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-inset transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-content">
          <Target className="w-4 h-4 text-accent" />
          Target Job Description
          {jobDescription.trim() && (
            <span className="text-xs font-normal text-content-tertiary">
              — set for tailoring
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-content-tertiary transition-transform ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-2">
          <textarea
            value={jobDescription}
            onChange={handleChange}
            placeholder="Paste the job description here. Sections will show 'Tailor to job description' buttons when set."
            rows={5}
            readOnly={readOnly}
            className="target-job-textarea w-full px-2.5 py-2 text-sm rounded-lg border border-border bg-surface-inset text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y min-h-[100px]"
          />
        </div>
      )}
    </div>
  )
}
