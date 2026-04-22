/**
 * useThemeSync — keeps the `.dark` class on <html> in sync with the
 * user's theme. Mirrors the resolved value to `localStorage` so the
 * inline pre-boot script in `index.html` can restore it synchronously
 * on the next load (no flash of wrong mode).
 *
 * The storage key here MUST match the one read by that inline script.
 */

import { useEffect } from 'react'

export const THEME_STORAGE_KEY = 'resume-theme'

export function useThemeSync(theme: 'light' | 'dark') {
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    root.dataset.uiTheme = theme

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch { /* storage full or disabled — ignore */ }
  }, [theme])
}
