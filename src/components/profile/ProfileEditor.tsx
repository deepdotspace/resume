/**
 * ProfileEditor — Full form for editing a profile (modal).
 *
 * Reuses form section components. Used for Add Profile and Edit Profile.
 */

import React, { useState, useCallback } from 'react'
import { Modal, Button } from '../ui'
import { ResumeUpload } from '../upload/ResumeUpload'
import {
  SectionAccordion,
  PersonalInfoForm,
  SummaryForm,
  ExperienceForm,
  EducationForm,
  SkillsForm,
  LanguagesForm,
  ProjectsForm,
  CertificationsForm,
  CustomSectionsForm,
} from '../form'
import { SECTION_LABELS, DEFAULT_SECTION_ORDER } from '../../constants'
import type { SectionKey } from '../../constants'
import type { Profile } from '../../hooks'
import type { ResumeFormData } from '../../templates'

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

function profileToFormData(profile: Profile | null): ResumeFormData {
  if (!profile) {
    return {
      personalInfo: { ...DEFAULT_PERSONAL_INFO },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      projects: [],
      customSections: [],
    }
  }
  const d = profile.data
  return {
    personalInfo: d.personalInfo ?? { ...DEFAULT_PERSONAL_INFO },
    summary: d.summary ?? '',
    experience: d.experience ?? [],
    education: d.education ?? [],
    skills: d.skills ?? [],
    languages: d.languages ?? [],
    certifications: d.certifications ?? [],
    projects: d.projects ?? [],
    customSections: d.customSections ?? [],
  }
}

interface ProfileEditorProps {
  open: boolean
  onClose: () => void
  profile: Profile | null
  onSave: (data: {
    title: string
    personalInfo: Profile['data']['personalInfo']
    summary: string
    experience: Profile['data']['experience']
    education: Profile['data']['education']
    skills: Profile['data']['skills']
    languages: Profile['data']['languages']
    certifications: Profile['data']['certifications']
    projects: Profile['data']['projects']
    customSections: Profile['data']['customSections']
  }) => void
}

export function ProfileEditor({ open, onClose, profile, onSave }: ProfileEditorProps) {
  const [profileName, setProfileName] = useState(profile?.data.title ?? '')
  const [formData, setFormData] = useState<ResumeFormData>(() => profileToFormData(profile))
  const [saving, setSaving] = useState(false)
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set())
  const [uploadUsed, setUploadUsed] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)

  React.useEffect(() => {
    if (open) {
      setProfileName(profile?.data.title ?? '')
      setFormData(profileToFormData(profile))
      setOpenSections(new Set())
      setUploadUsed(false)
      setIsParsingResume(false)
    }
  }, [open, profile])

  const updateField = useCallback(<K extends keyof ResumeFormData>(key: K, value: ResumeFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleUploadParsed = useCallback((data: ResumeFormData) => {
    setFormData(prev => ({
      personalInfo: { ...prev.personalInfo, ...data.personalInfo },
      summary: data.summary ?? prev.summary,
      experience: data.experience ?? prev.experience,
      education: data.education ?? prev.education,
      skills: data.skills ?? prev.skills,
      languages: data.languages ?? prev.languages,
      certifications: data.certifications ?? prev.certifications,
      projects: data.projects ?? prev.projects,
      customSections: data.customSections ?? prev.customSections,
    }))
    if (data.personalInfo?.name && !profileName.trim()) {
      setProfileName(data.personalInfo.name)
    }
    setUploadUsed(true)
  }, [profileName])

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    onSave({
      title: profileName.trim() || formData.personalInfo?.name || 'Untitled Profile',
      personalInfo: formData.personalInfo ?? DEFAULT_PERSONAL_INFO,
      summary: formData.summary,
      experience: formData.experience,
      education: formData.education,
      skills: formData.skills,
      languages: formData.languages,
      certifications: formData.certifications,
      projects: formData.projects,
      customSections: formData.customSections,
    })
    setSaving(false)
    onClose()
  }

  const sectionOrder = DEFAULT_SECTION_ORDER

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      overlayAnimated={false}
      panelClassName="profile-editor-modal-panel"
    >
      <Modal.Header onClose={onClose}>
        <Modal.Title>{profile ? 'Edit profile' : 'Add profile'}</Modal.Title>
        <Modal.Description>
          {profile ? 'Update your career data.' : 'Create a new reusable profile.'}
        </Modal.Description>
      </Modal.Header>

      <Modal.Body className="max-h-[60vh] overflow-y-auto">
        <div className="mb-4">
          <label className="block text-xs font-medium text-content-secondary uppercase tracking-wider mb-1.5">
            Profile name
          </label>
          <input
            type="text"
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder="e.g. Frontend Dev, Data Science"
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-content text-sm placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        <ResumeUpload
          onParsed={handleUploadParsed}
          collapsed={uploadUsed}
          onParsingChange={setIsParsingResume}
        />

        <div className="space-y-1">
          {sectionOrder.map(key => {
            const isOpen = openSections.has(key)
            const count =
              key === 'experience' ? (formData.experience?.length ?? 0)
              : key === 'education' ? (formData.education?.length ?? 0)
              : key === 'skills' ? (formData.skills?.length ?? 0)
              : key === 'languages' ? (formData.languages?.length ?? 0)
              : key === 'projects' ? (formData.projects?.length ?? 0)
              : key === 'certifications' ? (formData.certifications?.length ?? 0)
              : key === 'customSections' ? (formData.customSections?.length ?? 0)
              : undefined

            return (
              <SectionAccordion
                key={key}
                title={SECTION_LABELS[key]}
                isOpen={isOpen}
                onToggle={() => toggleSection(key)}
                count={count}
                required={key === 'personalInfo'}
              >
                {key === 'personalInfo' && (
                  <PersonalInfoForm
                    value={formData.personalInfo}
                    onChange={v => updateField('personalInfo', v)}
                    showEuropassFields
                  />
                )}
                {key === 'summary' && (
                  <SummaryForm
                    value={formData.summary}
                    onChange={v => updateField('summary', v)}
                  />
                )}
                {key === 'experience' && (
                  <ExperienceForm
                    value={formData.experience}
                    onChange={v => updateField('experience', v)}
                  />
                )}
                {key === 'education' && (
                  <EducationForm
                    value={formData.education}
                    onChange={v => updateField('education', v)}
                  />
                )}
                {key === 'skills' && (
                  <SkillsForm
                    value={formData.skills}
                    onChange={v => updateField('skills', v)}
                  />
                )}
                {key === 'languages' && (
                  <LanguagesForm
                    value={formData.languages}
                    onChange={v => updateField('languages', v)}
                    showEuropassFields
                  />
                )}
                {key === 'projects' && (
                  <ProjectsForm
                    value={formData.projects}
                    onChange={v => updateField('projects', v)}
                  />
                )}
                {key === 'certifications' && (
                  <CertificationsForm
                    value={formData.certifications}
                    onChange={v => updateField('certifications', v)}
                  />
                )}
                {key === 'customSections' && (
                  <CustomSectionsForm
                    value={formData.customSections}
                    onChange={v => updateField('customSections', v)}
                  />
                )}
              </SectionAccordion>
            )
          })}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onClose} disabled={saving || isParsingResume}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={isParsingResume}>
          {isParsingResume ? 'Parsing resume…' : 'Save profile'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
