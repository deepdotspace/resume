/**
 * EducationForm — repeatable education entries.
 */

import React from 'react'
import { Input, Button } from '../ui'
import { Plus, Trash2 } from 'lucide-react'
import type { EducationEntry } from '../../templates'

interface EducationFormProps {
  value: EducationEntry[]
  onChange: (value: EducationEntry[]) => void
  readOnly?: boolean
}

const emptyEntry: EducationEntry = {
  institution: '',
  degree: '',
  field: '',
  startDate: '',
  endDate: '',
  gpa: '',
}

export function EducationForm({ value, onChange, readOnly }: EducationFormProps) {
  const entries = value?.length ? value : [emptyEntry]

  const update = (index: number, patch: Partial<EducationEntry>) => {
    const next = [...entries]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addEntry = () => onChange([...entries, { ...emptyEntry }])

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return
    onChange(entries.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {entries.map((entry, i) => (
        <div key={i} className="p-3 rounded-lg border border-border bg-surface-elevated/50 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-content-tertiary">Education #{i + 1}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="p-1 rounded text-content-tertiary hover:text-danger"
                title="Remove"
                disabled={entries.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <Input
            label="Institution"
            value={entry.institution ?? ''}
            onChange={e => update(i, { institution: e.target.value })}
            placeholder="Stanford University"
            readOnly={readOnly}
          />
          <Input
            label="Degree"
            value={entry.degree ?? ''}
            onChange={e => update(i, { degree: e.target.value })}
            placeholder="B.S."
            readOnly={readOnly}
          />
          <Input
            label="Field of Study"
            value={entry.field ?? ''}
            onChange={e => update(i, { field: e.target.value })}
            placeholder="Computer Science"
            readOnly={readOnly}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              value={entry.startDate ?? ''}
              onChange={e => update(i, { startDate: e.target.value })}
              placeholder="2016"
              readOnly={readOnly}
            />
            <Input
              label="End Date"
              value={entry.endDate ?? ''}
              onChange={e => update(i, { endDate: e.target.value })}
              placeholder="2020"
              readOnly={readOnly}
            />
          </div>
          <Input
            label="GPA (optional)"
            value={entry.gpa ?? ''}
            onChange={e => update(i, { gpa: e.target.value })}
            placeholder="3.8"
            readOnly={readOnly}
          />
        </div>
      ))}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addEntry} className="w-full">
          <Plus className="w-4 h-4" />
          Add Education
        </Button>
      )}
    </div>
  )
}
