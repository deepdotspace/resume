/**
 * SkillsForm — repeatable skill groups (category + items).
 *
 * The "Skills" input holds a comma-separated string while the user is
 * typing, so the caret doesn't jump when the user types a comma. On blur
 * (or when the user adds a suggested skill) the string is parsed into the
 * `SkillGroup.items` array and pushed up.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Input, Button } from '../ui'
import { Plus, Trash2, Target } from 'lucide-react'
import { useTailorSection } from '../../hooks'
import type { SkillGroup } from '../../templates'

interface SkillsFormProps {
  value: SkillGroup[]
  onChange: (value: SkillGroup[]) => void
  jobDescription?: string
  readOnly?: boolean
}

const emptyGroup: SkillGroup = { category: '', items: [''] }

function itemsToString(items: string[] | undefined): string {
  return (items || []).filter(Boolean).join(', ')
}

function parseItems(str: string): string[] {
  const items = str.split(',').map(s => s.trim()).filter(Boolean)
  return items.length === 0 ? [''] : items
}

export function SkillsForm({ value, onChange, jobDescription, readOnly }: SkillsFormProps) {
  const groups = value?.length ? value : [emptyGroup]
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([])
  const { suggestSkillsFromJd, loading, error, clearError } = useTailorSection()

  // Per-group raw input strings. Seed from the upstream `value`; only push
  // parsed arrays back on blur so the caret doesn't jump while typing.
  const [rawItems, setRawItems] = useState<string[]>(() => groups.map(g => itemsToString(g.items)))

  // Sync down: if the upstream value changes (e.g. agent edit, or group
  // count changes), reseed the raw strings. Compare by formatted strings
  // so we only reseed when the underlying data actually changed.
  useEffect(() => {
    const nextRaw = groups.map(g => itemsToString(g.items))
    setRawItems(prev => {
      if (prev.length === nextRaw.length && prev.every((s, i) => s === nextRaw[i])) return prev
      return nextRaw
    })
  }, [groups])

  const update = (index: number, patch: Partial<SkillGroup>) => {
    const next = [...groups]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addGroup = () => {
    const next = [...groups, { ...emptyGroup }]
    onChange(next)
    setRawItems(next.map(g => itemsToString(g.items)))
  }

  const removeGroup = (index: number) => {
    if (groups.length <= 1) return
    const next = groups.filter((_, i) => i !== index)
    onChange(next)
    setRawItems(next.map(g => itemsToString(g.items)))
  }

  const handleSuggestFromJd = useCallback(async () => {
    if (!jobDescription?.trim()) return
    clearError()
    const existing = groups.flatMap(g => (g.items || []).filter(Boolean))
    const result = await suggestSkillsFromJd(jobDescription, existing)
    setSuggestedSkills(result)
  }, [jobDescription, groups, suggestSkillsFromJd, clearError])

  const handleAddSkill = useCallback(
    (skill: string) => {
      const next = [...groups]
      const first = next[0]
      if (first) {
        const items = [...(first.items || []).filter(Boolean), skill]
        next[0] = { ...first, items }
      } else {
        next.push({ category: 'Skills', items: [skill] })
      }
      onChange(next)
      // Keep the raw string aligned with the parsed array we just wrote.
      setRawItems(next.map(g => itemsToString(g.items)))
      setSuggestedSkills(prev => prev.filter(s => s !== skill))
    },
    [groups, onChange],
  )

  const handleRawChange = (index: number, str: string) => {
    setRawItems(prev => {
      const next = [...prev]
      next[index] = str
      return next
    })
  }

  const commitRaw = (index: number) => {
    const parsed = parseItems(rawItems[index] ?? '')
    update(index, { items: parsed })
    // Normalise local raw string so trailing commas / whitespace collapse.
    setRawItems(prev => {
      const next = [...prev]
      next[index] = itemsToString(parsed)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {!readOnly && jobDescription?.trim() && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSuggestFromJd}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-content-tertiary hover:text-accent transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
            ) : (
              <Target className="w-3 h-3" />
            )}
            {loading ? 'Suggesting...' : 'Suggest from JD'}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
          {suggestedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestedSkills.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddSkill(s)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {groups.map((group, i) => (
        <div key={i} className="p-3 rounded-lg border border-border bg-surface-elevated/50 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-content-tertiary">Skill Group #{i + 1}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeGroup(i)}
                className="p-1 rounded text-content-tertiary hover:text-danger"
                disabled={groups.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <Input
            label="Category"
            value={group.category ?? ''}
            onChange={e => update(i, { category: e.target.value })}
            placeholder="Programming Languages"
            readOnly={readOnly}
          />
          <Input
            label="Skills (comma-separated)"
            value={rawItems[i] ?? ''}
            onChange={e => handleRawChange(i, e.target.value)}
            onBlur={() => commitRaw(i)}
            placeholder="JavaScript, TypeScript, React"
            readOnly={readOnly}
          />
        </div>
      ))}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addGroup} className="w-full">
          <Plus className="w-4 h-4" />
          Add Skill Group
        </Button>
      )}
    </div>
  )
}
