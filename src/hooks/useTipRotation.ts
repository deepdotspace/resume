/**
 * useTipRotation — Shows a random tip when user visits the dashboard.
 * New quote on each dashboard visit (mount) and when user clicks the robot.
 *
 * Returns the current tip, visibility flag, robotRef, and rotateTip (for click handler).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { RESUME_TIPS, TIP_ANIMATIONS } from '../constants'
import type { RobotViewerHandle } from './useRobotContext'

export function useTipRotation() {
  const [currentTip, setCurrentTip] = useState(() => RESUME_TIPS[0])
  const [visible, setVisible] = useState(true)
  const lastIndexRef = useRef(0)
  const robotRef = useRef<RobotViewerHandle | null>(null)

  const pickNextTip = useCallback(() => {
    let nextIdx: number
    do {
      nextIdx = Math.floor(Math.random() * RESUME_TIPS.length)
    } while (nextIdx === lastIndexRef.current && RESUME_TIPS.length > 1)
    lastIndexRef.current = nextIdx
    return RESUME_TIPS[nextIdx]
  }, [])

  const rotateTip = useCallback(() => {
    // Fade out
    setVisible(false)

    setTimeout(() => {
      const nextTip = pickNextTip()
      setCurrentTip(nextTip)

      // Trigger robot animation
      if (robotRef.current) {
        const anim = TIP_ANIMATIONS[Math.floor(Math.random() * TIP_ANIMATIONS.length)]
        robotRef.current.playAnimation(anim)
      }

      // Fade in
      setTimeout(() => setVisible(true), 200)
    }, 300)
  }, [pickNextTip])

  // New random quote every time user comes to dashboard (mount)
  useEffect(() => {
    setCurrentTip(pickNextTip())
  }, [pickNextTip])

  return { currentTip, visible, robotRef, rotateTip }
}
