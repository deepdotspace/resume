/**
 * PdfDisplay — render PDF from blob URL using PDF.js.
 */

import React, { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    pdfjsLib: unknown
  }
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'

interface PdfDisplayProps {
  pdfUrl: string | null
  zoom: number
  onZoomChange?: (zoom: number) => void
}

let pdfjsLoadPromise: Promise<unknown> | null = null

async function loadPdfJs(): Promise<unknown> {
  if ((window as Window & { pdfjsLib?: unknown }).pdfjsLib) return (window as Window & { pdfjsLib: unknown }).pdfjsLib
  if (pdfjsLoadPromise) return pdfjsLoadPromise

  pdfjsLoadPromise = import(/* webpackIgnore: true */ PDFJS_CDN).then((mod: { default?: unknown }) => {
    const lib = mod.default || mod as { GlobalWorkerOptions: { workerSrc: string } }
    ;(lib as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
    ;(window as Window & { pdfjsLib: unknown }).pdfjsLib = lib
    return lib
  })

  return pdfjsLoadPromise
}

function CanvasPage({ canvas, pageNum, scaleFactor }: { canvas: HTMLCanvasElement; pageNum: number; scaleFactor: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.display = 'block'

    wrapper.innerHTML = ''
    wrapper.appendChild(canvas)

    return () => {
      if (wrapper.contains(canvas)) {
        wrapper.removeChild(canvas)
      }
    }
  }, [canvas])

  return (
    <div
      ref={wrapperRef}
      className="bg-white dark:bg-[#2a2a3c] rounded shadow-md pdf-page"
      style={{ width: `${Math.min(800 * scaleFactor, 100)}%`, maxWidth: `${800 * scaleFactor}px` }}
      data-page={pageNum}
    />
  )
}

export function PdfDisplay({ pdfUrl, zoom, onZoomChange }: PdfDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<HTMLCanvasElement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const renderTaskRef = useRef(0)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  useEffect(() => {
    if (!pdfUrl) {
      setPages([])
      setError(null)
      return
    }

    const taskId = ++renderTaskRef.current
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const pdfjsLib = await loadPdfJs() as { getDocument: (src: string) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } }> }> } }
        if (taskId !== renderTaskRef.current) return

        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        if (taskId !== renderTaskRef.current) return

        const canvases: HTMLCanvasElement[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
          if (taskId !== renderTaskRef.current) return

          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2 })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height

          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvasContext: ctx, viewport }).promise

          canvases.push(canvas)
        }

        if (taskId !== renderTaskRef.current) return
        setPages(canvases)
        setLoading(false)
      } catch (err: unknown) {
        if (taskId !== renderTaskRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to render PDF')
        setLoading(false)
      }
    })()

    return () => {
      renderTaskRef.current++
    }
  }, [pdfUrl])

  function zoomToPoint(newZoom: number, clientX: number, clientY: number) {
    if (!onZoomChange || !scrollRef.current) return
    const el = scrollRef.current
    const oldZoom = zoomRef.current
    const scale = newZoom / oldZoom

    const rect = el.getBoundingClientRect()
    const cursorXInView = clientX - rect.left
    const cursorYInView = clientY - rect.top
    const contentX = el.scrollLeft + cursorXInView
    const contentY = el.scrollTop + cursorYInView

    onZoomChange(newZoom)

    requestAnimationFrame(() => {
      el.scrollLeft = contentX * scale - cursorXInView
      el.scrollTop = contentY * scale - cursorYInView
    })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !onZoomChange) return

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const factor = 1 - e.deltaY * 0.005
      const newZoom = Math.max(25, Math.min(300, zoomRef.current * factor))
      zoomToPoint(newZoom, e.clientX, e.clientY)
    }

    let pinchStartDist = 0
    let pinchStartZoom = 0
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        )
        pinchStartZoom = zoomRef.current
      }
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDist <= 0) return
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      )
      const factor = dist / pinchStartDist
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const newZoom = Math.max(25, Math.min(300, pinchStartZoom * factor))
      zoomToPoint(newZoom, centerX, centerY)
    }
    const handleTouchEnd = () => {
      pinchStartDist = 0
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onZoomChange])

  if (!pdfUrl) return null

  const scaleFactor = zoom / 100

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto bg-[#e8e8e8] dark:bg-[#1a1a2e]">
      <div
        className="flex flex-col items-center origin-top-left"
        style={{
          width: `${scaleFactor * 100}%`,
          padding: `${16 * scaleFactor}px`,
          gap: `${16 * scaleFactor}px`,
        }}
      >
        {loading && pages.length === 0 && (
          <div className="flex items-center justify-center py-12" style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'center' }}>
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-content-secondary">Rendering PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'center' }}>
            <p className="text-danger text-sm">{error}</p>
            <a href={pdfUrl} download="resume.pdf" className="px-4 py-2 bg-accent text-white rounded text-sm hover:opacity-90">
              Download PDF instead
            </a>
          </div>
        )}

        {pages.map((canvas, idx) => (
          <CanvasPage key={idx} canvas={canvas} pageNum={idx + 1} scaleFactor={scaleFactor} />
        ))}
      </div>
    </div>
  )
}
