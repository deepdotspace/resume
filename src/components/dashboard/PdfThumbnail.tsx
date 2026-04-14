/**
 * PdfThumbnail — renders page 1 of a PDF as a small canvas thumbnail.
 * Accepts either a remote URL or base64 data. Caches rendered thumbnails
 * in a module-level map so re-renders / tab switches don't re-decode.
 */

import React, { useEffect, useRef, useState } from 'react'

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'

let pdfjsLoadPromise: Promise<unknown> | null = null
 
async function loadPdfJs(): Promise<unknown> {
  if ((window as Window & { pdfjsLib?: unknown }).pdfjsLib)
    return (window as Window & { pdfjsLib: unknown }).pdfjsLib
  if (pdfjsLoadPromise) return pdfjsLoadPromise

  pdfjsLoadPromise = import(/* webpackIgnore: true */ PDFJS_CDN).then(
    (mod: { default?: unknown }) => {
      const lib = mod.default || (mod as { GlobalWorkerOptions: { workerSrc: string } })
      ;(lib as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
        PDFJS_WORKER_CDN
      ;(window as Window & { pdfjsLib: unknown }).pdfjsLib = lib
      return lib
    },
  )
  return pdfjsLoadPromise
}

// Module-level cache: key → dataURL so we never re-render the same PDF
const thumbnailCache = new Map<string, string>()

interface PdfThumbnailProps {
  /** Remote PDF URL */
  url?: string
  /** Base64-encoded PDF data (without data: prefix) */
  base64?: string
  /** Render width in CSS pixels — canvas renders at 2x for retina. Ignored when fill=true. */
  width?: number
  /** When true, thumbnail fills its container (use for card hover previews) */
  fill?: boolean
  /** How the rendered preview should behave when fill=true. */
  displayMode?: 'contain' | 'full-width'
  className?: string
}

export default function PdfThumbnail({
  url,
  base64,
  width = 180,
  fill = false,
  displayMode = 'contain',
  className = '',
}: PdfThumbnailProps) {
  const renderWidth = fill ? 400 : width
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const taskRef = useRef(0)

  const cacheKey = url || (base64 ? base64.slice(0, 64) : '')

  useEffect(() => {
    if (!url && !base64) {
      setLoading(false)
      setError(true)
      return
    }

    // Check cache first
    if (cacheKey && thumbnailCache.has(cacheKey)) {
      setDataUrl(thumbnailCache.get(cacheKey)!)
      setLoading(false)
      return
    }

    const taskId = ++taskRef.current
    setLoading(true)
    setError(false)

    void (async () => {
      try {
        const pdfjsLib = (await loadPdfJs()) as {
          getDocument: (
            src: string | { data: Uint8Array },
          ) => {
            promise: Promise<{
              getPage: (n: number) => Promise<{
                getViewport: (o: { scale: number }) => { width: number; height: number }
                render: (o: {
                  canvasContext: CanvasRenderingContext2D
                  viewport: { width: number; height: number }
                }) => { promise: Promise<void> }
              }>
            }>
          }
        }

        if (taskId !== taskRef.current) return

        let source: string | { data: Uint8Array }
        if (base64) {
          const binaryStr = atob(base64)
          const bytes = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
          source = { data: bytes }
        } else {
          source = url!
        }

        const pdf = await pdfjsLib.getDocument(source).promise
        if (taskId !== taskRef.current) return

        const page = await pdf.getPage(1)
        if (taskId !== taskRef.current) return

        // Render at 2x the target width for retina sharpness
        const desiredWidth = renderWidth * 2
        const unscaledViewport = page.getViewport({ scale: 1 })
        const scale = desiredWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No 2d context')

        await page.render({ canvasContext: ctx, viewport }).promise
        if (taskId !== taskRef.current) return

        const result = canvas.toDataURL('image/png')
        if (cacheKey) thumbnailCache.set(cacheKey, result)
        setDataUrl(result)
        setLoading(false)
      } catch {
        if (taskId !== taskRef.current) return
        setError(true)
        setLoading(false)
      }
    })()

    return () => {
      taskRef.current++
    }
  }, [url, base64, renderWidth, cacheKey])

  if (error || (!url && !base64)) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-inset/50 rounded ${fill ? 'w-full h-full ' : ''}${className}`}
        style={fill ? undefined : { width, aspectRatio: '0.707' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-content-tertiary opacity-40">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={`rounded overflow-hidden ${fill ? 'w-full h-full ' : ''}${className}`}
        style={fill ? undefined : { width, aspectRatio: '0.707' }}
      >
        <div className="w-full h-full bg-surface-inset/60 animate-pulse rounded" />
      </div>
    )
  }

  if (fill) {
    if (displayMode === 'full-width') {
      return (
        <img
          src={dataUrl!}
          alt="PDF preview"
          className={`block w-full h-auto rounded shadow-sm ${className}`}
          draggable={false}
        />
      )
    }

    return (
      <div className={`w-full h-full min-w-0 min-h-0 flex items-center justify-center ${className}`}>
        <img
          src={dataUrl!}
          alt="PDF preview"
          className="max-w-full max-h-full w-auto h-auto object-contain rounded shadow-sm"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <img
      src={dataUrl!}
      alt="PDF preview"
      className={`rounded shadow-sm object-cover object-top ${className}`}
      style={{ width, aspectRatio: '0.707' }}
      draggable={false}
    />
  )
}
