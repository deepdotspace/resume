import { createRoot } from 'react-dom/client'
// `/lazy` instead of the default export emits one chunk per page route
// (home, editor, settings) and code-splits the editor's heavy deps
// (LaTeX templates, PDF viewer, AI chat, 3D robot) out of the home-page
// boot path. Cuts initial JS by roughly half. `_app.tsx` already wraps
// the outlet in a <Suspense fallback={null}> so lazy routes Suspend
// cleanly without a layout flash.
import { Routes } from '@generouted/react-router/lazy'
import './styles.css'

createRoot(document.getElementById('root')!).render(<Routes />)
