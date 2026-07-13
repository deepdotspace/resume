/**
 * RouteErrorBoundary — friendly fallback for route crashes.
 *
 * Two pieces sharing one fallback card:
 * - RouteErrorBoundary: React class boundary wrapped around the route
 *   outlet in `_app.tsx`. Catches render errors from page content while
 *   the app shell (providers, BackgroundLayer, auth) stays mounted.
 * - RouteErrorFallback: the fallback card itself. Also rendered by the
 *   `Catch` export in `_app.tsx` (generouted maps it to the react-router
 *   root `ErrorBoundary`) as a last resort for errors the class boundary
 *   cannot see, e.g. route lazy-module load failures or loader errors.
 */

import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

export function RouteErrorFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={
        fullScreen
          ? 'min-h-screen bg-surface flex items-center justify-center p-6'
          : 'flex-1 min-h-0 flex items-center justify-center p-6'
      }
    >
      <div className="glass-elevated rounded-panel w-full max-w-sm px-8 py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-content mb-2">Something went wrong</h2>
        <p className="text-sm text-content-secondary leading-relaxed mb-6">
          This screen hit an unexpected error. Your data is safe. Reload to continue.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

interface RouteErrorBoundaryState {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<{ children: ReactNode }, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Diagnostics only — the fallback UI never shows the stack.
    console.error('[RouteErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) return <RouteErrorFallback />
    return this.props.children
  }
}
