/**
 * ExperienceForm — repeatable work experience entries.
 *
 * Each bullet keeps the AI action docked inside the field so it is always
 * visible, while the delete action stays hover-revealed.
 */

import React, { useState, useCallback } from 'react'
import { Input, Textarea, Button } from '../ui'
import { SectionAccordion } from './SectionAccordion'
import { Plus, Trash2, Sparkles, Check, X, RotateCw, Target } from 'lucide-react'
import { useAiAssist, useTailorSection } from '../../hooks'
import { AI_PROMPTS } from '../../constants'
import type { ExperienceEntry } from '../../templates'

interface ExperienceFormProps {
  value: ExperienceEntry[]
  onChange: (value: ExperienceEntry[]) => void
  jobDescription?: string
  readOnly?: boolean
}

const emptyEntry: ExperienceEntry = {
  company: '',
  role: '',
  startDate: '',
  endDate: '',
  bullets: [''],
}

// Tracks which bullet is loading or has a pending suggestion
// key format: `${entryIdx}-${bulletIdx}`
interface AiSuggestion {
  key: string
  text: string
  originalText: string
}

function experienceTitle(entry: ExperienceEntry, index: number): string {
  const parts = [entry.company, entry.role].filter(Boolean)
  const suffix = parts.length > 0 ? ` — ${parts.join(', ')}` : ''
  return `Experience ${index + 1}${suffix}`
}

export function ExperienceForm({ value, onChange, jobDescription, readOnly }: ExperienceFormProps) {
  const entries = value?.length ? value : [emptyEntry]

  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [loadingEntryIndex, setLoadingEntryIndex] = useState<number | null>(null)
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null)
  const [tailorSuggestions, setTailorSuggestions] = useState<Record<string, string>>({})
  const [openExperiences, setOpenExperiences] = useState<Set<number>>(new Set())
  const { generate, error: aiError } = useAiAssist()
  const { tailorBullets, error: tailorError, clearError: clearTailorError } = useTailorSection()

  const toggleExperience = useCallback((index: number) => {
    setOpenExperiences(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const update = (index: number, patch: Partial<ExperienceEntry>) => {
    const next = [...entries]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addBullet = (entryIndex: number) => {
    const entry = entries[entryIndex]
    const bullets = [...(entry.bullets || []), '']
    update(entryIndex, { bullets })
  }

  const updateBullet = (entryIndex: number, bulletIndex: number, text: string) => {
    const entry = entries[entryIndex]
    const bullets = [...(entry.bullets || [])]
    bullets[bulletIndex] = text
    if (bulletIndex === bullets.length - 1 && text) {
      bullets.push('')
    }
    update(entryIndex, { bullets })
  }

  const removeBullet = (entryIndex: number, bulletIndex: number) => {
    const entry = entries[entryIndex]
    const bullets = (entry.bullets || []).filter((_, i) => i !== bulletIndex)
    if (bullets.length === 0) bullets.push('')
    update(entryIndex, { bullets })
  }

  const addEntry = () => {
    onChange([...entries, { ...emptyEntry }])
  }

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return
    onChange(entries.filter((_, i) => i !== index))
  }

  const handleImproveBullet = useCallback(
    async (entryIdx: number, bulletIdx: number) => {
      const entry = entries[entryIdx]
      const bulletText = entry.bullets?.[bulletIdx] ?? ''
      if (!bulletText.trim()) return

      const key = `${entryIdx}-${bulletIdx}`
      setLoadingKey(key)
      setSuggestion(null)

      const roleContext = [entry.role, entry.company].filter(Boolean).join(' at ')
      const prompt = `${AI_PROMPTS.IMPROVE_EXPERIENCE_BULLET}\n\nRole context: ${roleContext || 'unspecified'}\n\nBullet point to improve:\n${bulletText}`

      const result = await generate(prompt)
      setLoadingKey(null)
      if (result) {
        setSuggestion({ key, text: result, originalText: bulletText })
      }
    },
    [entries, generate]
  )

  const [regenerationInstructions, setRegenerationInstructions] = useState('')

  const handleRegenerate = useCallback(
    async (entryIdx: number, bulletIdx: number) => {
      if (!suggestion || suggestion.key !== `${entryIdx}-${bulletIdx}`) return
      const entry = entries[entryIdx]
      const roleContext = [entry.role, entry.company].filter(Boolean).join(' at ')
      const key = `${entryIdx}-${bulletIdx}`
      setLoadingKey(key)
      const prompt = `${AI_PROMPTS.REGENERATE_EXPERIENCE_BULLET}

Role context: ${roleContext || 'unspecified'}

Original text:
${suggestion.originalText}

Previous AI suggestion:
${suggestion.text}

User refinement instructions: ${regenerationInstructions.trim() || '(none — try a different approach)'}`

      const result = await generate(prompt)
      setLoadingKey(null)
      if (result) {
        setSuggestion({ ...suggestion, text: result })
        setRegenerationInstructions('')
      }
    },
    [suggestion, entries, regenerationInstructions, generate]
  )

  const handleAcceptSuggestion = useCallback(
    (entryIdx: number, bulletIdx: number) => {
      if (!suggestion) return
      updateBullet(entryIdx, bulletIdx, suggestion.text)
      setSuggestion(null)
      setRegenerationInstructions('')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suggestion, entries]
  )

  const handleDiscardSuggestion = useCallback(() => {
    setSuggestion(null)
    setRegenerationInstructions('')
  }, [])

  const handleTailorEntry = useCallback(
    async (entryIdx: number) => {
      const entry = entries[entryIdx]
      const allBullets = entry.bullets || []
      const filtered = allBullets.filter(b => b.trim())
      if (filtered.length === 0 || !jobDescription?.trim()) return

      const originalIndices: number[] = []
      allBullets.forEach((b, i) => {
        if (b.trim()) originalIndices.push(i)
      })

      setLoadingEntryIndex(entryIdx)
      setSuggestion(null)
      clearTailorError()

      const context = [entry.role, entry.company].filter(Boolean).join(' at ')
      const result = await tailorBullets(filtered, jobDescription, context)
      setLoadingEntryIndex(null)

      if (result.length > 0) {
        const next: Record<string, string> = {}
        result.forEach((text, i) => {
          const bulletIdx = originalIndices[i]
          if (bulletIdx !== undefined) next[`${entryIdx}-${bulletIdx}`] = text
        })
        setTailorSuggestions(prev => ({ ...prev, ...next }))
      }
    },
    [entries, jobDescription, tailorBullets, clearTailorError]
  )

  const handleAcceptTailor = useCallback(
    (entryIdx: number, bulletIdx: number) => {
      const key = `${entryIdx}-${bulletIdx}`
      const text = tailorSuggestions[key]
      if (text) {
        updateBullet(entryIdx, bulletIdx, text)
        setTailorSuggestions(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    },
    [tailorSuggestions, entries]
  )

  const handleDiscardTailor = useCallback((entryIdx: number, bulletIdx: number) => {
    setTailorSuggestions(prev => {
      const next = { ...prev }
      delete next[`${entryIdx}-${bulletIdx}`]
      return next
    })
  }, [])

  const getSuggestionForBullet = (entryIdx: number, bulletIdx: number): string | null => {
    const key = `${entryIdx}-${bulletIdx}`
    if (suggestion?.key === key) return suggestion.text
    return tailorSuggestions[key] ?? null
  }

  const hasSuggestionForBullet = (entryIdx: number, bulletIdx: number) =>
    !!getSuggestionForBullet(entryIdx, bulletIdx)

  const isTailorSuggestion = (entryIdx: number, bulletIdx: number) =>
    !!tailorSuggestions[`${entryIdx}-${bulletIdx}`]

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <SectionAccordion
          key={i}
          title={experienceTitle(entry, i)}
          isOpen={openExperiences.has(i)}
          onToggle={() => toggleExperience(i)}
        >
          <div className="space-y-3">
            {!readOnly && (
              <div className="flex justify-end gap-1">
                {jobDescription?.trim() && (
                  <button
                    type="button"
                    onClick={() => handleTailorEntry(i)}
                    disabled={
                      loadingEntryIndex !== null ||
                      !(entry.bullets || []).some(b => b.trim())
                    }
                    title="Tailor all bullets to job description"
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded text-content-tertiary hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                  >
                    {loadingEntryIndex === i ? (
                      <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
                    ) : (
                      <Target className="w-3 h-3" />
                    )}
                    Tailor to job description
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="p-1 rounded text-content-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Remove"
                  disabled={entries.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <Input
            label="Company"
            value={entry.company ?? ''}
            onChange={e => update(i, { company: e.target.value })}
            placeholder="Acme Inc."
            readOnly={readOnly}
          />
          <Input
            label="Role"
            value={entry.role ?? ''}
            onChange={e => update(i, { role: e.target.value })}
            placeholder="Software Engineer"
            readOnly={readOnly}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              value={entry.startDate ?? ''}
              onChange={e => update(i, { startDate: e.target.value })}
              placeholder="Jan 2020"
              readOnly={readOnly}
            />
            <Input
              label="End Date"
              value={entry.endDate ?? ''}
              onChange={e => update(i, { endDate: e.target.value })}
              placeholder="Present"
              readOnly={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Bullet Points</label>
            {(entry.bullets || ['']).map((b, j) => {
              const key = `${i}-${j}`
              const isLoading = loadingKey === key || loadingEntryIndex === i
              const hasSuggestion = hasSuggestionForBullet(i, j)
              const suggestionText = getSuggestionForBullet(i, j)
              const fromTailor = isTailorSuggestion(i, j)
              const canImprove = !readOnly && !!b.trim() && !loadingKey && !loadingEntryIndex && !suggestion && !Object.keys(tailorSuggestions).length

              return (
                <div key={j} className="mb-2 group">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Textarea
                        value={b}
                        onChange={e => updateBullet(i, j, e.target.value)}
                        placeholder="Achieved X by doing Y..."
                        rows={2}
                        readOnly={readOnly}
                        className="textarea-autogrow pr-12"
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleImproveBullet(i, j)}
                          disabled={!canImprove || isLoading}
                          title={b.trim() ? 'Improve with AI' : 'Add text to improve'}
                          aria-label={b.trim() ? 'Improve bullet with AI' : 'Add text to improve with AI'}
                          className={`
                            absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-surface/90 shadow-sm transition-colors
                            ${isLoading
                              ? 'text-accent cursor-wait'
                              : canImprove
                                ? 'text-content-tertiary hover:text-accent hover:bg-accent/10'
                                : 'text-content-tertiary/40 cursor-not-allowed'
                            }
                          `}
                        >
                          {isLoading ? (
                            <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    {!readOnly && (entry.bullets?.length ?? 0) > 1 && (
                      <div className="flex shrink-0 items-start pt-2">
                        <button
                          type="button"
                          onClick={() => removeBullet(i, j)}
                          title="Delete bullet"
                          aria-label="Delete bullet"
                          className="pointer-events-none rounded p-1.5 text-content-tertiary opacity-0 transition-all group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline suggestion panel */}
                  {hasSuggestion && suggestionText && (
                    <div className="mt-1.5 rounded-lg border border-accent/30 bg-accent/5 p-2.5 space-y-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3 text-accent" />
                        <span className="text-xs font-medium text-accent">
                          {fromTailor ? 'Tailored suggestion' : 'AI suggestion'}
                        </span>
                      </div>
                      <p className="text-sm text-content leading-relaxed">{suggestionText}</p>
                      <div className="space-y-1.5">
                        {!fromTailor && (
                          <input
                            type="text"
                            value={regenerationInstructions}
                            onChange={e => setRegenerationInstructions(e.target.value)}
                            placeholder="Improvements you'd like (optional)"
                            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-surface text-content placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-accent/30"
                          />
                        )}
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              fromTailor ? handleAcceptTailor(i, j) : handleAcceptSuggestion(i, j)
                            }
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent text-white hover:bg-accent/90 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              fromTailor ? handleDiscardTailor(i, j) : handleDiscardSuggestion()
                            }
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-content-secondary hover:text-content hover:bg-surface transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Discard
                          </button>
                          {!fromTailor && (
                            <button
                              type="button"
                              onClick={() => handleRegenerate(i, j)}
                              disabled={loadingKey === key}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-content-secondary hover:text-content hover:bg-surface transition-colors disabled:opacity-50"
                            >
                              {loadingKey === key ? (
                                <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
                              ) : (
                                <RotateCw className="w-3 h-3" />
                              )}
                              Regenerate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {(aiError || tailorError) && (
              <p className="text-xs text-danger mt-1">{aiError || tailorError}</p>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => addBullet(i)}
                className="text-xs text-accent hover:underline"
              >
                + Add bullet
              </button>
            )}
          </div>
          </div>
        </SectionAccordion>
      ))}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addEntry} className="w-full">
          <Plus className="w-4 h-4" />
          Add Experience
        </Button>
      )}
    </div>
  )
}
