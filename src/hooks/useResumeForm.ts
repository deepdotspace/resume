/**
 * useResumeForm — load resume by ID, parse JSON fields, provide form state + persisted updates.
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

  const initialFormData = resumeToFormData(resume)
  const [formData, setFormData] = useState<ResumeFormData | null>(initialFormData)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<ResumeFormData | null>(null)
  const prevRecordIdRef = useRef<string | null>(null)
  const lastSyncedAt = useRef<number>(0)

  const storageTimestamp = resume?.data.updatedAt ?? 0

  useEffect(() => {
    const rid = resume?.recordId ?? null
    const isNewResume = prevRecordIdRef.current !== rid

    if (isNewResume) {
      prevRecordIdRef.current = rid
      lastSyncedAt.current = storageTimestamp
      setFormData(resumeToFormData(resume))
      return
    }

    // Re-sync from storage when an external source (e.g. agent via `call`) updates the record,
    // but only if the user has no local edits in flight.
    // Use > to ignore echoes from our own writes (persist sets lastSyncedAt to Date.now()
    // which is >= the timestamp updateResume stamps on the record).
    if (
      storageTimestamp > lastSyncedAt.current &&
      !pendingRef.current &&
      !debounceRef.current
    ) {
      lastSyncedAt.current = storageTimestamp
      setFormData(resumeToFormData(resume))
    }
  }, [resume, storageTimestamp])

  const persist = useCallback((data: ResumeFormData) => {
    if (!resumeId) return
    updateResume(resumeId, {
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
    // Mark that we just wrote — the storage echo will carry a timestamp >= this value,
    // so bump lastSyncedAt high enough to suppress the redundant re-sync
    lastSyncedAt.current = Date.now()
    pendingRef.current = null
    debounceRef.current = null
  }, [resumeId, updateResume])

  const updateField = useCallback(<K extends keyof ResumeFormData>(
    key: K,
    value: ResumeFormData[K]
  ) => {
    setFormData(prev => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      pendingRef.current = next

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current) persist(pendingRef.current)
      }, 500)

      return next
    })
  }, [persist])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (pendingRef.current) persist(pendingRef.current)
    }
  }, [persist])

  const sectionOrder = useMemo((): SectionKey[] => {
    if (!resume?.data.sectionOrder) return DEFAULT_SECTION_ORDER
    const stored = safeJson<SectionKey[]>(resume.data.sectionOrder, DEFAULT_SECTION_ORDER)
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
