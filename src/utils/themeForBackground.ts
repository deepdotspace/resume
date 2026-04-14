/**
 * Derives the UI theme from the selected background.
 * 'light' background → light theme; all others (dark, image backgrounds) → dark theme.
 */
export function themeForBackground(backgroundId: string): 'light' | 'dark' {
  return backgroundId === 'light' ? 'light' : 'dark'
}
