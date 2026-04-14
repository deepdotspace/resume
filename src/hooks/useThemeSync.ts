/**
 * useThemeSync — keeps the `.dark` class on <html> in sync with
 * the user's editor theme setting.
 */

import { useEffect } from 'react'

export function useThemeSync(theme: 'light' | 'dark') {
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    root.dataset.uiTheme = theme
  }, [theme])
}
