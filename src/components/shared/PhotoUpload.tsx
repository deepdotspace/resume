/**
 * PhotoUpload — Circular photo upload for resume headshot (Europass).
 *
 * Compresses images before storing. Shows preview with remove option.
 */

import React, { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { compressImage } from '../../utils/compressImage'

interface PhotoUploadProps {
  value: string
  onChange: (dataUrl: string) => void
  readOnly?: boolean
  label?: string
}

const ACCEPT = 'image/jpeg,image/jpg,image/png'

export function PhotoUpload({ value, onChange, readOnly, label = 'Profile photo' }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || readOnly) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPEG or PNG image')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const dataUrl = await compressImage(file)
      onChange(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    // Stop bubbling to the outer upload zone — otherwise clicking the remove
    // button also triggers the zone's click handler and immediately reopens
    // the file picker.
    e.stopPropagation()
    if (readOnly) return
    onChange('')
  }

  const handleClick = () => {
    if (readOnly) return
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="block text-sm font-medium text-content mb-0">
          {label}
        </label>
      )}
      <div className="flex items-center gap-4">
        <div
          className={`
            relative w-20 h-20 rounded-full overflow-hidden
            border-2 border-dashed border-border bg-surface-inset/60 backdrop-blur-md shadow-sm
            flex items-center justify-center
            ${!readOnly ? 'cursor-pointer hover:border-accent/40 hover:bg-surface-overlay/30 transition-colors' : ''}
          `}
          onClick={handleClick}
          role={readOnly ? undefined : 'button'}
          aria-label={readOnly ? undefined : 'Upload photo'}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="hidden"
            disabled={readOnly}
          />
          {loading ? (
            <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          ) : value ? (
            <>
              <img
                src={value}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute inset-0 flex items-center justify-center
                             bg-black/50 opacity-0 hover:opacity-100 transition-opacity
                             text-white rounded-full"
                  aria-label="Remove photo"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <Camera className="w-8 h-8 text-content-tertiary" />
          )}
        </div>
        <div className="text-xs text-content-secondary">
          {value
            ? 'Click to change or hover to remove'
            : 'Optional. Used in Europass template.'}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
