/**
 * Chat model catalog — shared between client (picker) and worker (validation + provider routing).
 *
 * Every entry carries its DeepSpace AI provider so the worker knows which
 * factory to spin up.
 *
 * Two rules govern what may appear here, and both are enforced by
 * `models.test.ts`:
 *
 *  1. The id must be one the provider still serves. The DeepSpace proxy does
 *     NOT validate model ids — `platform/api-worker/src/integrations/anthropic`
 *     declares `model: z.string()` and forwards the string to the provider
 *     untouched, so a retired id surfaces as a raw provider 404. That is
 *     exactly how `claude-sonnet-4-20250514` broke resume upload.
 *  2. The id must have a row in the proxy's pricing tables — `TOKEN_PRICING`
 *     in `platform/api-worker/src/routes/proxy-pricing.ts` (the streaming
 *     `/api/proxy` path the chat panel uses) and `CHAT_MODEL_MULTIPLIERS` in
 *     each integration (the `integration.post` path). A model missing from
 *     those tables still runs, but bills at the worst-case fallback rate
 *     ($75/MTok on the Anthropic path), so the user is silently overcharged.
 *
 * Rule 2 is why `claude-opus-5` is absent below despite being a current
 * Anthropic model: it has no pricing row yet, so it would bill at 5x.
 *
 * Never append a date suffix to a Claude id — current ids are complete as-is.
 *
 * The first entry is the default when the client sends no id or an unknown one.
 */

export type ChatModelProvider = 'anthropic' | 'openai' | 'cerebras'

export interface ChatModel {
  /** Exact model id passed to the provider SDK. */
  id: string
  /** Short display label for the picker. */
  label: string
  /** Which `createDeepSpaceAI` provider to route through. */
  provider: ChatModelProvider
  /** One-line hint shown under the label. */
  hint?: string
}

export const CHAT_MODELS: ReadonlyArray<ChatModel> = [
  // ───── Anthropic ─────────────────────────────────────────────────────
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', hint: 'Balanced · default' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic', hint: 'Newest · reasons before answering' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', provider: 'anthropic', hint: 'Most capable' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', hint: 'Fast' },

  // ───── OpenAI ────────────────────────────────────────────────────────
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai', hint: 'Capable' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', hint: 'Multimodal' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai', hint: 'Efficient' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', hint: 'Cheap' },

  // ───── Cerebras (open-weight, very fast) ─────────────────────────────
  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', provider: 'cerebras', hint: 'Very fast' },
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', provider: 'cerebras', hint: 'Open, fast' },
  { id: 'llama3.1-8b', label: 'Llama 3.1 8B', provider: 'cerebras', hint: 'Fastest' },
] as const

export const DEFAULT_MODEL_ID = CHAT_MODELS[0].id

/**
 * Model for extracting a resume from an uploaded PDF, via
 * `anthropic/chat-completion` with a `document` content block. Anthropic-only:
 * the proxy's OpenAI chat-completion schema types `content` as a plain string,
 * so it cannot carry a PDF at all.
 *
 * Sonnet 4.6 rather than Sonnet 5 on purpose. Sonnet 5 reasons by default and
 * emits a `thinking` block before any text, which can consume the whole
 * `max_tokens` budget on a long resume — the proxy then fails the call with
 * `OutputBudgetExhaustedError` and the user sees a parse failure. Sonnet 4.6
 * only reasons when the request asks for it, so the entire budget is answer.
 */
export const DOCUMENT_EXTRACTION_MODEL_ID = 'claude-sonnet-4-6'

/**
 * Model for the short text jobs: DOCX resume parsing, per-section tailoring
 * to a job description, and inline field assist. All are small, structured
 * prompts where the cheapest capable model is the right call.
 */
export const TEXT_ASSIST_MODEL_ID = 'gpt-4o-mini'

/**
 * Look up a model by id. Returns the default when the input is null /
 * missing / unknown. Used server-side to prevent arbitrary strings reaching
 * the provider and client-side to sanitize a stale localStorage value.
 */
export function resolveModel(input: string | null | undefined): ChatModel {
  if (!input) return CHAT_MODELS[0]
  return CHAT_MODELS.find((m) => m.id === input) ?? CHAT_MODELS[0]
}
