/**
 * Context loader for the AI chat.
 *
 * Runs server-side on every /api/ai/chat request. Queries the app's own
 * RecordRoom DO for the caller's active resume under their RBAC and passes
 * the result to `buildResumeSystemPrompt`. Fresh per turn — no caching.
 *
 * The client sends `activeResumeId` in the request body (it comes from the
 * URL: `/editor/:resumeId`). If missing, we fall back to reading the user's
 * `editorSettings.activeResumeId` record. If both are empty, the prompt
 * reflects "no active resume" and the assistant will ask the user.
 */

import { makeScopeId } from '../constants'

export interface ResumeContextRecord {
  recordId: string
  title: string
  templateId: string
  latexOverrideMode: boolean
  /** Only present when `latexOverrideMode === true`. */
  latexSource?: string
  /** Human-readable section summary for the prompt (not full content). */
  sectionSummary: string
  jobDescription?: string
  sourceProfileId?: string
  lastCompiledAt?: number
}

export interface ChatContext {
  activeResumeId: string | null
  resume?: ResumeContextRecord
  /**
   * Set when the resumes query failed (e.g. RBAC rejection, transient DO
   * error). When set, `resume` is undefined and the prompt must block
   * mutations so the agent doesn't clobber content it can't see.
   */
  resumesLoadError?: string
}

export interface ContextLoaderEnv {
  APP_NAME: string
  RECORD_ROOMS: DurableObjectNamespace
}

/**
 * Invoke the RecordRoom DO's tool-execute endpoint under the caller's userId
 * so RBAC is enforced. Mirrors the chat tool executor — same transport, same
 * auth model, same bug surface.
 */
async function callTool(
  env: ContextLoaderEnv,
  userId: string,
  tool: string,
  params: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const doId = env.RECORD_ROOMS.idFromName(makeScopeId(env.APP_NAME))
  const stub = env.RECORD_ROOMS.get(doId)
  const res = await stub.fetch(new Request('https://internal/api/tools/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params, userId }),
  }))
  return res.json() as Promise<{ success: boolean; data?: unknown; error?: string }>
}

interface ResumeRecord {
  recordId: string
  data: Record<string, unknown>
}

interface EditorSettingsRecord {
  recordId: string
  createdBy?: string
  data: { activeResumeId?: string | null }
}

export async function loadContext(
  env: ContextLoaderEnv,
  userId: string,
  hintedResumeId: string | null,
): Promise<ChatContext> {
  // Resolve the active resume id: explicit hint from the URL wins; otherwise
  // fall back to the user's editorSettings record.
  let activeResumeId = hintedResumeId
  if (!activeResumeId) {
    const settingsRes = await callTool(env, userId, 'records.query', {
      collection: 'editorSettings',
      limit: 10,
    })
    const settings = extractRecords<EditorSettingsRecord>(settingsRes)
    // Only trust the caller's OWN record — picking settings[0] could have
    // leaked another user's activeResumeId into the agent's prompt.
    const own = settings.find((s) => s.createdBy === userId)
    const candidate = own?.data.activeResumeId
    activeResumeId = typeof candidate === 'string' && candidate ? candidate : null
  }

  if (!activeResumeId) {
    return { activeResumeId: null }
  }

  // Look up the resume by id. Using `records.query` with a where-filter
  // instead of `records.get` so we surface a clean "RBAC rejection" signal
  // (empty result set) rather than a 404 we'd have to disambiguate.
  const resumesRes = await callTool(env, userId, 'records.query', {
    collection: 'resumes',
    where: { recordId: activeResumeId },
    limit: 1,
  })

  if (!resumesRes.success) {
    return {
      activeResumeId,
      resumesLoadError: resumesRes.error || 'resumes query failed',
    }
  }

  const records = extractRecords<ResumeRecord>(resumesRes)
  const match = records[0]
  if (!match) {
    // Query succeeded but nothing came back — the id either doesn't exist
    // or is outside the caller's RBAC scope. Either way: no active resume.
    return { activeResumeId }
  }

  return {
    activeResumeId,
    resume: summarizeResume(match),
  }
}

// ---------------------------------------------------------------------------

const MAX_LATEX_BYTES = 60_000
const TRUNC_HEAD_BYTES = 40_000
const TRUNC_TAIL_BYTES = 10_000

function summarizeResume(record: ResumeRecord): ResumeContextRecord {
  const d = record.data
  const latexOverrideMode = coerceBool(d.latexOverrideMode)
  const rawLatex = typeof d.latexSource === 'string' ? d.latexSource : ''
  const latexSource = latexOverrideMode ? truncate(rawLatex) : undefined

  return {
    recordId: record.recordId,
    title: typeof d.title === 'string' ? d.title : '(untitled)',
    templateId: typeof d.templateId === 'string' ? d.templateId : 'modern',
    latexOverrideMode,
    latexSource,
    sectionSummary: buildSectionSummary(d),
    jobDescription: typeof d.jobDescription === 'string' && d.jobDescription
      ? d.jobDescription
      : undefined,
    sourceProfileId: typeof d.sourceProfileId === 'string' && d.sourceProfileId
      ? d.sourceProfileId
      : undefined,
    lastCompiledAt: typeof d.lastCompiledAt === 'number' && d.lastCompiledAt > 0
      ? d.lastCompiledAt
      : undefined,
  }
}

function buildSectionSummary(d: Record<string, unknown>): string {
  // Resume sections are stored as JSON strings (arrays of objects, or a
  // scalar for `summary`). Give the agent a quick heuristic — counts for
  // array-shaped fields, length for string-shaped ones — rather than the
  // full content, which it can fetch via records.get on demand.
  const parts: string[] = []
  parts.push(`personalInfo: ${summarizeField(d.personalInfo, 'object')}`)
  parts.push(`summary: ${summarizeField(d.summary, 'string')}`)
  parts.push(`experience: ${summarizeField(d.experience, 'array')}`)
  parts.push(`education: ${summarizeField(d.education, 'array')}`)
  parts.push(`skills: ${summarizeField(d.skills, 'array')}`)
  parts.push(`languages: ${summarizeField(d.languages, 'array')}`)
  parts.push(`projects: ${summarizeField(d.projects, 'array')}`)
  parts.push(`certifications: ${summarizeField(d.certifications, 'array')}`)
  parts.push(`customSections: ${summarizeField(d.customSections, 'array')}`)
  return parts.join('\n  ')
}

function summarizeField(value: unknown, kind: 'string' | 'array' | 'object'): string {
  if (typeof value !== 'string' || value.length === 0) return 'empty'
  if (kind === 'string') return `${value.length} chars`
  try {
    const parsed = JSON.parse(value)
    if (kind === 'array') {
      return Array.isArray(parsed) ? `${parsed.length} entries` : 'invalid (not array)'
    }
    if (kind === 'object' && parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed as object).filter((k) => {
        const v = (parsed as Record<string, unknown>)[k]
        return v !== '' && v !== null && v !== undefined
      })
      return keys.length === 0 ? 'empty' : `${keys.length} fields (${keys.join(', ')})`
    }
    return 'invalid'
  } catch {
    return 'invalid JSON'
  }
}

function truncate(content: string): string {
  if (content.length <= MAX_LATEX_BYTES) return content
  const head = content.slice(0, TRUNC_HEAD_BYTES)
  const tail = content.slice(content.length - TRUNC_TAIL_BYTES)
  return `${head}\n\n…[truncated ${content.length - TRUNC_HEAD_BYTES - TRUNC_TAIL_BYTES} bytes — call records_get on the resume for the full latexSource]…\n\n${tail}`
}

function extractRecords<T>(res: { success: boolean; data?: unknown }): T[] {
  if (!res.success || !res.data) return []
  const data = res.data as { records?: T[] }
  return Array.isArray(data.records) ? data.records : []
}

function coerceBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value === 'true' || value === '1'
  return false
}
