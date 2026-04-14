/**
 * ResumeCard — Square card displaying a saved resume.
 * On hover, the icon area crossfades to show a PDF thumbnail preview.
 */

import React, { useState } from 'react'
import { FileText, Trash2, Edit2, Clock } from 'lucide-react'
import PdfThumbnail from './PdfThumbnail'
import type { Resume } from '../../hooks'
import { TEMPLATE_METADATA } from '../../constants'

interface ResumeCardProps {
  resume: Resume
  onClick: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
  /** Base64 PDF data from the latest compiled version (if any) */
  latestPdfBase64?: string
}

function timeAgo(ts: number): string {
  if (!ts) return 'Never edited'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function ResumeCard({ resume, onClick, onDelete, onRename, latestPdfBase64 }: ResumeCardProps) {
  const [hovered, setHovered] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(resume.data.title)

  const template = TEMPLATE_METADATA.find(t => t.id === resume.data.templateId)
  const templateColor = template?.color || '#6366F1'
  const templateName = template?.name || resume.data.templateId || 'Unknown'

  const hasPreview = !!latestPdfBase64 || !!template?.previewUrl

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== resume.data.title) {
      onRename(trimmed)
    }
    setRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') {
      setRenameValue(resume.data.title)
      setRenaming(false)
    }
  }

  return (
    <div
      className="template-card relative flex flex-col aspect-square"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={!renaming ? onClick : undefined}
    >
      {/* Thumbnail area */}
      <div
        className="flex-1 rounded-lg mb-3 relative overflow-hidden"
        style={{ background: `${templateColor}15`, border: `1px solid ${templateColor}25` }}
      >
        {hasPreview ? (
          <div className="absolute inset-0 flex items-stretch p-1">
            {latestPdfBase64 ? (
              <PdfThumbnail
                base64={latestPdfBase64}
                fill
                className="w-full h-full rounded"
              />
            ) : (
              <PdfThumbnail
                url={template?.previewUrl}
                fill
                className="w-full h-full rounded"
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText
              className="w-10 h-10"
              style={{ color: templateColor, opacity: 0.6 }}
            />
          </div>
        )}
      </div>

      {/* Title */}
      {renaming ? (
        <input
          autoFocus
          className="w-full px-1 py-0.5 text-sm font-medium text-content bg-surface-inset
                     border border-accent rounded focus:outline-none"
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <p className="text-sm font-medium text-content truncate">{resume.data.title}</p>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between mt-1">
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: `${templateColor}15`, color: templateColor }}
        >
          {templateName}
        </span>
        <span className="text-xs text-content-tertiary flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(resume.data.updatedAt)}
        </span>
      </div>

      {/* Hover actions */}
      {hovered && !renaming && (
        <div
          className="absolute top-2 right-2 flex gap-1 z-10"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setRenaming(true); setRenameValue(resume.data.title) }}
            className="btn-icon w-6 h-6"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="btn-icon btn-icon-danger w-6 h-6"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
