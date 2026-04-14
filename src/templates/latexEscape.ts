/**
 * Shared LaTeX escaping and lightweight input normalization helpers.
 */

const LATEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '#': '\\#',
  '$': '\\$',
  '%': '\\%',
  '&': '\\&',
  '_': '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
}

const PHOTO_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png);base64,/i

function normalizeLatexInput(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '--')
    .replace(/\u2014/g, '---')
    .replace(/\u2026/g, '...')
}

export function escapeLatex(value: string | null | undefined): string {
  if (!value) return ''
  const normalized = normalizeLatexInput(value)
  return normalized.replace(/[\\#$%&_{}~^]/g, char => LATEX_ESCAPES[char] ?? char)
}

export function getEmbeddedPhotoPath(dataUrl: string | null | undefined): string | null {
  const input = dataUrl?.trim() || ''
  const match = input.match(PHOTO_DATA_URL_REGEX)
  if (!match) return null
  const ext = match[1]?.toLowerCase() === 'png' ? 'png' : 'jpg'
  return `photo.${ext}`
}
