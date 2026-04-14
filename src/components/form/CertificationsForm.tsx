/**
 * CertificationsForm — repeatable certification entries.
 */

import React from 'react'
import { Input, Button } from '../ui'
import { Plus, Trash2 } from 'lucide-react'
import type { CertificationEntry } from '../../templates'

interface CertificationsFormProps {
  value: CertificationEntry[]
  onChange: (value: CertificationEntry[]) => void
  readOnly?: boolean
}

const emptyEntry: CertificationEntry = { name: '', issuer: '', date: '' }

export function CertificationsForm({ value, onChange, readOnly }: CertificationsFormProps) {
  const entries = value?.length ? value : [emptyEntry]

  const update = (index: number, patch: Partial<CertificationEntry>) => {
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
            <span className="text-xs font-medium text-content-tertiary">Certification #{i + 1}</span>
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
            label="Certification Name"
            value={entry.name ?? ''}
            onChange={e => update(i, { name: e.target.value })}
            placeholder="AWS Certified Developer"
            readOnly={readOnly}
          />
          <Input
            label="Issuer"
            value={entry.issuer ?? ''}
            onChange={e => update(i, { issuer: e.target.value })}
            placeholder="Amazon Web Services"
            readOnly={readOnly}
          />
          <Input
            label="Date"
            value={entry.date ?? ''}
            onChange={e => update(i, { date: e.target.value })}
            placeholder="2023"
            readOnly={readOnly}
          />
        </div>
      ))}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addEntry} className="w-full">
          <Plus className="w-4 h-4" />
          Add Certification
        </Button>
      )}
    </div>
  )
}
