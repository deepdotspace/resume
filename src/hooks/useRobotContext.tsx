/**
 * useRobotContext — Owns the shared RobotViewer host for the app.
 * Pages can register a visible host, while the provider keeps a hidden
 * fallback host so the robot remains managed by React even off-screen.
 */

import React, { createContext, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import RobotViewer from '../components/robot/RobotViewer'

export interface RobotViewerHandle {
  playAnimation: (animName: string) => void
}

interface RobotContextValue {
  robotRef: React.RefObject<RobotViewerHandle | null>
  setRobotHost: (host: HTMLDivElement | null) => void
}

const RobotContext = createContext<RobotContextValue | null>(null)

const HIDDEN_STYLES: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: 260,
  height: 280,
  opacity: 0,
  zIndex: -1,
  pointerEvents: 'none',
}

export function RobotProvider({ children }: { children: React.ReactNode }) {
  const robotRef = useRef<RobotViewerHandle | null>(null)
  const [fallbackHost, setFallbackHost] = useState<HTMLDivElement | null>(null)
  const [activeHost, setActiveHost] = useState<HTMLDivElement | null>(null)
  const location = useLocation()

  const isOnDashboard = location.pathname === '/' || location.pathname === '/home'
  const portalTarget = activeHost ?? fallbackHost

  return (
    <RobotContext.Provider value={{ robotRef, setRobotHost: setActiveHost }}>
      {children}
      <div ref={setFallbackHost} style={HIDDEN_STYLES} aria-hidden="true" />
      {portalTarget
        ? createPortal(<RobotViewer ref={robotRef} paused={!isOnDashboard} />, portalTarget)
        : null}
    </RobotContext.Provider>
  )
}

export function useRobotContext() {
  const ctx = useContext(RobotContext)
  if (!ctx) throw new Error('useRobotContext must be used within RobotProvider')
  return ctx
}
