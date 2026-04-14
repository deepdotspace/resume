/**
 * TemplateCard — Square card for a resume template.
 * On hover, the original icon/lines fade out and a PDF thumbnail fades in.
 */

import React from 'react'
import { Globe } from 'lucide-react'
import PdfThumbnail from './PdfThumbnail'
import type { TemplateMetadata } from '../../constants'

interface TemplateCardProps {
  template: TemplateMetadata
  onClick: () => void
}

const TEMPLATE_ICONS: Record<string, string> = {
  modern: 'M',
  europass: 'EU',
  academic: 'AC',
  twocolumn: '2C',
  jakes: 'J',
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <div
      className="template-card flex flex-col aspect-square"
      onClick={onClick}
    >
      {/* Preview thumbnail */}
      <div className="flex-1 rounded-lg mb-3 relative overflow-hidden"
        style={{
          background: `${template.color}12`,
          border: `1px solid ${template.color}25`,
        }}
      >
        {template.previewUrl ? (
          <div className="absolute inset-0 flex items-stretch p-1">
            <PdfThumbnail
              url={template.previewUrl}
              fill
              className="w-full h-full rounded"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: template.color }}
            >
              {TEMPLATE_ICONS[template.id] || template.name[0]}
            </div>
            <div className="w-16 space-y-1">
              <div className="h-1 rounded" style={{ background: `${template.color}40`, width: '100%' }} />
              <div className="h-1 rounded" style={{ background: `${template.color}25`, width: '75%' }} />
              <div className="h-1 rounded" style={{ background: `${template.color}25`, width: '85%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-content">{template.name}</p>

      {/* Description + region */}
      <p className="text-xs text-content-tertiary mt-0.5 leading-snug line-clamp-2">
        {template.description}
      </p>

      <div className="flex items-center gap-1 mt-1.5">
        <Globe className="w-3 h-3 text-content-tertiary" />
        <span className="text-xs text-content-tertiary">{template.region}</span>
      </div>
    </div>
  )
}
