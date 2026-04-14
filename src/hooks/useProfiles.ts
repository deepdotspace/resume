/**
 * useProfiles — CRUD operations for the profiles collection.
 *
 * Returns the user's own profiles with create / update / remove helpers.
 */

import { useMemo, useCallback } from 'react'
import { useQuery, useMutations, useUser } from 'deepspace'

export interface PersonalInfo {
  name: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  photo: string
}

export interface ExperienceEntry {
  company: string
  role: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa: string
}

export interface SkillGroup {
  category: string
  items: string[]
}

export interface LanguageEntry {
  name: string
  proficiency: string
}

export interface CertificationEntry {
  name: string
  issuer: string
  date: string
}

export interface ProjectEntry {
  name: string
  description: string
  url: string
  bullets: string[]
}

export interface CustomEntry {
  primary: string
  secondary: string
  date: string
  bullets: string[]
}

export interface CustomSection {
  title: string
  entries: CustomEntry[]
}

export interface ProfileData {
  title: string
  personalInfo: PersonalInfo
  summary: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillGroup[]
  languages: LanguageEntry[]
  certifications: CertificationEntry[]
  projects: ProjectEntry[]
  customSections: CustomSection[]
  createdAt: number
  updatedAt: number
}

export interface Profile {
  recordId: string
  data: ProfileData
}

function parseProfile(record: { recordId: string; data: Record<string, unknown> }): Profile {
  const d = record.data
  return {
    recordId: record.recordId,
    data: {
      title: (d.title as string) || 'Untitled Profile',
      personalInfo: safeJson(d.personalInfo as string, {
        name: '', title: '', email: '', phone: '',
        location: '', website: '', linkedin: '', photo: '',
      }),
      summary: (d.summary as string) || '',
      experience: safeJson(d.experience as string, []),
      education: safeJson(d.education as string, []),
      skills: safeJson(d.skills as string, []),
      languages: safeJson(d.languages as string, []),
      certifications: safeJson(d.certifications as string, []),
      projects: safeJson(d.projects as string, []),
      customSections: safeJson(d.customSections as string, []),
      createdAt: (d.createdAt as number) || Date.now(),
      updatedAt: (d.updatedAt as number) || Date.now(),
    },
  }
}

function safeJson<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

function serializeProfileData(data: Omit<ProfileData, 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    title: data.title,
    personalInfo: JSON.stringify(data.personalInfo),
    summary: data.summary,
    experience: JSON.stringify(data.experience),
    education: JSON.stringify(data.education),
    skills: JSON.stringify(data.skills),
    languages: JSON.stringify(data.languages),
    certifications: JSON.stringify(data.certifications),
    projects: JSON.stringify(data.projects),
    customSections: JSON.stringify(data.customSections ?? []),
  }
}

export function useProfiles() {
  const { user } = useUser()
  const { records, status } = useQuery('profiles')
  const { create, put, remove } = useMutations('profiles')

  const profiles = useMemo<Profile[]>(() => {
    if (!user || status !== 'ready') return []
    return records
      .filter(r => r.createdBy === user.id)
      .map(r => parseProfile(r as { recordId: string; data: Record<string, unknown> }))
      .sort((a, b) => b.data.updatedAt - a.data.updatedAt)
  }, [records, status, user])

  const createProfile = useCallback(
    async (data: Omit<ProfileData, 'createdAt' | 'updatedAt'>): Promise<string | null> => {
      const now = Date.now()
      const serialized = {
        ...serializeProfileData(data),
        createdAt: now,
        updatedAt: now,
      }
      return create(serialized)
    },
    [create],
  )

  const updateProfile = useCallback(
    (id: string, data: Partial<Omit<ProfileData, 'createdAt' | 'updatedAt'>>) => {
      const partial: Record<string, unknown> = { updatedAt: Date.now() }
      if (data.title !== undefined) partial.title = data.title
      if (data.personalInfo !== undefined) partial.personalInfo = JSON.stringify(data.personalInfo)
      if (data.summary !== undefined) partial.summary = data.summary
      if (data.experience !== undefined) partial.experience = JSON.stringify(data.experience)
      if (data.education !== undefined) partial.education = JSON.stringify(data.education)
      if (data.skills !== undefined) partial.skills = JSON.stringify(data.skills)
      if (data.languages !== undefined) partial.languages = JSON.stringify(data.languages)
      if (data.certifications !== undefined) partial.certifications = JSON.stringify(data.certifications)
      if (data.projects !== undefined) partial.projects = JSON.stringify(data.projects)
      if (data.customSections !== undefined) partial.customSections = JSON.stringify(data.customSections)
      put(id, partial)
    },
    [put],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      remove(id)
    },
    [remove],
  )

  const duplicateProfile = useCallback(
    async (id: string): Promise<string | null> => {
      const p = profiles.find(pr => pr.recordId === id)
      if (!p) return null
      const title = `${p.data.title} (copy)`
      return createProfile({
        title,
        personalInfo: p.data.personalInfo,
        summary: p.data.summary,
        experience: p.data.experience,
        education: p.data.education,
        skills: p.data.skills,
        languages: p.data.languages,
        certifications: p.data.certifications,
        projects: p.data.projects,
        customSections: p.data.customSections,
      })
    },
    [profiles, createProfile],
  )

  return {
    profiles,
    isReady: status === 'ready',
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
  }
}
