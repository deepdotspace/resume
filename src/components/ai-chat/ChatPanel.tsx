/**
 * ChatPanel — the resume assistant conversation surface.
 *
 * Minimal mono-column with a ghost input. No bubbles. User messages sit
 * right, slightly heavier. Assistant text flows like reading. Tool calls
 * render inline with a live → done state. A pulsing "working" dot stays
 * on the streaming turn the whole time so there's never a "frozen bubble"
 * perception between tool calls.
 *
 * Behavioral contract:
 *   useChat({
 *     api: '/api/ai/chat',
 *     body: { activeResumeId, modelId },
 *     fetch: <bearer-wrapper>,
 *   })
 *
 * Messages reset on resumeId change via React key remount — no racy ref
 * swaps, no stale state across resumes. localStorage persists the
 * transcript per resume, debounced to coalesce bursty streaming writes.
 */

import { useState, useRef, useEffect, useMemo, type FormEvent, type KeyboardEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { useAuth, AuthOverlay, getAuthToken } from 'deepspace'
import { ArrowUp, AlertCircle, RefreshCw, Check, ChevronDown, Square } from 'lucide-react'
import type { Message } from '@ai-sdk/ui-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CHAT_MODELS, DEFAULT_MODEL_ID, type ChatModelProvider } from '../../ai/models'

// ============================================================================
// localStorage keys
// ============================================================================

const MESSAGES_KEY_PREFIX = 'resume-ai-chat:'
const MODEL_KEY = 'resume-ai-chat-model'

function loadModelId(): string {
  try {
    const v = localStorage.getItem(MODEL_KEY)
    if (v && CHAT_MODELS.some((m) => m.id === v)) return v
  } catch { /* ignore */ }
  return DEFAULT_MODEL_ID
}

function isPersistedMessage(m: unknown): m is Message {
  if (!m || typeof m !== 'object') return false
  const obj = m as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.role === 'string' &&
    (typeof obj.content === 'string' || obj.content === undefined)
  )
}

function loadPersistedMessages(resumeId: string): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY_PREFIX + resumeId)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Validate each element — malformed persisted entries (e.g. from a
    // schema change or manual tampering) would crash MessageRow otherwise.
    return parsed.filter(isPersistedMessage)
  } catch {
    return []
  }
}

interface ChatPanelProps {
  /** Active resume id — required. Messages are scoped per resume. */
  resumeId: string
  /**
   * Monotonic counter. Each bump opens the in-panel "Start a new chat?"
   * confirm banner. The actual reset happens only after the user confirms.
   * Initial value is ignored; only changes trigger the prompt.
   */
  resetRequestSignal?: number
}

export function ChatPanel({ resumeId, resetRequestSignal }: ChatPanelProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-content-tertiary text-xs">
        <span className="animate-pulse">…</span>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <>
        <div className="flex h-full items-center justify-center px-6">
          <div className="max-w-[260px] space-y-4 text-center">
            <p className="text-[15px] text-content leading-relaxed">
              Sign in to use the assistant.
            </p>
            <p className="text-[12px] text-content-tertiary leading-relaxed">
              It reads and edits your resume with your permissions.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-[12px] font-medium text-content hover:bg-surface-inset transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
        {showAuth && <AuthOverlay onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  // Key the Chat by resumeId so switching resumes unmounts/remounts with the
  // new resume's persisted transcript. "New chat" within the same resume is
  // handled in-place via `setMessages([])` — NOT a remount — because the
  // unmount-persist effect would otherwise write the old transcript back
  // under the same key and defeat the reset.
  return <Chat key={resumeId} resumeId={resumeId} resetRequestSignal={resetRequestSignal} />
}

// ============================================================================
// Chat — inner component. Keyed by resumeId so switching resumes gives a
// clean mount with fresh useChat state.
// ============================================================================

function Chat({
  resumeId,
  resetRequestSignal,
}: {
  resumeId: string
  resetRequestSignal?: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const [modelId, setModelId] = useState<string>(loadModelId)
  useEffect(() => {
    try { localStorage.setItem(MODEL_KEY, modelId) } catch { /* ignore */ }
  }, [modelId])

  // Lazy-init from localStorage. Because this component is keyed on resumeId
  // in its parent, a new mount always reads fresh storage.
  const initialMessages = useMemo(() => loadPersistedMessages(resumeId), [resumeId])

  const {
    messages,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/ai/chat',
    initialMessages,
    body: { activeResumeId: resumeId, modelId },
    fetch: async (url, init) => {
      const token = await getAuthToken()
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(url, { ...init, headers })
    },
  })

  // Reset-request watcher — bump from the parent opens the in-panel confirm
  // banner. Skip the prompt entirely (and just focus the input) when there's
  // nothing to clear.
  const prevResetSignalRef = useRef<number | undefined>(resetRequestSignal)
  useEffect(() => {
    if (resetRequestSignal === undefined) return
    if (prevResetSignalRef.current === resetRequestSignal) return
    prevResetSignalRef.current = resetRequestSignal
    if (messages.length === 0) {
      inputRef.current?.focus()
      return
    }
    setConfirmReset(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetRequestSignal])

  const performReset = () => {
    // Cancel any in-flight stream, clear the transcript in-place. The
    // debounced persist will write the empty array back to storage on its
    // next tick (250 ms); no manual `removeItem` needed. Doing this
    // in-place — NOT via a remount — avoids the unmount-persist effect
    // racing ahead and writing the old messages back under the same key.
    stop()
    setMessages([])
    setConfirmReset(false)
    inputRef.current?.focus()
  }

  // Persist transcript (debounced) + on unmount so we don't lose the final
  // delta. JSON.stringify of a long transcript on every streamed token is a
  // main-thread tax — 250ms coalesces the bursts.
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(MESSAGES_KEY_PREFIX + resumeId, JSON.stringify(messagesRef.current))
      } catch { /* storage full or disabled */ }
    }, 250)
    return () => clearTimeout(t)
  }, [messages, resumeId])
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(MESSAGES_KEY_PREFIX + resumeId, JSON.stringify(messagesRef.current))
      } catch { /* ignore */ }
    }
  }, [resumeId])

  // Smart auto-scroll: only stick to bottom if the user was already near it.
  // If they scrolled up to re-read something, don't yank them back on every
  // streamed token.
  const stickToBottomRef = useRef(true)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = gap < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Auto-grow textarea (cap ~200px). When empty, release inline height so
  // the native rows=1 + CSS default renders a true single-line box.
  // For non-empty content, defer to rAF so scrollHeight is read after the
  // current frame's layout commit (otherwise a freshly-opened panel can
  // latch an inflated height that sticks until the user types).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    if (!input) {
      el.style.height = ''
      return
    }
    const raf = requestAnimationFrame(() => {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    })
    return () => cancelAnimationFrame(raf)
  }, [input])

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as FormEvent<HTMLFormElement>)
      }
    }
  }

  const lastMessage = messages[messages.length - 1]
  const streamingAssistantId =
    isLoading && lastMessage?.role === 'assistant' ? lastMessage.id : null
  const waitingForAssistant = isLoading && lastMessage?.role === 'user'

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-5 py-6"
      >
        {messages.length === 0 ? (
          <EmptyState
            onSuggest={(text) => {
              setInput(text)
              inputRef.current?.focus()
            }}
          />
        ) : (
          <div
            className="flex flex-col gap-4"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Assistant conversation"
          >
            {messages.map((m, idx) => (
              <MessageRow
                key={m.id}
                message={m as Message}
                isStreaming={m.id === streamingAssistantId}
                showDivider={idx > 0}
              />
            ))}
            {waitingForAssistant && <PendingIndicator />}
          </div>
        )}
      </div>

      {/* "Start a new chat?" confirm — inline, above the composer. */}
      {confirmReset && (
        <div
          role="alertdialog"
          aria-labelledby="chat-reset-title"
          className="mx-3 mb-2 rounded-lg border border-border bg-surface-elevated/80 px-3 py-2.5 shadow-sm"
        >
          <div
            id="chat-reset-title"
            className="text-[13px] font-medium text-content leading-snug"
          >
            Start a new chat?
          </div>
          <p className="mt-0.5 text-[12px] text-content-secondary leading-snug">
            This clears the current conversation. Can't be undone.
          </p>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1 rounded-md text-[12px] text-content-secondary hover:bg-surface-inset transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={performReset}
              className="px-3 py-1 rounded-md text-[12px] font-medium bg-content text-background hover:bg-content/90 transition-colors"
            >
              New chat
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span className="flex-1 break-words leading-relaxed">{error.message}</span>
          <button
            onClick={() => reload()}
            className="shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-destructive/10 transition-colors"
            title="Retry"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Composer — ghost input. Thin top hairline, textarea, submit appears
          only when there's text. Apple-style restraint. */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border/60 px-3 pt-3 pb-3"
      >
        <div className="relative flex items-center gap-2 rounded-xl border border-border bg-surface-elevated/60 px-3 py-2 focus-within:border-content-tertiary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask the assistant…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[14px] leading-[1.55] text-content placeholder:text-content-tertiary outline-none"
            style={{ maxHeight: 200 }}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stop generating"
              title="Stop"
              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-content text-background transition-all duration-150"
            >
              <Square size={11} strokeWidth={2.5} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              title="Send (Enter)"
              className={[
                'shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full',
                'transition-all duration-150',
                input.trim()
                  ? 'bg-content text-background opacity-100 scale-100'
                  : 'bg-surface-inset text-content-tertiary opacity-60 scale-90',
                'disabled:cursor-not-allowed',
              ].join(' ')}
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-content-tertiary/80">
          <ModelPicker modelId={modelId} onChange={setModelId} />
        </div>
      </form>
    </div>
  )
}

// ============================================================================
// Model picker — small popover in the composer footer. Groups by provider.
// ============================================================================

const PROVIDER_ORDER: ChatModelProvider[] = ['anthropic', 'openai', 'cerebras']
const PROVIDER_LABELS: Record<ChatModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  cerebras: 'Cerebras',
}

function ModelPicker({
  modelId,
  onChange,
}: {
  modelId: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = CHAT_MODELS.find((m) => m.id === modelId) ?? CHAT_MODELS[0]

  return (
    <div ref={containerRef} className="relative inline-flex min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-0.5 truncate hover:text-content transition-colors"
        title="Change model"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown size={10} className="shrink-0 opacity-70" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 z-20 w-64 max-h-[420px] overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
        >
          {PROVIDER_ORDER.map((prov, pIdx) => {
            const models = CHAT_MODELS.filter((m) => m.provider === prov)
            if (models.length === 0) return null
            return (
              <div key={prov}>
                {pIdx > 0 && <div className="border-t border-border/60" />}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-content-tertiary uppercase">
                  {PROVIDER_LABELS[prov]}
                </div>
                {models.map((m) => {
                  const active = m.id === modelId
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onChange(m.id)
                        setOpen(false)
                      }}
                      className={[
                        'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors',
                        active ? 'bg-surface-inset' : 'hover:bg-surface-inset',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] leading-tight text-content truncate">
                          {m.label}
                        </div>
                        {m.hint && (
                          <div className="text-[11px] leading-tight text-content-tertiary mt-0.5">
                            {m.hint}
                          </div>
                        )}
                      </div>
                      {active && <Check size={12} className="shrink-0 text-primary" strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Empty state — a few tailored suggestions for the resume context.
// ============================================================================

const SUGGESTIONS: Array<{ label: string; text: string }> = [
  { label: 'Improve my summary', text: 'Rewrite my professional summary to be sharper and more results-oriented.' },
  { label: 'Tighten my experience bullets', text: 'Review my experience bullets and rewrite any weak ones with stronger action verbs and quantifiable metrics.' },
  { label: 'Add a project', text: 'Add a new project to my resume. Ask me for the details.' },
  { label: 'Change template', text: "What templates are available? I'd like to switch to a different one." },
]

function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-5">
      <div className="w-full max-w-[300px] space-y-2.5 text-left">
        <div className="text-[10.5px] font-medium tracking-[0.08em] text-content-tertiary uppercase">
          Try
        </div>
        <div className="flex flex-col">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggest(s.text)}
              className="group flex items-center gap-2 text-left text-[13px] text-content-secondary hover:text-content transition-colors py-1"
            >
              <span className="inline-block h-px w-3 bg-border group-hover:bg-content-tertiary transition-colors shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Message rendering — parts-ordered. User messages right-aligned, assistant
// flows as prose with inline tool rows.
// ============================================================================

type Part = NonNullable<Message['parts']>[number]

function MessageRow({
  message,
  isStreaming,
  showDivider,
}: {
  message: Message
  isStreaming: boolean
  showDivider: boolean
}) {
  const isUser = message.role === 'user'

  const parts: Part[] = useMemo(() => {
    const p = message.parts
    if (p && p.length > 0) return p
    if (message.content) return [{ type: 'text', text: message.content }] as Part[]
    return []
  }, [message.parts, message.content])

  if (isUser) {
    return (
      <div>
        {showDivider && <div className="chat-turn-divider" />}
        <div className="flex justify-end">
          <div className="max-w-[85%] text-[13.5px] leading-[1.55] text-content font-medium text-left whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {showDivider && <div className="chat-turn-divider" />}
      <div className="space-y-2">
        {parts.map((p, i) => {
          if (p.type === 'text') {
            return (
              <div key={i} className="chat-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {p.text}
                </ReactMarkdown>
              </div>
            )
          }
          if (p.type === 'tool-invocation') {
            return <ToolRow key={i} part={p} />
          }
          // reasoning / source / file / step-start — ignore for now.
          return null
        })}
        {isStreaming && <LiveDot />}
      </div>
    </div>
  )
}

// ============================================================================
// Tool rendering — humanized, live state.
// ============================================================================

type ToolPart = Extract<Part, { type: 'tool-invocation' }>

function ToolRow({ part }: { part: ToolPart }) {
  const inv = part.toolInvocation
  const { label, path } = describeTool(inv.toolName, inv.args as Record<string, unknown> | undefined)
  const isDone = inv.state === 'result'

  return (
    <div
      className={[
        'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 -mx-1',
        'text-[12.5px] leading-tight',
        isDone ? 'text-content-secondary' : 'text-content',
        !isDone && 'chat-tool-shimmer',
      ].filter(Boolean).join(' ')}
    >
      <span className="shrink-0 inline-flex h-4 w-4 items-center justify-center">
        {isDone ? (
          <Check size={12} className="text-success" strokeWidth={2.5} />
        ) : (
          <ToolSpinner />
        )}
      </span>
      <span className="truncate">
        <span className={isDone ? '' : 'text-content'}>{label}</span>
        {path && (
          <>
            {' '}
            <code className="font-mono text-[12px] text-content-secondary">{path}</code>
          </>
        )}
        {!isDone && <EllipsisDots />}
      </span>
    </div>
  )
}

function ToolSpinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
      <path d="M10.5 6 A 4.5 4.5 0 0 1 6 10.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function EllipsisDots() {
  return (
    <span className="ml-0.5 inline-flex items-center gap-[2px] align-middle">
      <span className="chat-dot-1 inline-block h-[2px] w-[2px] rounded-full bg-content-secondary" />
      <span className="chat-dot-2 inline-block h-[2px] w-[2px] rounded-full bg-content-secondary" />
      <span className="chat-dot-3 inline-block h-[2px] w-[2px] rounded-full bg-content-secondary" />
    </span>
  )
}

function LiveDot() {
  return (
    <div
      className="mt-1 inline-flex items-center gap-2 text-[11px] text-content-tertiary"
      aria-live="polite"
    >
      <span className="chat-live-dot h-1.5 w-1.5 rounded-full bg-primary" />
      <span className="tracking-wide">working</span>
    </div>
  )
}

function PendingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[12px] text-content-tertiary">
      <span className="chat-live-dot h-1.5 w-1.5 rounded-full bg-primary" />
      <span>thinking</span>
    </div>
  )
}

// ============================================================================
// Humanize tool calls — resume-specific phrasing for the common collections.
// ============================================================================

interface ToolDescription {
  label: string
  path?: string
}

function describeTool(
  rawName: string | undefined,
  args: Record<string, unknown> | undefined,
): ToolDescription {
  const name = rawName ?? ''
  const collection = typeof args?.collection === 'string' ? (args.collection as string) : undefined
  const data = (args?.data ?? undefined) as Record<string, unknown> | undefined
  const recordId = typeof args?.recordId === 'string' ? (args.recordId as string) : undefined

  if (name === 'records_query') {
    if (collection === 'resumes') return { label: 'Reading your resume' }
    if (collection === 'profiles') return { label: 'Reading your profiles' }
    if (collection === 'editorSettings') return { label: 'Checking editor state' }
    return { label: 'Reading', path: collection }
  }

  if (name === 'records_get') {
    if (collection === 'resumes') return { label: 'Loading resume', path: recordId?.slice(0, 8) }
    if (collection === 'profiles') return { label: 'Loading profile', path: recordId?.slice(0, 8) }
    return { label: 'Fetching record', path: collection }
  }

  if (name === 'records_update') {
    if (collection === 'resumes') {
      if (data && 'latexSource' in data) return { label: 'Editing LaTeX source' }
      const sections = data ? Object.keys(data).filter((k) => k !== 'updatedAt') : []
      if (sections.length === 1) return { label: 'Updating', path: sections[0] }
      if (sections.length > 1) return { label: 'Updating', path: `${sections.length} sections` }
      return { label: 'Updating resume' }
    }
    if (collection === 'profiles') return { label: 'Updating profile' }
    return { label: 'Updating record', path: collection }
  }

  if (name === 'records_create') {
    if (collection === 'resumes') return { label: 'Creating resume' }
    if (collection === 'profiles') return { label: 'Creating profile' }
    return { label: 'Creating record in', path: collection }
  }

  if (name === 'records_delete') {
    if (collection === 'resumes') return { label: 'Deleting resume' }
    if (collection === 'profiles') return { label: 'Deleting profile' }
    return { label: 'Deleting record', path: collection }
  }

  return { label: 'Running', path: name || 'tool' }
}
