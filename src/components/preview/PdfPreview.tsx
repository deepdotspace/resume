/**
 * PdfPreview — PDF viewer with pinch/scroll zoom (no toolbar).
 */

import React, { useState, useCallback } from 'react'
import { PdfDisplay } from './PdfDisplay'
import { Play } from 'lucide-react'

const ZOOM_MIN = 25
const ZOOM_MAX = 300

interface PdfPreviewProps {
  pdfUrl: string | null
  isCompiling: boolean
}

export function PdfPreview({ pdfUrl, isCompiling }: PdfPreviewProps) {
  const [zoom, setZoom] = useState(100)

  const handleSetZoom = useCallback((newZoom: number) => {
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(newZoom))))
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {pdfUrl ? (
        <PdfDisplay pdfUrl={pdfUrl} zoom={zoom} onZoomChange={handleSetZoom} />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-xs">
            {isCompiling ? (
              <>
                <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-content-secondary text-sm">Compiling...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center text-content-tertiary">
                  <Play className="w-7 h-7" />
                </div>
                <p className="text-content-secondary text-sm font-medium mb-1">No PDF yet</p>
                <p className="text-content-tertiary text-xs">
                  Fill in the form and click Compile to generate your resume.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
