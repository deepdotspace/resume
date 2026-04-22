/**
 * Chat model catalog — shared between client (picker) and worker (validation + provider routing).
 *
 * Every entry carries its DeepSpace AI provider so the worker knows which
 * factory to spin up. Model IDs must match the DeepSpace API proxy's pricing
 * table — an unknown id would fall back to a generic rate.
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
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', provider: 'anthropic', hint: 'Most capable' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', hint: 'Stable agent default' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic', hint: 'Fast' },

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
 * Look up a model by id. Returns the default when the input is null /
 * missing / unknown. Used server-side to prevent arbitrary strings reaching
 * the provider and client-side to sanitize a stale localStorage value.
 */
export function resolveModel(input: string | null | undefined): ChatModel {
  if (!input) return CHAT_MODELS[0]
  return CHAT_MODELS.find((m) => m.id === input) ?? CHAT_MODELS[0]
}
