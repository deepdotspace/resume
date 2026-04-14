/**
 * SectionAccordion — collapsible section wrapper for form sections.
 */

import React from 'react'
import { ChevronDown } from 'lucide-react'

interface SectionAccordionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  count?: number
  required?: boolean
}

export function SectionAccordion({
  title,
  isOpen,
  onToggle,
  children,
  count,
  required,
}: SectionAccordionProps) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }} className="last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 py-3 px-2 -mx-2 rounded-lg hover:bg-white/15 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className={`w-4 h-4 text-content-tertiary transition-transform duration-150 ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <span className="text-sm font-medium text-content">{title}</span>
          {required && (
            <span className="text-danger text-xs">*</span>
          )}
          {count != null && count > 0 && (
            <span className="text-xs text-content-tertiary">({count})</span>
          )}
        </span>
      </button>
      {isOpen && (
        <div className="pb-4 pl-6 pr-2">
          {children}
        </div>
      )}
    </div>
  )
}
