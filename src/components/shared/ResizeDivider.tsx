/**
 * ResizeDivider — draggable separator for resizable panels.
 */

import React, { useCallback, useRef, useState } from 'react'

interface ResizeDividerProps {
  orientation?: 'vertical' | 'horizontal'
  onResize: (clientPos: number) => void
  className?: string
}

export function ResizeDivider({ orientation = 'vertical', onResize, className = '' }: ResizeDividerProps) {
  const draggingRef = useRef(false)
  const [active, setActive] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    setActive(true)
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return
      onResize(orientation === 'vertical' ? ev.clientX : ev.clientY)
    }

    const handleMouseUp = () => {
      draggingRef.current = false
      setActive(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onResize, orientation])

  const isVertical = orientation === 'vertical'

  return (
    <div
      className={`flex-shrink-0 relative group ${isVertical ? 'cursor-col-resize' : 'cursor-row-resize'} ${className}`}
      style={isVertical ? { width: 6, minWidth: 6 } : { height: 6, minHeight: 6 }}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation={orientation}
    >
      <div
        className="absolute z-10"
        style={isVertical
          ? { top: 0, bottom: 0, left: -3, right: -3 }
          : { left: 0, right: 0, top: -3, bottom: -3 }
        }
      />
      <div
        className={`absolute transition-colors duration-100 ${
          active ? 'bg-accent' : 'bg-border group-hover:bg-accent/40'
        }`}
        style={isVertical
          ? { top: 0, bottom: 0, left: 2, width: 2, borderRadius: 1 }
          : { left: 0, right: 0, top: 2, height: 2, borderRadius: 1 }
        }
      />
    </div>
  )
}
