/**
 * BackgroundLayer — Fixed full-bleed background image with overlay.
 * Sits at z-0 behind all UI. All other content should be z-10+.
 * For solid backgrounds (light/dark), renders a flat color instead of an image.
 */

import React, { useMemo } from 'react'
import { BACKGROUNDS } from '../../constants'

interface BackgroundLayerProps {
  backgroundId: string
}

const SOLID_BACKGROUNDS: Record<string, string> = {
  light: '#F8F9FA',
  dark: '#121220',
}

export default function BackgroundLayer({ backgroundId }: BackgroundLayerProps) {
  const bg = useMemo(
    () => BACKGROUNDS.find(b => b.id === backgroundId) ?? BACKGROUNDS[0],
    [backgroundId],
  )

  const solidColor = SOLID_BACKGROUNDS[bg.id]

  if (solidColor) {
    return (
      <div className="background-layer" aria-hidden="true">
        <div
          className="background-layer-image"
          style={{ background: solidColor }}
        />
      </div>
    )
  }

  return (
    <div className="background-layer" aria-hidden="true">
      <div
        className="background-layer-image"
        style={{ backgroundImage: `url(${bg.url})` }}
      />
      <div className="background-layer-overlay" />
    </div>
  )
}
