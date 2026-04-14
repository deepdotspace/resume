/**
 * ResumeUpload — Drag-drop zone for PDF/DOCX upload to auto-fill form.
 *
 * Uses a full-window drop overlay so files dragged from the OS into the
 * iframe are always captured, even if the cursor doesn't land precisely
 * on the small drop zone.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { Upload, FileText } from 'lucide-react'
import { useResumeParser } from '../../hooks'
import type { ResumeFormData } from '../../templates'

interface ResumeUploadProps {
  onParsed: (data: ResumeFormData) => void
  collapsed?: boolean
  onParsingChange?: (isParsing: boolean) => void
}

const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'doc']

function isAcceptedFile(file: File): boolean {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext)
}

export function ResumeUpload({ onParsed, collapsed = false, onParsingChange }: ResumeUploadProps) {
  const { parse, isParsing, error } = useResumeParser()

  useEffect(() => {
    onParsingChange?.(isParsing)
  }, [isParsing, onParsingChange])
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      const data = await parse(file)
      if (data) onParsed(data)
    },
    [parse, onParsed],
  )

  // Window-level drag tracking so we catch files dragged anywhere into the iframe
  useEffect(() => {
    if (collapsed || isParsing) return

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current += 1
      if (dragCounterRef.current === 1) setIsDragOver(true)
    }

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsDragOver(false)
      }
    }

    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragOver(false)
      const file = e.dataTransfer?.files[0]
      if (file && isAcceptedFile(file)) handleFile(file)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      dragCounterRef.current = 0
    }
  }, [collapsed, isParsing, handleFile])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile],
  )

  if (collapsed) {
    return (
      <div className="mb-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={handleInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={isParsing}
          className="text-xs text-accent hover:underline flex items-center gap-1"
        >
          <FileText className="w-3 h-3" />
          Re-import from PDF/DOCX
        </button>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mb-4 relative">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={handleInputChange}
        className="hidden"
      />
      <div
        onClick={handleClick}
        className={`
          upload-zone flex flex-col items-center justify-center gap-2
          px-4 py-6 rounded-lg border-2 border-dashed
          backdrop-blur-xl cursor-pointer transition-all duration-150
          ${isParsing
            ? 'pointer-events-none opacity-70 border-border bg-surface-inset/50'
            : isDragOver
              ? 'border-accent bg-accent/10 scale-[1.01] shadow-lg'
              : 'border-border bg-surface-inset/50 hover:border-accent/40 hover:bg-accent/5'
          }
        `}
      >
        {isParsing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-xs text-content-secondary">
              Extracting text... Parsing resume...
            </span>
          </div>
        ) : isDragOver ? (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-accent animate-bounce" />
            <span className="text-xs text-accent font-medium text-center">
              Drop your resume here
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-content-tertiary" />
            <span className="text-xs text-content-secondary text-center">
              Drag & drop a PDF or DOCX to auto-fill — or click to browse
            </span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}

      {/* Full-window overlay when dragging — visible cue + ensures drop is captured */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-accent/5 backdrop-blur-[2px] border-2 border-dashed border-accent/30 rounded-lg" />
        </div>
      )}
    </div>
  )
}
