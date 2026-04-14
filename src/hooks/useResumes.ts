/**
 * useResumes — CRUD operations for the resumes collection.
 */

import { useMemo, useCallback } from 'react'
import { useQuery, useMutations, useUser } from 'deepspace'
import type { ProfileData } from './useProfiles'

export interface ResumeData {
  title: string
  templateId: string
  sourceProfileId: string
  personalInfo: string
  summary: string
  experience: string
  education: string
  skills: string
  languages: string
  certifications: string
  projects: string
  customSections: string
  sectionOrder: string
  latexSource: string
  latexOverrideMode: boolean
  jobDescription: string
  lastCompiledAt: number
  status: string
  createdAt: number
  updatedAt: number
}

export interface Resume {
  recordId: string
  data: ResumeData
}

export function useResumes() {
  const { user } = useUser()
  const { records, status } = useQuery('resumes')
  const { createConfirmed, put, remove } = useMutations('resumes')

  const resumes = useMemo<Resume[]>(() => {
    if (!user || status !== 'ready') return []
    return records
      .filter(r => r.createdBy === user.id)
      .map(r => ({ recordId: r.recordId, data: r.data as ResumeData }))
      .sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0))
  }, [records, status, user])

  const createResume = useCallback(
    async (opts: {
      title: string
      templateId: string
      profileData?: Partial<ProfileData>
      sourceProfileId?: string
    }): Promise<string | null> => {
      const now = Date.now()
      const pd = opts.profileData
      const record: Record<string, unknown> = {
        title: opts.title,
        templateId: opts.templateId,
        sourceProfileId: opts.sourceProfileId || '',
        personalInfo: pd?.personalInfo ? JSON.stringify(pd.personalInfo) : '{}',
        summary: pd?.summary || '',
        experience: pd?.experience ? JSON.stringify(pd.experience) : '[]',
        education: pd?.education ? JSON.stringify(pd.education) : '[]',
        skills: pd?.skills ? JSON.stringify(pd.skills) : '[]',
        languages: pd?.languages ? JSON.stringify(pd.languages) : '[]',
        certifications: pd?.certifications ? JSON.stringify(pd.certifications) : '[]',
        projects: pd?.projects ? JSON.stringify(pd.projects) : '[]',
        customSections: pd?.customSections ? JSON.stringify(pd.customSections) : '[]',
        sectionOrder: JSON.stringify(['personalInfo', 'summary', 'experience', 'education', 'skills', 'languages', 'projects', 'certifications', 'customSections']),
        latexSource: '',
        latexOverrideMode: false,
        jobDescription: '',
        lastCompiledAt: 0,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      }
      try {
        return await createConfirmed(record)
      } catch {
        return null
      }
    },
    [createConfirmed],
  )

  const updateResume = useCallback(
    (id: string, partial: Partial<ResumeData>) => {
      put(id, { ...partial, updatedAt: Date.now() } as Record<string, unknown>)
    },
    [put],
  )

  const deleteResume = useCallback(
    (id: string) => {
      remove(id)
    },
    [remove],
  )

  return {
    resumes,
    isReady: status === 'ready',
    createResume,
    updateResume,
    deleteResume,
  }
}
