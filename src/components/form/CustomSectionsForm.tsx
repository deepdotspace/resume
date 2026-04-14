/**
 * CustomSectionsForm — editable list of arbitrary resume sections
 * (awards, publications, volunteer work, etc.) that were parsed from uploads
 * or added manually.
 */

import React, { useCallback, useState } from 'react'
import { Input, Textarea, Button } from '../ui'
import { SectionAccordion } from './SectionAccordion'
import { Plus, Trash2 } from 'lucide-react'
import type { CustomSection, CustomEntry } from '../../templates'

interface CustomSectionsFormProps {
  value: CustomSection[]
  onChange: (value: CustomSection[]) => void
  readOnly?: boolean
}

const emptyEntry: CustomEntry = { primary: '', secondary: '', date: '', bullets: [] }
const emptySection: CustomSection = { title: '', entries: [{ ...emptyEntry }] }

export function CustomSectionsForm({ value, onChange, readOnly }: CustomSectionsFormProps) {
  const sections = value?.length ? value : []
  const [openSections, setOpenSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  )

  const toggleSection = useCallback((index: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const updateSection = (sectionIdx: number, patch: Partial<CustomSection>) => {
    const next = [...sections]
    next[sectionIdx] = { ...next[sectionIdx], ...patch }
    onChange(next)
  }

  const updateEntry = (sectionIdx: number, entryIdx: number, patch: Partial<CustomEntry>) => {
    const section = sections[sectionIdx]
    const entries = [...section.entries]
    entries[entryIdx] = { ...entries[entryIdx], ...patch }
    updateSection(sectionIdx, { entries })
  }

  const addEntry = (sectionIdx: number) => {
    const section = sections[sectionIdx]
    updateSection(sectionIdx, { entries: [...section.entries, { ...emptyEntry }] })
  }

  const removeEntry = (sectionIdx: number, entryIdx: number) => {
    const section = sections[sectionIdx]
    if (section.entries.length <= 1) return
    updateSection(sectionIdx, { entries: section.entries.filter((_, i) => i !== entryIdx) })
  }

  const addSection = () => {
    const next = [...sections, { ...emptySection, entries: [{ ...emptyEntry }] }]
    onChange(next)
    setOpenSections(prev => new Set([...prev, next.length - 1]))
  }

  const removeSection = (sectionIdx: number) => {
    onChange(sections.filter((_, i) => i !== sectionIdx))
  }

  const updateBullet = (sectionIdx: number, entryIdx: number, bulletIdx: number, text: string) => {
    const entry = sections[sectionIdx].entries[entryIdx]
    const bullets = [...(entry.bullets || [])]
    bullets[bulletIdx] = text
    if (bulletIdx === bullets.length - 1 && text) bullets.push('')
    updateEntry(sectionIdx, entryIdx, { bullets })
  }

  const removeBullet = (sectionIdx: number, entryIdx: number, bulletIdx: number) => {
    const entry = sections[sectionIdx].entries[entryIdx]
    const bullets = (entry.bullets || []).filter((_, i) => i !== bulletIdx)
    if (bullets.length === 0) bullets.push('')
    updateEntry(sectionIdx, entryIdx, { bullets })
  }

  if (sections.length === 0 && readOnly) return null

  return (
    <div className="space-y-2">
      {sections.length === 0 && !readOnly && (
        <p className="text-xs text-content-tertiary mb-2">
          Sections extracted from your resume that don't fit standard categories (awards, publications, etc.) appear here. You can also add your own.
        </p>
      )}

      {sections.map((section, si) => (
        <SectionAccordion
          key={si}
          title={section.title || `Custom Section ${si + 1}`}
          isOpen={openSections.has(si)}
          onToggle={() => toggleSection(si)}
          count={section.entries.length}
        >
          <div className="space-y-4">
            {!readOnly && (
              <div className="flex items-center gap-2">
                <Input
                  label="Section Title"
                  value={section.title ?? ''}
                  onChange={e => updateSection(si, { title: e.target.value })}
                  placeholder="Awards & Honors"
                />
                <button
                  type="button"
                  onClick={() => removeSection(si)}
                  className="mt-5 p-1.5 rounded text-content-tertiary hover:text-danger shrink-0"
                  title="Remove section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {section.entries.map((entry, ei) => (
              <div key={ei} className="p-3 rounded-lg border border-border bg-surface-elevated/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-content-tertiary">
                    Entry #{ei + 1}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeEntry(si, ei)}
                      className="p-1 rounded text-content-tertiary hover:text-danger"
                      disabled={section.entries.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Input
                  label="Title"
                  value={entry.primary ?? ''}
                  onChange={e => updateEntry(si, ei, { primary: e.target.value })}
                  placeholder="Dean's List, Best Paper Award, etc."
                  readOnly={readOnly}
                />
                <Input
                  label="Organization / Details"
                  value={entry.secondary ?? ''}
                  onChange={e => updateEntry(si, ei, { secondary: e.target.value })}
                  placeholder="Issuer, journal, institution..."
                  readOnly={readOnly}
                />
                <Input
                  label="Date"
                  value={entry.date ?? ''}
                  onChange={e => updateEntry(si, ei, { date: e.target.value })}
                  placeholder="2023"
                  readOnly={readOnly}
                />
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Details</label>
                  {(entry.bullets?.length ? entry.bullets : ['']).map((b, bi) => (
                    <div key={bi} className="mb-2 group flex gap-2">
                      <Textarea
                        value={b}
                        onChange={e => updateBullet(si, ei, bi, e.target.value)}
                        placeholder="Additional detail..."
                        rows={2}
                        readOnly={readOnly}
                        className="textarea-autogrow flex-1"
                      />
                      {!readOnly && (entry.bullets?.length ?? 0) > 1 && (
                        <div className="flex shrink-0 items-start pt-2">
                          <button
                            type="button"
                            onClick={() => removeBullet(si, ei, bi)}
                            className="pointer-events-none rounded p-1.5 text-content-tertiary opacity-0 transition-all group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const bullets = [...(entry.bullets || []), '']
                        updateEntry(si, ei, { bullets })
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      + Add detail
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={() => addEntry(si)} className="w-full">
                <Plus className="w-4 h-4" />
                Add Entry
              </Button>
            )}
          </div>
        </SectionAccordion>
      ))}

      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addSection} className="w-full">
          <Plus className="w-4 h-4" />
          Add Custom Section
        </Button>
      )}
    </div>
  )
}
