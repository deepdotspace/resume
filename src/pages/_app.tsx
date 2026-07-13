/**
 * App — global providers + shell.
 *
 * Generouted renders this around all routes.
 * Providers -> auth gate -> page outlet.
 */

import { Suspense, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { DeepSpaceAuthProvider, useAuth, AuthOverlay } from 'deepspace'
import { RecordProvider, RecordScope } from 'deepspace'
import { ToastProvider } from '../components/ui'
import { APP_NAME, SCOPE_ID } from '../constants'
import { schemas } from '../schemas'
import { RobotProvider } from '../hooks/useRobotContext'
import BackgroundLayer from '../components/shared/BackgroundLayer'
import { RouteErrorBoundary, RouteErrorFallback } from '../components/shared/RouteErrorBoundary'
import { useEditorSettings } from '../hooks/useEditorSettings'
import { useThemeSync } from '../hooks/useThemeSync'
import { themeForBackground } from '../utils/themeForBackground'

export default function App() {
  return (
    <ToastProvider>
      <DeepSpaceAuthProvider>
        <AuthGate>
          <AppShell />
        </AuthGate>
      </DeepSpaceAuthProvider>
    </ToastProvider>
  )
}

/**
 * Router-level error fallback. Generouted assigns this as the root route's
 * `ErrorBoundary` (see @generouted/react-router dist/index-lazy.js:
 * `app = { ..., ErrorBoundary: _app?.Catch }`), replacing react-router's
 * raw stack-trace screen. When it renders the shell is unmounted, so it is
 * full-screen; render crashes inside routes are caught earlier by
 * RouteErrorBoundary in AppShell, which keeps the shell mounted.
 */
export function Catch() {
  return <RouteErrorFallback fullScreen />
}

/** Inner shell that has access to RecordScope for settings */
function AppShell() {
  const { settings } = useEditorSettings()
  const theme = themeForBackground(settings.backgroundId)
  useThemeSync(theme)

  return (
    <RobotProvider>
      <BackgroundLayer backgroundId={settings.backgroundId} />
      <div className="app-shell h-screen overflow-hidden flex flex-col relative z-10">
        <RouteErrorBoundary>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    </RobotProvider>
  )
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-content-secondary text-sm">Loading Resume...</div>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <AuthOverlay />
  }

  return (
    <RecordProvider>
      <RecordScope roomId={SCOPE_ID} schemas={schemas} appId={APP_NAME}>
        {children}
      </RecordScope>
    </RecordProvider>
  )
}
