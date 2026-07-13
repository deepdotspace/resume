/**
 * Shape normalization for resume section columns.
 *
 * Resume sections are stored as JSON-encoded text columns (see
 * `resumesSchema`), so nothing in the storage layer guarantees the shapes the
 * forms and LaTeX generators consume (`SkillGroup.items: string[]`,
 * `ExperienceEntry.bullets: string[]`, …). The AI chat writes these columns
 * through records tools, and a model occasionally emits a near-miss shape —
 * e.g. `items` as one comma-joined string — which crashed the editor route.
 *
 * Two layers share these normalizers:
 *   - the worker's AI tool-call boundary (`normalizeResumeWrite`) coerces
 *     unambiguous near-misses before they're stored and rejects the rest with
 *     an instructive error the model can act on;
 *   - the client's record→form parse (`useResumeForm`) runs stored values
 *     through the same functions, so rows written before this guard existed
 *     still open instead of crashing.
 *
 * Coercions here are limited to unambiguous intent: a comma-joined `items`
 * string splits exactly like the SkillsForm input does, a lone object wraps
 * into a one-element array, a raw (non-encoded) array is JSON-encoded.
 * Anything else returns `null` so the caller can fall back or reject.
 */

import type {
  SkillGroup,
  ExperienceEntry,
  EducationEntry,
  LanguageEntry,
  ProjectEntry,
  CertificationEntry,
  CustomSection,
  CustomEntry,
} from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Array (or lone object → wrapped) of entries; null when unrecognizable. */
function toEntryList(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (isPlainObject(value)) return [value]
  return null
}

/**
 * Force a string[] field. Arrays keep their string members; a bare string
 * splits on the given separator ('comma' for skill items — the same
 * semantics as the SkillsForm text input — 'lines' for bullets).
 */
function toStringArray(value: unknown, split: 'comma' | 'lines'): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string')
  if (typeof value === 'string') {
    const parts = split === 'comma' ? value.split(',') : value.split('\n')
    return parts.map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export function normalizeSkills(value: unknown): SkillGroup[] | null {
  const list = toEntryList(value)
  if (!list) return null
  const groups: SkillGroup[] = []
  const loose: string[] = []
  for (const entry of list) {
    if (isPlainObject(entry)) {
      groups.push({
        ...entry,
        category: typeof entry.category === 'string' ? entry.category : '',
        items: toStringArray(entry.items, 'comma'),
      })
    } else if (typeof entry === 'string' && entry.trim()) {
      loose.push(entry.trim())
    }
  }
  if (loose.length) groups.push({ category: '', items: loose })
  return groups
}

/** Entries with a `bullets: string[]` field (experience, projects). */
function normalizeBulleted<T>(value: unknown): T[] | null {
  const list = toEntryList(value)
  if (!list) return null
  return list.filter(isPlainObject).map((entry) => {
    const out = { ...entry }
    if ('bullets' in out) out.bullets = toStringArray(out.bullets, 'lines')
    return out as T
  })
}

export function normalizeExperience(value: unknown): ExperienceEntry[] | null {
  return normalizeBulleted<ExperienceEntry>(value)
}

export function normalizeProjects(value: unknown): ProjectEntry[] | null {
  return normalizeBulleted<ProjectEntry>(value)
}

export function normalizeEducation(value: unknown): EducationEntry[] | null {
  const list = toEntryList(value)
  if (!list) return null
  return list.filter(isPlainObject) as unknown as EducationEntry[]
}

export function normalizeCertifications(value: unknown): CertificationEntry[] | null {
  const list = toEntryList(value)
  if (!list) return null
  return list.filter(isPlainObject) as unknown as CertificationEntry[]
}

export function normalizeLanguages(value: unknown): LanguageEntry[] | null {
  const list = toEntryList(value)
  if (!list) return null
  const out: LanguageEntry[] = []
  for (const entry of list) {
    if (isPlainObject(entry)) out.push(entry as unknown as LanguageEntry)
    else if (typeof entry === 'string' && entry.trim())
      out.push({ name: entry.trim(), proficiency: '' })
  }
  return out
}

export function normalizeCustomSections(value: unknown): CustomSection[] | null {
  const list = toEntryList(value)
  if (!list) return null
  return list.filter(isPlainObject).map((section) => {
    const entries = (toEntryList(section.entries) ?? [])
      .filter(isPlainObject)
      .map((entry) => {
        const out = { ...entry }
        if ('bullets' in out) out.bullets = toStringArray(out.bullets, 'lines')
        return out as unknown as CustomEntry
      })
    return {
      ...section,
      title: typeof section.title === 'string' ? section.title : '',
      entries,
    }
  })
}

// ---------------------------------------------------------------------------
// AI write boundary
// ---------------------------------------------------------------------------

type SectionNormalizer = (value: unknown) => unknown[] | null

const SECTION_NORMALIZERS: Record<string, SectionNormalizer> = {
  experience: normalizeExperience,
  education: normalizeEducation,
  skills: normalizeSkills,
  languages: normalizeLanguages,
  projects: normalizeProjects,
  certifications: normalizeCertifications,
  customSections: normalizeCustomSections,
}

/** Shown to the model when a write is rejected, so it can fix and retry. */
const SECTION_SHAPES: Record<string, string> = {
  experience:
    '[{"company":string,"role":string,"startDate":string,"endDate":string,"bullets":string[]}]',
  education:
    '[{"institution":string,"degree":string,"field":string,"startDate":string,"endDate":string,"gpa":string}]',
  skills: '[{"category":string,"items":string[]}] — items MUST be an array, never a joined string',
  languages: '[{"name":string,"proficiency":string}]',
  projects: '[{"name":string,"description":string,"url":string,"bullets":string[]}]',
  certifications: '[{"name":string,"issuer":string,"date":string}]',
  customSections:
    '[{"title":string,"entries":[{"primary":string,"secondary":string,"date":string,"bullets":string[]}]}]',
}

export type NormalizeWriteResult =
  | { ok: true; params: Record<string, unknown> }
  | { ok: false; error: string }

function shapeError(column: string): NormalizeWriteResult {
  return {
    ok: false,
    error:
      `Invalid shape for column "${column}". Expected a JSON string encoding ` +
      `${SECTION_SHAPES[column] ?? 'the documented shape'}. ` +
      `Rebuild the full column value in that shape and retry the write.`,
  }
}

/**
 * Guard for agent-driven records.create / records.update on `resumes`.
 * Coerces near-miss section shapes to canonical form (and JSON-encodes raw
 * arrays/objects the model forgot to stringify); rejects unrecognizable
 * values with an error message the model can self-correct from. Runs before
 * the write reaches the DO, so stored rows always match the shapes the form
 * and the LaTeX generators consume.
 */
export function normalizeResumeWrite(
  toolName: string,
  params: Record<string, unknown>,
): NormalizeWriteResult {
  if (toolName !== 'records.update' && toolName !== 'records.create') return { ok: true, params }
  if (params.collection !== 'resumes') return { ok: true, params }
  const data = params.data
  if (!isPlainObject(data)) return { ok: true, params }

  const out: Record<string, unknown> = { ...data }

  for (const [key, normalize] of Object.entries(SECTION_NORMALIZERS)) {
    if (!(key in out)) continue
    const raw = out[key]
    if (raw == null || raw === '') continue

    let parsed: unknown = raw
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw)
      } catch {
        return shapeError(key)
      }
    }
    const normalized = normalize(parsed)
    if (normalized === null) return shapeError(key)
    out[key] = JSON.stringify(normalized)
  }

  if ('personalInfo' in out && out.personalInfo != null && out.personalInfo !== '') {
    let parsed: unknown = out.personalInfo
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        return {
          ok: false,
          error:
            'Invalid shape for column "personalInfo". Expected a JSON string encoding an ' +
            'object like {"name":string,"title":string,"email":string,...}. Retry the write.',
        }
      }
    }
    if (!isPlainObject(parsed)) {
      return {
        ok: false,
        error:
          'Invalid shape for column "personalInfo". Expected a JSON string encoding a plain ' +
          'object of string fields. Retry the write.',
      }
    }
    out.personalInfo = JSON.stringify(parsed)
  }

  if ('summary' in out && out.summary != null && typeof out.summary !== 'string') {
    return {
      ok: false,
      error: 'Invalid shape for column "summary". Expected a plain string. Retry the write.',
    }
  }

  return { ok: true, params: { ...params, data: out } }
}
