// Models for the AI resume assistant.
//
// Anything added here must be BOTH served by its provider and priced by the
// DeepSpace proxy: an id missing from the proxy's CHAT_MODEL_MULTIPLIERS bills
// at the '*' fallback of 5.0x. That is why claude-opus-5 is absent despite
// being current — it would bill $75/MTok against a real $25. Never add a date
// suffix to a Claude id; dated ids are snapshots and get retired. resolveModel
// falls back to the default rather than trusting a client-supplied id.

export type ChatModelProvider = 'anthropic' | 'openai' | 'cerebras'

export interface ChatModel {
    id: string
    label: string
    provider: ChatModelProvider
    hint?: string
}

export const CHAT_MODELS: ReadonlyArray<ChatModel> = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', hint: 'Balanced · default' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic', hint: 'Newest · reasons before answering' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', provider: 'anthropic', hint: 'Most capable' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', hint: 'Fast' },

  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai', hint: 'Capable' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', hint: 'Multimodal' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai', hint: 'Efficient' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', hint: 'Cheap' },

  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', provider: 'cerebras', hint: 'Very fast' },
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', provider: 'cerebras', hint: 'Open, fast' },
  { id: 'llama3.1-8b', label: 'Llama 3.1 8B', provider: 'cerebras', hint: 'Fastest' },
] as const

export const DEFAULT_MODEL_ID = CHAT_MODELS[0].id

export const DOCUMENT_EXTRACTION_MODEL_ID = 'claude-sonnet-4-6'

export const TEXT_ASSIST_MODEL_ID = 'gpt-4o-mini'

export function resolveModel(input: string | null | undefined): ChatModel {
  if (!input) return CHAT_MODELS[0]
  return CHAT_MODELS.find((m) => m.id === input) ?? CHAT_MODELS[0]
}
