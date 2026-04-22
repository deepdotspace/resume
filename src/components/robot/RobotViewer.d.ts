import type { ForwardRefExoticComponent, RefAttributes } from 'react'

export interface RobotViewerHandle {
  playAnimation: (animName: string) => void
}

export interface RobotViewerProps {
  paused?: boolean
}

declare const RobotViewer: ForwardRefExoticComponent<
  RobotViewerProps & RefAttributes<RobotViewerHandle>
>

export default RobotViewer
