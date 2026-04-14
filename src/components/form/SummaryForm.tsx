/**
 * SummaryForm — professional summary textarea with AI rewrite.
 *
 * The "Rewrite with AI" button generates an improved version of the summary.
 * A before/after toggle lets the user compare and then accept or discard.
 */

import React, { useState, useCallback } from 'react'
import { Sparkles, Check, X, RotateCw, Target } from 'lucide-react'
import { Textarea } from '../ui'
import { useAiAssist, useTailorSection } from '../../hooks'
import { AI_PROMPTS } from '../../constants'

interface SummaryFormProps {
  value: string
  onChange: (value: string) => void
  /** Optional context (e.g. name + job title) passed to the AI for better results. */
  context?: string
  /** When set, shows "Tailor to job description" button. */
  jobDescription?: string
  readOnly?: boolean
}

type View = 'current' | 'suggestion'

export function SummaryForm({ value, onChange, context, jobDescription, readOnly }: SummaryFormProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [originalSummary, setOriginalSummary] = useState<string | null>(null)
  const [regenerationInstructions, setRegenerationInstructions] = useState('')
  const [view, setView] = useState<View>('current')
  const { generate, loading, error: aiError, clearError } = useAiAssist()
  const { tailorSummary, loading: tailorLoading, error: tailorError, clearError: clearTailorError } = useTailorSection()

  const handleRewrite = useCallback(async () => {
    if (!(value ?? '').trim()) return
    clearError()
    setOriginalSummary(value)
    const contextLine = context ? `\n\nCandidate context: ${context}` : ''
    const prompt = `${AI_PROMPTS.REWRITE_SUMMARY}${contextLine}\n\nCurrent summary:\n${value}`
    const result = await generate(prompt, 300)
    if (result) {
      setSuggestion(result)
      setView('suggestion')
    }
  }, [value, context, generate, clearError])

  const handleRegenerate = useCallback(async () => {
    if (!suggestion || !originalSummary) return
    clearError()
    const contextLine = context ? `\n\nCandidate context: ${context}` : ''
    const prompt = `${AI_PROMPTS.REGENERATE_SUMMARY}${contextLine}

Original summary:
${originalSummary}

Previous AI suggestion:
${suggestion}

User refinement instructions: ${regenerationInstructions.trim() || '(none — try a different approach)'}`

    const result = await generate(prompt, 300)
    if (result) {
      setSuggestion(result)
      setRegenerationInstructions('')
    }
  }, [suggestion, originalSummary, context, regenerationInstructions, generate, clearError])

  const handleAccept = useCallback(() => {
    if (!suggestion) return
    onChange(suggestion)
    setSuggestion(null)
    setOriginalSummary(null)
    setRegenerationInstructions('')
    setView('current')
  }, [suggestion, onChange])

  const handleDiscard = useCallback(() => {
    setSuggestion(null)
    setOriginalSummary(null)
    setRegenerationInstructions('')
    setView('current')
  }, [])

  const handleTailorToJd = useCallback(async () => {
    if (!(value ?? '').trim() || !jobDescription?.trim()) return
    clearError()
    clearTailorError()
    setOriginalSummary(value)
    const result = await tailorSummary(value, jobDescription)
    if (result) {
      setSuggestion(result)
      setView('suggestion')
    }
  }, [value, jobDescription, tailorSummary, clearError, clearTailorError])

  const isLoading = loading || tailorLoading
  const displayError = aiError || tailorError

  return (
    <div className="space-y-2">
      {/* Before/after tab toggle — only when suggestion is ready */}
      {suggestion && (
        <div className="flex items-center gap-1 p-0.5 bg-surface-inset rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setView('current')}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${
              view === 'current'
                ? 'bg-surface-elevated text-content shadow-sm'
                : 'text-content-secondary hover:text-content'
            }`}
          >
            Current
          </button>
          <button
            type="button"
            onClick={() => setView('suggestion')}
            className={`flex items-center gap-1 text-xs px-3 py-1 rounded-md transition-colors ${
              view === 'suggestion'
                ? 'bg-surface-elevated text-accent shadow-sm'
                : 'text-content-secondary hover:text-content'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Suggestion
          </button>
        </div>
      )}

      {/* Current textarea */}
      {view === 'current' && (
        <Textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Brief overview of your experience, skills, and career goals..."
          rows={4}
          readOnly={readOnly}
          className={readOnly ? 'opacity-60 cursor-not-allowed bg-surface-inset/50' : ''}
        />
      )}

      {/* Suggestion view */}
      {view === 'suggestion' && suggestion && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
          <p className="text-sm text-content leading-relaxed whitespace-pre-wrap">{suggestion}</p>
          <div className="space-y-1.5">
            <input
              type="text"
              value={regenerationInstructions}
              onChange={e => setRegenerationInstructions(e.target.value)}
              placeholder="Improvements you'd like (optional)"
              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-surface text-content placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleAccept}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-accent text-white hover:bg-accent/90 transition-colors"
              >
                <Check className="w-3 h-3" />
                Accept
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-border text-content-secondary hover:text-content hover:bg-surface transition-colors"
              >
                <X className="w-3 h-3" />
                Discard
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-border text-content-secondary hover:text-content hover:bg-surface transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
                ) : (
                  <RotateCw className="w-3 h-3" />
                )}
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI error */}
      {displayError && (
        <p className="text-xs text-danger">{displayError}</p>
      )}

      {/* Rewrite / Tailor buttons — only in form mode, only when there's content */}
      {!readOnly && !suggestion && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRewrite}
            disabled={isLoading || !(value ?? '').trim()}
            title={!(value ?? '').trim() ? 'Add a summary first to enable AI rewrite' : undefined}
            className={`
              flex items-center gap-1.5 text-xs transition-colors
              ${isLoading || !(value ?? '').trim()
                ? 'text-content-tertiary/40 cursor-not-allowed'
                : 'text-content-tertiary hover:text-accent cursor-pointer'
              }
            `}
          >
            {loading ? (
              <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {loading ? 'Rewriting...' : 'Rewrite with AI'}
          </button>
          {jobDescription?.trim() && (
            <button
              type="button"
              onClick={handleTailorToJd}
              disabled={isLoading || !(value ?? '').trim()}
              title="Rephrase summary to match job description keywords"
              className={`
                flex items-center gap-1.5 text-xs transition-colors
                ${isLoading || !(value ?? '').trim()
                  ? 'text-content-tertiary/40 cursor-not-allowed'
                  : 'text-content-tertiary hover:text-accent cursor-pointer'
                }
              `}
            >
              {tailorLoading ? (
                <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
              ) : (
                <Target className="w-3 h-3" />
              )}
              {tailorLoading ? 'Tailoring...' : 'Tailor to job description'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
