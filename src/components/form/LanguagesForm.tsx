/**
 * LanguagesForm — repeatable language entries (CEFR or descriptive).
 * Europass mode: mother tongue flag + 5-skill CEFR grid.
 */

import React from 'react'
import { Input, Button } from '../ui'
import { Plus, Trash2 } from 'lucide-react'
import type { LanguageEntry, CefrSkills } from '../../templates'

interface LanguagesFormProps {
  value: LanguageEntry[]
  onChange: (value: LanguageEntry[]) => void
  readOnly?: boolean
  /** When true, show Europass CEFR grid and mother tongue option */
  showEuropassFields?: boolean
}

const PROFICIENCY_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native', 'Fluent', 'Professional', 'Basic']

const CEFR_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const CEFR_KEYS: (keyof CefrSkills)[] = [
  'listening',
  'reading',
  'spokenInteraction',
  'spokenProduction',
  'writing',
]

const CEFR_LABELS: Record<keyof CefrSkills, string> = {
  listening: 'Listening',
  reading: 'Reading',
  spokenInteraction: 'Spoken interaction',
  spokenProduction: 'Spoken production',
  writing: 'Writing',
}

const emptyEntry: LanguageEntry = { name: '', proficiency: '' }

export function LanguagesForm({ value, onChange, readOnly, showEuropassFields }: LanguagesFormProps) {
  const entries = value?.length ? value : [emptyEntry]

  const update = (index: number, patch: Partial<LanguageEntry>) => {
    const next = [...entries]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const updateCefr = (index: number, key: keyof CefrSkills, v: string) => {
    const entry = entries[index]
    const cefr = { ...(entry.cefr || {}), [key]: v || undefined }
    const hasAny = Object.values(cefr).some(Boolean)
    update(index, { cefr: hasAny ? cefr : undefined })
  }

  const addEntry = () => onChange([...entries, { ...emptyEntry }])

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return
    onChange(entries.filter((_, i) => i !== index))
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-content text-sm focus:outline-none focus:ring-2 focus:ring-accent/30'

  return (
    <div className="space-y-6">
      {entries.map((entry, i) => (
        <div key={i} className="p-3 rounded-lg border border-border bg-surface-elevated/50 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-content-tertiary">Language #{i + 1}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="p-1 rounded text-content-tertiary hover:text-danger"
                disabled={entries.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <Input
            label="Language"
            value={entry.name ?? ''}
            onChange={e => update(i, { name: e.target.value })}
            placeholder="English"
            readOnly={readOnly}
          />
          {showEuropassFields && !readOnly && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!entry.isMotherTongue}
                onChange={e => {
                  const checked = e.target.checked
                  update(
                    i,
                    checked
                      ? {
                          isMotherTongue: true,
                          // Keep an explicit fallback marker in case upstream strips custom flags.
                          proficiency: entry.proficiency?.trim() ? entry.proficiency : 'Native',
                          // Mother tongue does not use CEFR sub-skill grid.
                          cefr: undefined,
                        }
                      : { isMotherTongue: false }
                  )
                }}
                className="rounded border-border"
              />
              <span className="text-sm text-content">Mother tongue</span>
            </label>
          )}
          {!entry.isMotherTongue && (
            <>
              {showEuropassFields ? (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-content-tertiary block">CEFR self-assessment (Europass)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CEFR_KEYS.map(key => (
                      <div key={key}>
                        <label className="block text-xs text-content-tertiary mb-0.5">{CEFR_LABELS[key]}</label>
                        <select
                          value={entry.cefr?.[key] ?? ''}
                          onChange={e => updateCefr(i, key, e.target.value)}
                          className={inputClass}
                        >
                          <option value="">—</option>
                          {CEFR_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {!hasAnyCefr(entry.cefr) && (
                    <p className="text-xs text-content-tertiary">Or use single proficiency below:</p>
                  )}
                </div>
              ) : null}
              {(!showEuropassFields || !hasAnyCefr(entry.cefr)) && (
                readOnly ? (
                  <Input
                    label="Proficiency"
                    value={entry.proficiency ?? ''}
                    readOnly
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-content mb-1">Proficiency</label>
                    <select
                      value={entry.proficiency ?? ''}
                      onChange={e => update(i, { proficiency: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select...</option>
                      {PROFICIENCY_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </>
          )}
          {entry.isMotherTongue && readOnly && (
            <span className="text-sm text-content-tertiary">Mother tongue</span>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addEntry} className="w-full">
          <Plus className="w-4 h-4" />
          Add Language
        </Button>
      )}
    </div>
  )
}

function hasAnyCefr(cefr?: CefrSkills): boolean {
  if (!cefr) return false
  return CEFR_KEYS.some(k => !!cefr[k])
}
