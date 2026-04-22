/**
 * AI Tool Definitions — converts DeepSpace BUILT_IN_TOOLS to Vercel AI SDK tools.
 *
 * `buildChatTools` is the only public factory. It exposes records.query/get +
 * records.create/update/delete so the in-editor chat can read and mutate the
 * user's own resumes. RBAC is enforced server-side against the caller's role.
 *
 * Tool names that contain a dot (e.g. `records.create`) are rewritten to
 * underscore form (`records_create`) for the AI SDK, which forbids dots in
 * tool names. The DO-side executor still receives the dotted form.
 */

import { tool, type Tool } from 'ai'
import { z } from 'zod'
import { BUILT_IN_TOOLS } from 'deepspace/worker'
import type { ToolSchema } from 'deepspace/worker'

type ToolExecutor = (toolName: string, params: Record<string, unknown>) => Promise<unknown>

const CHAT_TOOL_NAMES = [
  'records.query',
  'records.get',
  'records.create',
  'records.update',
  'records.delete',
]

export function buildChatTools(executor: ToolExecutor): Record<string, Tool> {
  const tools: Record<string, Tool> = {}
  for (const def of BUILT_IN_TOOLS) {
    if (!CHAT_TOOL_NAMES.includes(def.name)) continue
    const safeName = def.name.replaceAll('.', '_')
    tools[safeName] = tool({
      description: def.description,
      parameters: buildZodSchema(def),
      execute: async (params) => executor(def.name, params as Record<string, unknown>),
    })
  }
  return tools
}

// ============================================================================
// ToolSchema params → Zod object schema
// ============================================================================

function buildZodSchema(def: ToolSchema) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [name, param] of Object.entries(def.params)) {
    let s: z.ZodTypeAny
    switch (param.type) {
      case 'string':  s = z.string(); break
      case 'number':  s = z.number(); break
      case 'boolean': s = z.boolean(); break
      case 'object':  s = z.record(z.unknown()); break
      case 'array':   s = z.array(z.unknown()); break
      default:        s = z.unknown(); break
    }
    if (param.description) s = s.describe(param.description)
    if (!param.required) s = s.optional()
    shape[name] = s
  }

  return z.object(shape)
}
