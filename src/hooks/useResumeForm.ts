/**
 * useResumeForm — load a resume by ID, parse JSON fields into form state, and
 * provide debounced persistence that writes back to the record.
 *
 * Persist contract:
 *   - `persist` always writes to `resumeIdRef.current`, NOT a closure value, so
 *     the cleanup/unmount flush never writes to a stale id even if a user
 *     switched resumes while a debounce was still pending.
 *   - On resume switch we drain any pending write to the OLD id first, then
 *     hydrate form state from the NEW record.
 *   - We re-sync from storage only when the record's `updatedAt` bumps past
 *     our last-synced mark AND there's nothing pending locally — so external
 *     writes (e.g. the AI agent) show up without clobbering unsaved edits.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useResumes } from './useResumes'
import type { ResumeFormData } from '../templates'
import type { Resume } from './useResumes'
import { DEFAULT_SECTION_ORDER } from '../constants'
import type { SectionKey } from '../constants'

const DEFAULT_PERSONAL_INFO = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  website: '',
  linkedin: '',
  photo: '',
}

function safeJson<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

function resumeToFormData(resume: Resume | null): ResumeFormData | null {
  if (!resume) return null
  const d = resume.data
  return {
    personalInfo: safeJson(d.personalInfo, DEFAULT_PERSONAL_INFO),
    summary: (d.summary as string) || '',
    experience: safeJson(d.experience, []),
    education: safeJson(d.education, []),
    skills: safeJson(d.skills, []),
    languages: safeJson(d.languages, []),
    certifications: safeJson(d.certifications, []),
    projects: safeJson(d.projects, []),
    customSections: safeJson(d.customSections, []),
  }
}

export function useResumeForm(resumeId: string | null) {
  const { resumes, isReady, updateResume } = useResumes()

  const resume = useMemo<Resume | null>(() => {
    if (!resumeId || !isReady) return null
    return resumes.find(r => r.recordId === resumeId) ?? null
  }, [resumes, resumeId, isReady])

  const [formData, setFormData] = useState<ResumeFormData | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<ResumeFormData | null>(null)
  const prevRecordIdRef = useRef<string | null>(null)
  const lastSyncedAt = useRef<number>(0)

  // The live resumeId is held in a ref so `persist` and cleanup effects
  // never capture a stale closure. When the user switches resumes mid-
  // debounce, the flush below drains pending writes against the id that
  // was active when the write was queued.
  const persistIdRef = useRef<string | null>(null)

  const storageTimestamp = resume?.data.updatedAt ?? 0

  // persist(data, id) — writes against the id we were editing when the
  // debounce fired, not the current one. `updateResume` is stable.
  const persist = useCallback((data: ResumeFormData, id: string) => {
    updateResume(id, {
      personalInfo: JSON.stringify(data.personalInfo),
      summary: data.summary,
      experience: JSON.stringify(data.experience),
      education: JSON.stringify(data.education),
      skills: JSON.stringify(data.skills),
      languages: JSON.stringify(data.languages),
      certifications: JSON.stringify(data.certifications),
      projects: JSON.stringify(data.projects),
      customSections: JSON.stringify(data.customSections),
    })
    lastSyncedAt.current = Date.now()
    pendingRef.current = null
    debounceRef.current = null
  }, [updateResume])

  const flushPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (pendingRef.current && persistIdRef.current) {
      persist(pendingRef.current, persistIdRef.current)
    }
  }, [persist])

  // Hydrate / re-sync from the record. On id change, flush pending writes
  // to the OLD id first, THEN swap state.
  useEffect(() => {
    const rid = resume?.recordId ?? null
    const isNewResume = prevRecordIdRef.current !== rid

    if (isNewResume) {
      flushPending()
      prevRecordIdRef.current = rid
      persistIdRef.current = rid
      lastSyncedAt.current = storageTimestamp
      setFormData(resumeToFormData(resume))
      return
    }

    // Re-sync from storage when an external writer (e.g. the AI agent)
    // bumps `updatedAt`. Guard against clobbering unsaved edits.
    if (
      storageTimestamp > lastSyncedAt.current &&
      !pendingRef.current &&
      !debounceRef.current
    ) {
      lastSyncedAt.current = storageTimestamp
      setFormData(resumeToFormData(resume))
    }
  }, [resume, storageTimestamp, flushPending])

  const updateField = useCallback(<K extends keyof ResumeFormData>(
    key: K,
    value: ResumeFormData[K]
  ) => {
    setFormData(prev => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      pendingRef.current = next
      const scheduledFor = persistIdRef.current

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current && scheduledFor) persist(pendingRef.current, scheduledFor)
      }, 500)

      return next
    })
  }, [persist])

  // Unmount flush — mount-only effect so it doesn't re-register on every
  // `persist` identity change. Reads refs, which always carry the live state.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (pendingRef.current && persistIdRef.current) {
        persist(pendingRef.current, persistIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sectionOrder = useMemo((): SectionKey[] => {
    if (!resume?.data.sectionOrder) return DEFAULT_SECTION_ORDER
    // Clone — `safeJson` can return the shared `DEFAULT_SECTION_ORDER`
    // fallback, and pushing into that would corrupt the module constant.
    const stored = [...safeJson<SectionKey[]>(resume.data.sectionOrder, DEFAULT_SECTION_ORDER)]
    for (const key of DEFAULT_SECTION_ORDER) {
      if (!stored.includes(key)) stored.push(key)
    }
    return stored
  }, [resume?.data.sectionOrder])

  return {
    formData,
    updateField,
    isReady,
    resume,
    sectionOrder,
  }
}
