/**
 * App Worker — Hono-based Cloudflare Worker for DeepSpace apps.
 *
 * Each app owns its RecordRoom DOs. Schemas are baked in at deploy time.
 *
 * Handles:
 *   - WebSocket → app's own RecordRoom DO (real-time data)
 *   - Auth proxy → auth-worker (same-origin cookies)
 *   - Integration proxy → api-worker (LLM, search, etc.)
 *   - AI chat (Vercel AI SDK + DeepSpace proxy)
 *   - Server actions (app-defined, bypass user RBAC)
 *   - Scoped R2 file storage
 *   - Static asset serving with SPA fallback
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  verifyJwt,
  createDeepSpaceAI,
} from 'deepspace/worker'
import type { JwtVerifierConfig, VerifyResult } from 'deepspace/worker'
import {
  RecordRoom as RecordRoomBase,
  YjsRoom as YjsRoomBase,
  CanvasRoom as CanvasRoomBase,
  PresenceRoom as PresenceRoomBase,
} from 'deepspace/worker'
import type { ActionTools, ActionResult, DOManifest, DOBindings } from 'deepspace/worker'
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai'
import { actions } from './src/actions/index.js'
import { schemas } from './src/schemas.js'
import { integrations } from './src/integrations.js'
import { buildChatTools } from './src/ai/tools.js'
import { loadContext } from './src/ai/context.js'
import { buildResumeSystemPrompt } from './src/ai/resume-prompt.js'
import { resolveModel } from './src/ai/models.js'
import { normalizeResumeWrite } from './src/templates/normalize.js'
import { makeScopeId } from './src/constants.js'

// =============================================================================
// DO Manifest — declares all Durable Objects for dynamic deploy bindings
// =============================================================================

export const __DO_MANIFEST__ = [
  { binding: 'RECORD_ROOMS', className: 'RecordRoom', sqlite: true },
  { binding: 'YJS_ROOMS', className: 'YjsRoom', sqlite: true },
  { binding: 'CANVAS_ROOMS', className: 'CanvasRoom', sqlite: true },
  { binding: 'PRESENCE_ROOMS', className: 'PresenceRoom', sqlite: true },
] as const satisfies DOManifest

// =============================================================================
// Durable Objects — extend to customize behavior
// =============================================================================

export class RecordRoom extends RecordRoomBase {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, schemas, { ownerUserId: env.OWNER_USER_ID })
  }
}

export class YjsRoom extends YjsRoomBase {}
export class CanvasRoom extends CanvasRoomBase {}
export class PresenceRoom extends PresenceRoomBase {}

// =============================================================================
// Types
// =============================================================================

interface Env extends DOBindings<typeof __DO_MANIFEST__> {
  ASSETS: Fetcher
  PLATFORM_WORKER: Fetcher
  APP_IDENTITY_TOKEN: string
  API_WORKER: Fetcher
  AUTH_JWT_PUBLIC_KEY: string
  AUTH_JWT_ISSUER: string
  AUTH_WORKER_URL: string
  APP_NAME: string
  OWNER_USER_ID: string
  /**
   * Long-lived JWT minted for the app owner at deploy time. Server-side
   * code (actions, cron, AI helpers) uses this to authenticate to the
   * api-worker for developer-billed calls — the owner is billed because
   * they are the JWT subject.
   */
  APP_OWNER_JWT: string
}

type AppContext = { Bindings: Env }

// =============================================================================
// App
// =============================================================================

const app = new Hono<AppContext>()
app.use('/api/*', cors())

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function jwtConfig(env: Env): JwtVerifierConfig {
  return { publicKey: env.AUTH_JWT_PUBLIC_KEY, issuer: env.AUTH_JWT_ISSUER }
}

async function resolveAuth(
  req: Request,
  env: Env,
): Promise<{ result: VerifyResult; token: string } | null> {
  const header = req.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { result } = await verifyJwt(jwtConfig(env), token)
  if (!result) return null
  return { result, token }
}

// ---------------------------------------------------------------------------
// Social OAuth redirect + code exchange
// ---------------------------------------------------------------------------

app.get('/api/auth/social-redirect', (c) => {
  const provider = c.req.query('provider')
  if (!provider) return c.json({ error: 'Missing provider' }, 400)

  const appOrigin = new URL(c.req.url).origin
  const authOrigin = new URL(c.env.AUTH_WORKER_URL).origin

  return c.redirect(
    `${authOrigin}/login/social?provider=${encodeURIComponent(provider)}&returnTo=${encodeURIComponent(appOrigin)}`,
  )
})

app.get('/api/auth/oauth-complete', async (c) => {
  const code = c.req.query('code')
  const appOrigin = new URL(c.req.url).origin

  if (!code) return c.redirect(appOrigin)

  const res = await fetch(`${c.env.AUTH_WORKER_URL}/api/auth/exchange-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) return c.redirect(appOrigin)
  const data = (await res.json()) as { sessionToken?: string }
  if (!data.sessionToken) return c.redirect(appOrigin)
  const sessionToken = data.sessionToken

  return new Response(null, {
    status: 302,
    headers: {
      Location: appOrigin,
      'Set-Cookie': `__Secure-better-auth.session_token=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    },
  })
})

// ---------------------------------------------------------------------------
// Auth proxy → auth-worker (same-origin cookies)
// ---------------------------------------------------------------------------

app.all('/api/auth/*', async (c) => {
  const url = new URL(c.req.url)
  const authUrl = new URL(url.pathname + url.search, c.env.AUTH_WORKER_URL)
  const res = await fetch(authUrl.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
  })
  const headers = new Headers(res.headers)
  const setCookie = headers.get('set-cookie')
  if (setCookie) {
    headers.set('set-cookie', setCookie.replace(/;\s*Domain=[^;]*/gi, ''))
  }
  return new Response(res.body, { status: res.status, headers })
})

// ---------------------------------------------------------------------------
// Integrations proxy → api-worker
// ---------------------------------------------------------------------------

app.get('/api/integrations', async (c) => {
  try {
    const res = await c.env.API_WORKER.fetch('https://api-worker/api/integrations')
    return new Response(res.body, { status: res.status, headers: res.headers })
  } catch {
    return c.json({ error: 'Failed to fetch integration catalog' }, 502)
  }
})

app.all('/api/integrations/:name/:endpoint', async (c) => {
  const integrationName = c.req.param('name')
  // Default to 'user' (caller pays) so an integration that nobody remembered
  // to register in src/integrations.ts can't silently bill the developer.
  // Explicitly set `billing: 'developer'` in src/integrations.ts for the few
  // surfaces that should run on the owner's tab (none today).
  const billingMode = integrations[integrationName]?.billing ?? 'user'

  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth && billingMode === 'user') {
    return c.json({ error: 'Sign in required for this integration' }, 401)
  }

  const target = `/api/integrations/${integrationName}/${c.req.param('endpoint')}`

  const headers: Record<string, string> = {
    'Content-Type': c.req.header('Content-Type') ?? 'application/json',
  }

  // Pick the JWT whose subject is the user we want billed:
  //   - developer-billed → the app owner (via APP_OWNER_JWT)
  //   - user-billed      → the caller (forward their Bearer token)
  // The api-worker bills the JWT subject; it does not accept any
  // client-supplied billing override.
  if (billingMode === 'developer') {
    headers['Authorization'] = `Bearer ${c.env.APP_OWNER_JWT}`
  } else if (auth) {
    // `resolveAuth` already verified the bearer token above.
    headers['Authorization'] = `Bearer ${auth.token}`
  }

  const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD'
  const body = hasBody ? await c.req.text() : undefined

  try {
    const res = await c.env.API_WORKER.fetch(`https://api-worker${target}`, {
      method: c.req.method,
      headers,
      body,
    })
    return new Response(res.body, { status: res.status, headers: res.headers })
  } catch {
    return c.json({ error: 'Integration proxy failed' }, 502)
  }
})

// ---------------------------------------------------------------------------
// WebSocket routes
// ---------------------------------------------------------------------------

function wsRoute(
  doNamespace: (env: Env) => DurableObjectNamespace,
  extraParams?: (auth: VerifyResult) => Record<string, string>,
) {
  return async (c: any) => {
    const id = c.req.param('roomId') ?? c.req.param('docId') ?? c.req.param('scopeId')
    const url = new URL(c.req.url)
    const token = url.searchParams.get('token')
    const auth = token ? (await verifyJwt(jwtConfig(c.env), token)).result : null

    const doUrl = new URL(c.req.url)
    if (auth) {
      doUrl.searchParams.set('userId', auth.userId)
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams(auth))) {
          doUrl.searchParams.set(k, v)
        }
      }
    }
    doUrl.searchParams.delete('token')

    const ns = doNamespace(c.env)
    const stub = ns.get(ns.idFromName(id))
    return stub.fetch(new Request(doUrl.toString(), c.req.raw))
  }
}

app.get('/ws/:roomId', wsRoute((env) => env.RECORD_ROOMS))

app.get('/ws/yjs/:docId', wsRoute((env) => env.YJS_ROOMS, () => ({ role: 'member' })))

app.get('/ws/canvas/:docId', wsRoute((env) => env.CANVAS_ROOMS, () => ({ role: 'member' })))

app.get('/ws/presence/:scopeId', wsRoute(
  (env) => env.PRESENCE_ROOMS,
  (auth) => ({
    ...(auth.claims.name ? { userName: auth.claims.name } : {}),
    ...(auth.claims.email ? { userEmail: auth.claims.email } : {}),
    ...(auth.claims.image ? { userImageUrl: auth.claims.image } : {}),
  }),
))

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

app.post('/api/actions/:name', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  const name = c.req.param('name')
  const action = actions[name]
  if (!action) return c.json({ error: 'Action not found' }, 404)
  let params: Record<string, unknown>
  try {
    params = await c.req.json<Record<string, unknown>>()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const tools = createActionTools(c.env, auth.result.userId, auth.token)
  const result = await action({
    userId: auth.result.userId,
    params,
    tools,
    env: c.env as unknown as Record<string, unknown>,
    callerJwt: auth.token,
  })
  return c.json(result as unknown as Record<string, unknown>)
})

// ---------------------------------------------------------------------------
// AI chat — multi-turn tool-use via Vercel AI SDK + DeepSpace proxy
// ---------------------------------------------------------------------------

/**
 * Max bytes of a single tool invocation's result we'll hand back to the
 * model. A records.query with no filter can return hundreds of KB; feeding
 * that into the next step's prompt destroys the context budget and slows
 * every subsequent turn. When exceeded we return a truncation marker with
 * guidance to narrow the query.
 */
const TOOL_RESULT_BYTE_CAP = 30_000

function capToolResultSize(result: unknown): unknown {
  let serialized: string
  try {
    serialized = JSON.stringify(result)
  } catch {
    return { success: false, error: 'Tool result could not be serialized.' }
  }
  if (serialized.length <= TOOL_RESULT_BYTE_CAP) return result
  return {
    success: false,
    truncated: true,
    error:
      `Tool result exceeded ${TOOL_RESULT_BYTE_CAP} bytes (was ${serialized.length}). ` +
      `Retry with a narrower query (e.g. add a \`where\` filter, reduce \`limit\`, ` +
      `or call records.get for a single record).`,
    preview: serialized.slice(0, 2_000),
  }
}

/**
 * Override-mode guard. The agent must never toggle `latexOverrideMode` —
 * the user confirms that via UI modals. Strip the key from any
 * records.update or records.create on the `resumes` collection before it
 * reaches the DO. Cheap, and closes the loophole even if the prompt is
 * ignored.
 */
function stripOverrideToggle(
  toolName: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName !== 'records.update' && toolName !== 'records.create') return params
  if (params.collection !== 'resumes') return params
  const data = params.data as Record<string, unknown> | undefined
  if (!data || !('latexOverrideMode' in data)) return params
  const { latexOverrideMode: _stripped, ...rest } = data
  return { ...params, data: rest }
}

/**
 * Stamp `updatedAt: Date.now()` on every agent-driven records.update /
 * records.create. The editor's form-state useEffect re-syncs from storage
 * only when `data.updatedAt` moves forward, so without this stamp the
 * agent's writes land in the DB but the user must reload to see them.
 *
 * User writes already do this client-side in `useResumes.updateResume`;
 * this closes the same loop for the agent path so the user never has to
 * wonder whether an AI edit actually took effect. Deterministic — does
 * not depend on the LLM following a system-prompt instruction.
 */
function stampUpdatedAt(
  toolName: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName !== 'records.update' && toolName !== 'records.create') return params
  const collection = params.collection
  // Only collections whose schemas declare an `updatedAt` field. Stamping
  // on schemas without that column would be silently dropped by the DO
  // anyway, but explicit is clearer than implicit.
  if (collection !== 'resumes' && collection !== 'profiles') return params
  const data = (params.data ?? {}) as Record<string, unknown>
  return { ...params, data: { ...data, updatedAt: Date.now() } }
}

app.post('/api/ai/chat', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  // Client sends the active resume id from the URL (`/editor/:resumeId`) so
  // the worker can inject the relevant resume state into the system prompt.
  // If missing we fall back to the user's editorSettings record (see
  // loadContext). modelId is validated against the catalog.
  let body: {
    messages: UIMessage[]
    activeResumeId?: string | null
    modelId?: string | null
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const { messages: rawMessages, activeResumeId, modelId } = body

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return c.json({ error: 'messages array is required' }, 400)
  }

  // Never pass a raw client string to the provider — could be malicious or
  // unknown. resolveModel maps to the default when the id is bad.
  const resolvedModel = resolveModel(modelId)

  // Load the active resume under the caller's RBAC. Fresh per turn — no
  // caching; the user may have edited between requests.
  const context = await loadContext(
    c.env,
    auth.result.userId,
    typeof activeResumeId === 'string' && activeResumeId ? activeResumeId : null,
  )

  // All three DeepSpace AI providers route through the proxy and bill the
  // JWT subject, so passing the caller's token here bills the user.
  const providerFactory = createDeepSpaceAI(c.env, resolvedModel.provider, { authToken: auth.token })

  // Tools execute against the app's RecordRoom DO. Scope matches the
  // frontend's <RecordScope roomId={SCOPE_ID}> so agent-created records
  // show up in the user's live useQuery subscriptions.
  const scopeId = makeScopeId(c.env.APP_NAME)
  const callerUserId = auth.result.userId

  async function execTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    const doId = c.env.RECORD_ROOMS.idFromName(scopeId)
    const stub = c.env.RECORD_ROOMS.get(doId)
    try {
      // SDK 0.3.x contract: caller userId goes in the `X-User-Id` HEADER, not
      // the body. The DO uses it to resolve the caller's role for RBAC; if
      // missing, the call is treated as anonymous (no resumes visible).
      const res = await stub.fetch(new Request('https://internal/api/tools/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': callerUserId,
        },
        body: JSON.stringify({ tool: toolName, params }),
        // Forward the route's AbortSignal so an in-flight tool fetch cancels
        // when the client disconnects mid-stream.
        signal: c.req.raw.signal,
      }))
      return await res.json()
    } catch (err) {
      // Surface a structured error to the agent rather than letting the
      // tool throw — otherwise the AI SDK wraps it in an opaque tool-error
      // with no server-side log.
      console.error('[ai-chat] tool transport failed:', toolName, err)
      return {
        success: false,
        error: `Tool transport failed (${toolName}). Retry or ask the user to reload.`,
      }
    }
  }

  const tools = buildChatTools(async (toolName, params) => {
    // Shape-check section columns before anything is stored: coerce
    // unambiguous near-misses, bounce the rest back to the model with an
    // actionable error. Keeps stored rows matching the shapes the form and
    // LaTeX generators consume regardless of what the model emits.
    const shaped = normalizeResumeWrite(toolName, stripOverrideToggle(toolName, params))
    if (!shaped.ok) return { success: false, error: shaped.error }
    const guarded = stampUpdatedAt(toolName, shaped.params)
    const payload = await execTool(toolName, guarded)
    return capToolResultSize(payload)
  })

  // AI SDK v5: convert the UIMessage[] wire format from useChat into the
  // ModelMessage[] shape streamText consumes (splits assistant tool-call
  // and tool-result parts into the paired messages providers expect).
  const modelMessages = convertToModelMessages(rawMessages)

  const result = streamText({
    model: providerFactory(resolvedModel.id),
    system: buildResumeSystemPrompt(context),
    messages: modelMessages,
    tools,
    // A rich context means most turns resolve in 1–3 tool calls; the ceiling
    // stays generous for legitimate multi-step edits. v5 expresses
    // "stop after N steps" as a `stopWhen` predicate.
    stopWhen: stepCountIs(20),
    // Cancel the upstream provider call when the HTTP client disconnects
    // (tab close, navigation, or explicit `stop()` from useChat).
    abortSignal: c.req.raw.signal,
    onError: ({ error }) => {
      console.error('[ai-chat] streamText error:', error)
    },
  })

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    onError: (error: unknown): string => {
      console.error('[ai-chat] response error:', error)
      return error instanceof Error ? error.message : String(error)
    },
  })
})

// ---------------------------------------------------------------------------
// Scoped R2 files → platform-worker
// ---------------------------------------------------------------------------

app.all('/api/files/*', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  const userId = auth?.result.userId ?? null

  const url = new URL(c.req.url)
  const platformUrl = new URL(c.req.url)
  platformUrl.pathname = url.pathname.replace('/api/files', '/internal/files')

  const headers = new Headers(c.req.raw.headers)
  headers.set('x-app-identity-token', c.env.APP_IDENTITY_TOKEN)
  headers.set('x-app-name', c.env.APP_NAME)
  if (userId) headers.set('x-user-id', userId)

  const resp = await c.env.PLATFORM_WORKER.fetch(
    new Request(platformUrl.toString(), {
      method: c.req.method,
      headers,
      body: c.req.raw.body,
    }),
  )

  // Rewrite URLs in JSON responses to use the app's origin
  const contentType = resp.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = (await resp.json()) as Record<string, unknown>
    const rewriteUrl = (u: string) => u.replace(/^https?:\/\/[^/]+/, url.origin)
    if (typeof body.url === 'string') body.url = rewriteUrl(body.url)
    if (Array.isArray(body.files)) {
      for (const f of body.files as Array<Record<string, unknown>>) {
        if (typeof f.url === 'string') f.url = rewriteUrl(f.url)
      }
    }
    return c.json(body, resp.status as any)
  }

  return new Response(resp.body, { status: resp.status, headers: resp.headers })
})

// ---------------------------------------------------------------------------
// Static assets (SPA fallback)
// ---------------------------------------------------------------------------

app.get('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw)
  if (response.status === 404) {
    const url = new URL(c.req.url)
    url.pathname = '/index.html'
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw))
  }
  return response
})

// =============================================================================
// Action Tools — route to app's own RecordRoom DO
// =============================================================================

function createActionTools(env: Env, userId: string, callerJwt: string): ActionTools {
  const scopeId = makeScopeId(env.APP_NAME)

  async function execTool<T = unknown>(tool: string, params: Record<string, unknown>): Promise<ActionResult<T>> {
    const doId = env.RECORD_ROOMS.idFromName(scopeId)
    const stub = env.RECORD_ROOMS.get(doId)
    // SDK 0.3.x contract: caller userId goes in the `X-User-Id` header.
    // `X-App-Action: true` (header, not query string) tells the DO to
    // bypass user RBAC so server-actions run with the owner's privileges.
    const res = await stub.fetch(new Request('https://internal/api/tools/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-App-Action': 'true',
      },
      body: JSON.stringify({ tool, params }),
    }))
    return res.json() as Promise<ActionResult<T>>
  }

  async function callIntegration<T>(endpoint: string, data?: unknown): Promise<ActionResult<T>> {
    const integrationName = endpoint.split('/')[0]
    // Same safe default as the HTTP proxy above — unregistered → user pays.
    const billingMode = integrations[integrationName]?.billing ?? 'user'

    // Use the owner JWT for developer-billed calls, the caller's JWT otherwise.
    // The api-worker bills the JWT subject — no client-supplied override.
    const jwt = billingMode === 'developer' ? env.APP_OWNER_JWT : callerJwt

    const res = await env.API_WORKER.fetch(`https://api-worker/api/integrations/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: data != null ? JSON.stringify(data) : undefined,
    })
    return res.json() as Promise<ActionResult<T>>
  }

  return {
    create: (collection, data, recordId) =>
      execTool('records.create', recordId != null ? { collection, data, recordId } : { collection, data }),
    update: (collection, recordId, data) =>
      execTool('records.update', { collection, recordId, data }),
    remove: (collection, recordId) => execTool('records.delete', { collection, recordId }),
    get: (collection, recordId) => execTool('records.get', { collection, recordId }),
    query: (collection, options) => execTool('records.query', { collection, ...(options ?? {}) }),
    integration: callIntegration,
    registerUser: (opts) =>
      execTool('users.register', {
        userId: opts.userId ?? userId,
        name: opts.name,
        email: opts.email,
        imageUrl: opts.imageUrl,
        isAdmin: opts.isAdmin === true,
      }),
  }
}

export default app
