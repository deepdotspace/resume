/**
 * ThoughtBubble — CSS speech bubble shown above the robot.
 *
 * Fades in/out when visible prop changes.
 */

import React from 'react'

interface ThoughtBubbleProps {
  text: string
  visible: boolean
}

export default function ThoughtBubble({ text, visible }: ThoughtBubbleProps) {
  return (
    <div className="relative flex flex-col items-center w-full" style={{ height: 96 }}>
      {/* Fixed height prevents layout shift when tip rotates (robot jumping up/down) */}
      <div className={`thought-bubble ${visible ? 'visible' : 'hidden'}`}>
        <p
          className="text-content-secondary text-xs italic leading-relaxed max-w-[180px] text-center"
          style={{ fontStyle: 'italic' }}
        >
          "{text}"
        </p>
      </div>

      {/* Trailing circles */}
      <div
        className="thought-bubble-circle-1"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease' }}
      />
      <div
        className="thought-bubble-circle-2"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease' }}
      />
    </div>
  )
}
