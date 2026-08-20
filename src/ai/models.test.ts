/**
 * Guards against the class of bug that broke resume upload in production:
 * a model id that the provider has retired, sitting in the code as a literal
 * until a user hits it.
 *
 *   Anthropic API error 404: {"type":"error","error":{"type":"not_found_error",
 *   "message":"model: claude-sonnet-4-20250514"}}
 *
 * The DeepSpace proxy cannot catch this for us. Both chat-completion
 * integrations declare `model: z.string()` and forward the value to the
 * provider untouched — the provider is the only authority on what is
 * servable. What the proxy *does* own is billing: a model with no row in its
 * pricing tables still runs but is charged at the worst-case fallback rate.
 *
 * So the accepted sets below are transcribed from the proxy's pricing tables
 * (deepspace-sdk @ origin/main, 2026-08-19):
 *
 *   platform/api-worker/src/routes/proxy-pricing.ts        -> TOKEN_PRICING
 *   platform/api-worker/src/integrations/anthropic/index.ts -> CHAT_MODEL_MULTIPLIERS
 *   platform/api-worker/src/integrations/openai/index.ts    -> CHAT_MODEL_MULTIPLIERS
 *
 * Only ids that are BOTH still served by the provider AND priced by the proxy
 * are listed. Notably absent: `claude-opus-5`. Anthropic serves it, but the
 * proxy has no pricing row, so it falls to the `'*'` multiplier (5.0 = $75 per
 * MTok) against a real rate of $25 — a silent 3x overcharge. Add it here only
 * once the proxy tables carry it.
 *
 * When this test fails after a provider release, re-read those three files
 * rather than editing the expectations from memory.
 */

import { describe, it, expect } from 'vitest'
import {
  CHAT_MODELS,
  DEFAULT_MODEL_ID,
  DOCUMENT_EXTRACTION_MODEL_ID,
  TEXT_ASSIST_MODEL_ID,
  resolveModel,
} from './models'

/** Priced by the proxy AND still served by the provider. */
const ACCEPTED_IDS: Record<string, ReadonlySet<string>> = {
  anthropic: new Set([
    'claude-fable-5',
    'claude-sonnet-5',
    'claude-opus-4-8',
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5',
  ]),
  openai: new Set([
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
  ]),
  cerebras: new Set([
    'gpt-oss-120b',
    'llama3.1-8b',
    'llama-3.3-70b',
    'qwen-3-32b',
    'qwen-3-235b-a22b-instruct-2507',
  ]),
}

describe('CHAT_MODELS catalog', () => {
  it.each(CHAT_MODELS.map((m) => [m.provider, m.id]))(
    '%s model "%s" is served by the provider and priced by the proxy',
    (provider, id) => {
      expect(ACCEPTED_IDS[provider]).toBeDefined()
      expect(ACCEPTED_IDS[provider].has(id)).toBe(true)
    },
  )

  it('carries no dated Claude snapshot suffixes', () => {
    // `claude-haiku-4-5-20251001` shipped here once. Current Claude ids are
    // complete without a date; a suffix is a snapshot that gets retired.
    const dated = CHAT_MODELS.filter((m) => /-\d{8}$/.test(m.id) || /-\d{4}-\d{2}-\d{2}$/.test(m.id))
    expect(dated.map((m) => m.id)).toEqual([])
  })

  it('has unique ids and a non-empty label for each', () => {
    const ids = CHAT_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of CHAT_MODELS) expect(m.label.trim()).not.toBe('')
  })
})

describe('purpose-named model constants', () => {
  it('DOCUMENT_EXTRACTION_MODEL_ID is an Anthropic model in the catalog', () => {
    // Anthropic-only: the PDF path sends a `document` content block, and the
    // proxy's OpenAI schema types `content` as a plain string.
    const entry = CHAT_MODELS.find((m) => m.id === DOCUMENT_EXTRACTION_MODEL_ID)
    expect(entry).toBeDefined()
    expect(entry?.provider).toBe('anthropic')
  })

  it('TEXT_ASSIST_MODEL_ID is an OpenAI model in the catalog', () => {
    const entry = CHAT_MODELS.find((m) => m.id === TEXT_ASSIST_MODEL_ID)
    expect(entry).toBeDefined()
    expect(entry?.provider).toBe('openai')
  })
})

describe('resolveModel', () => {
  it('defaults when the id is missing or unknown', () => {
    expect(resolveModel(null).id).toBe(DEFAULT_MODEL_ID)
    expect(resolveModel(undefined).id).toBe(DEFAULT_MODEL_ID)
    expect(resolveModel('').id).toBe(DEFAULT_MODEL_ID)
    expect(resolveModel('claude-sonnet-4-20250514').id).toBe(DEFAULT_MODEL_ID)
  })

  it('returns the requested model when the id is in the catalog', () => {
    for (const m of CHAT_MODELS) expect(resolveModel(m.id)).toEqual(m)
  })
})
