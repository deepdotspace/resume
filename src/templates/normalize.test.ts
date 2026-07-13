/**
 * Shape normalization for resume section columns.
 *
 * Regression suite for the prod crash: the AI chat wrote a skills group with
 * `items` as a comma-joined string instead of a string[], which threw
 * `(t.items || []).filter is not a function` in SkillsForm and killed the
 * editor route. These tests pin the two defense layers:
 *   - per-section normalizers (client parse + worker write both use them)
 *   - normalizeResumeWrite (the AI tool-call boundary in the worker)
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeSkills,
  normalizeExperience,
  normalizeEducation,
  normalizeLanguages,
  normalizeProjects,
  normalizeCertifications,
  normalizeCustomSections,
  normalizeResumeWrite,
} from './normalize'

describe('normalizeSkills', () => {
  it('passes well-formed groups through', () => {
    const groups = [{ category: 'Languages', items: ['TypeScript', 'Go'] }]
    expect(normalizeSkills(groups)).toEqual(groups)
  })

  it('splits a comma-joined items string (the prod crash shape)', () => {
    const bad = [{ category: 'Languages', items: 'JavaScript, TypeScript, Python' }]
    expect(normalizeSkills(bad)).toEqual([
      { category: 'Languages', items: ['JavaScript', 'TypeScript', 'Python'] },
    ])
  })

  it('coerces non-array/non-string items to an empty array', () => {
    expect(normalizeSkills([{ category: 'X', items: { a: 1 } }])).toEqual([
      { category: 'X', items: [] },
    ])
  })

  it('wraps a single group object in an array', () => {
    expect(normalizeSkills({ category: 'X', items: ['a'] })).toEqual([
      { category: 'X', items: ['a'] },
    ])
  })

  it('collects a flat string array into one group', () => {
    expect(normalizeSkills(['React', 'Node'])).toEqual([
      { category: '', items: ['React', 'Node'] },
    ])
  })

  it('drops non-string entries inside items', () => {
    expect(normalizeSkills([{ category: 'X', items: ['a', 1, null, 'b'] }])).toEqual([
      { category: 'X', items: ['a', 'b'] },
    ])
  })

  it('returns null for unrecognizable values', () => {
    expect(normalizeSkills('JavaScript, React')).toBeNull()
    expect(normalizeSkills(42)).toBeNull()
    expect(normalizeSkills(null)).toBeNull()
  })
})

describe('normalizeExperience', () => {
  it('passes well-formed entries through', () => {
    const entries = [
      { company: 'Acme', role: 'Eng', startDate: '2020', endDate: '2022', bullets: ['Did X'] },
    ]
    expect(normalizeExperience(entries)).toEqual(entries)
  })

  it('wraps a plain bullets string as a single bullet', () => {
    expect(normalizeExperience([{ company: 'A', bullets: 'Shipped the thing' }])).toEqual([
      { company: 'A', bullets: ['Shipped the thing'] },
    ])
  })

  it('splits a newline-joined bullets string', () => {
    expect(normalizeExperience([{ company: 'A', bullets: 'One\nTwo\n' }])).toEqual([
      { company: 'A', bullets: ['One', 'Two'] },
    ])
  })

  it('drops non-object entries', () => {
    expect(normalizeExperience(['stray', { company: 'A' }])).toEqual([{ company: 'A' }])
  })
})

describe('other sections', () => {
  it('education/certifications keep object entries and drop the rest', () => {
    expect(normalizeEducation([{ institution: 'U' }, 'x'])).toEqual([{ institution: 'U' }])
    expect(normalizeCertifications([{ name: 'Cert' }, 7])).toEqual([{ name: 'Cert' }])
  })

  it('languages coerce string entries into { name }', () => {
    expect(normalizeLanguages(['English', { name: 'German', proficiency: 'B2' }])).toEqual([
      { name: 'English', proficiency: '' },
      { name: 'German', proficiency: 'B2' },
    ])
  })

  it('projects force bullets to arrays', () => {
    expect(normalizeProjects([{ name: 'P', bullets: 'Built it' }])).toEqual([
      { name: 'P', bullets: ['Built it'] },
    ])
  })

  it('customSections force entries + nested bullets to arrays', () => {
    expect(
      normalizeCustomSections([
        { title: 'Awards', entries: { primary: 'Won', bullets: 'Big award' } },
      ]),
    ).toEqual([
      { title: 'Awards', entries: [{ primary: 'Won', bullets: ['Big award'] }] },
    ])
  })
})

describe('normalizeResumeWrite (AI tool-call boundary)', () => {
  const update = (data: Record<string, unknown>) => ({
    collection: 'resumes',
    recordId: 'r1',
    data,
  })

  it('ignores tools other than records.create/update and other collections', () => {
    const params = { collection: 'profiles', data: { skills: 'not json' } }
    expect(normalizeResumeWrite('records.update', params)).toEqual({ ok: true, params })
    const query = { collection: 'resumes', where: {} }
    expect(normalizeResumeWrite('records.query', query)).toEqual({ ok: true, params: query })
  })

  it('rewrites a JSON string with comma-joined items into canonical shape', () => {
    const res = normalizeResumeWrite(
      'records.update',
      update({ skills: '[{"category":"Languages","items":"Python, Java"}]' }),
    )
    if (!res.ok) throw new Error('expected ok')
    const data = res.params.data as Record<string, string>
    expect(JSON.parse(data.skills)).toEqual([
      { category: 'Languages', items: ['Python', 'Java'] },
    ])
  })

  it('stringifies a raw (non-JSON-encoded) array the AI forgot to encode', () => {
    const res = normalizeResumeWrite(
      'records.create',
      update({ experience: [{ company: 'A', bullets: ['x'] }] }),
    )
    if (!res.ok) throw new Error('expected ok')
    const data = res.params.data as Record<string, string>
    expect(JSON.parse(data.experience)).toEqual([{ company: 'A', bullets: ['x'] }])
  })

  it('stringifies a raw personalInfo object and keeps a valid JSON string', () => {
    const res = normalizeResumeWrite('records.update', update({ personalInfo: { name: 'J' } }))
    if (!res.ok) throw new Error('expected ok')
    expect(JSON.parse((res.params.data as Record<string, string>).personalInfo)).toEqual({
      name: 'J',
    })
  })

  it('rejects unparseable JSON with an instructive error naming the column', () => {
    const res = normalizeResumeWrite('records.update', update({ skills: '[{oops' }))
    if (res.ok) throw new Error('expected error')
    expect(res.error).toMatch(/skills/)
    expect(res.error).toMatch(/items/)
  })

  it('rejects unrecognizable section values', () => {
    const res = normalizeResumeWrite('records.update', update({ skills: '"just a string"' }))
    if (res.ok) throw new Error('expected error')
    expect(res.error).toMatch(/skills/)
  })

  it('rejects a non-string summary', () => {
    const res = normalizeResumeWrite('records.update', update({ summary: ['a'] }))
    if (res.ok) throw new Error('expected error')
    expect(res.error).toMatch(/summary/)
  })

  it('leaves untouched columns and empty strings alone', () => {
    const res = normalizeResumeWrite(
      'records.update',
      update({ title: 'My resume', skills: '', updatedAt: 5 }),
    )
    if (!res.ok) throw new Error('expected ok')
    const data = res.params.data as Record<string, unknown>
    expect(data.title).toBe('My resume')
    expect(data.skills).toBe('')
    expect(data.updatedAt).toBe(5)
  })
})
