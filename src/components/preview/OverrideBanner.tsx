/**
 * OverrideBanner — Shown at top of form panel when LaTeX override mode is active.
 */

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface OverrideBannerProps {
  onReturnToForm: () => void
}

export function OverrideBanner({ onReturnToForm }: OverrideBannerProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning mb-3">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium flex-1">
        LaTeX override active — form is read-only.
      </span>
      <button
        type="button"
        onClick={onReturnToForm}
        className="text-xs font-medium text-accent hover:underline shrink-0"
      >
        Return to form mode →
      </button>
    </div>
  )
}
