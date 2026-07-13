/**
 * Home page — Dashboard with resume cards, template picker, and 3D robot.
 * Theme is derived from backgroundId: 'light' -> light, everything else -> dark.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Settings, Sun, Moon, Plus, FileText, User, Check, Globe, LogOut } from 'lucide-react'
import { useQuery, useUser, signOut } from 'deepspace'
import ThoughtBubble from '../components/robot/ThoughtBubble'
import ResumeCard from '../components/dashboard/ResumeCard'
import TemplateCard from '../components/dashboard/TemplateCard'
import PdfThumbnail from '../components/dashboard/PdfThumbnail'
import SettingsPanelContent from '../components/settings/SettingsPanelContent'
import { ProfileEditor } from '../components/profile'
import { ConfirmModal, SkeletonCard } from '../components/ui'
import { useTipRotation, useResumes, useProfiles, useEditorSettings } from '../hooks'
import type { Profile, Resume } from '../hooks'
import { useRobotContext } from '../hooks/useRobotContext'
import { themeForBackground } from '../utils/themeForBackground'
import { TEMPLATE_METADATA, DEFAULT_SETTINGS } from '../constants'
import type { TemplateMetadata } from '../constants'

function profileStats(profile: Profile) {
  const parts: string[] = []
  const exp = profile.data.experience?.length || 0
  const edu = profile.data.education?.length || 0
  const skills = profile.data.skills?.reduce((sum, g) => sum + (g.items?.length || 0), 0) || 0
  if (exp > 0) parts.push(`${exp} role${exp > 1 ? 's' : ''}`)
  if (edu > 0) parts.push(`${edu} degree${edu > 1 ? 's' : ''}`)
  if (skills > 0) parts.push(`${skills} skill${skills > 1 ? 's' : ''}`)
  return parts.join(' · ') || 'No data yet'
}

interface ProfileOptionRowProps {
  variant: 'blank' | 'profile'
  title: string
  meta: string
  isSelected: boolean
  onClick: () => void
}

function ProfileOptionRow({
  variant,
  title,
  meta,
  isSelected,
  onClick,
}: ProfileOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`resume-studio-option ${isSelected ? 'selected' : ''}`}
      aria-pressed={isSelected}
    >
      <div className={`resume-studio-option-accent ${isSelected ? 'selected' : ''}`} aria-hidden="true" />
      <div className={`resume-studio-option-icon ${variant} ${isSelected ? 'selected' : ''}`}>
        {variant === 'blank' ? <FileText className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="resume-studio-option-title">{title}</p>
        <p className="resume-studio-option-meta">{meta}</p>
      </div>
      <div className={`resume-studio-option-check ${isSelected ? 'selected' : ''}`} aria-hidden="true">
        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
      </div>
    </button>
  )
}

type Tab = 'resumes' | 'templates'
type PanelMode = 'browser' | 'settings' | 'profileSelect'

export default function HomePage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useEditorSettings()

  // Theme sync lives at AppShell level (src/pages/_app.tsx); re-syncing
  // here would flash the pre-load default over the correct theme during
  // navigation. Still derive `isDark` for the sun/moon toggle UI.
  const isDark = themeForBackground(settings.backgroundId) === 'dark'

  const previousBgRef = useRef<string>(settings.backgroundId)

  if (settings.backgroundId !== 'light') {
    previousBgRef.current = settings.backgroundId
  }

  const handleToggleDark = useCallback(() => {
    if (isDark) {
      updateSetting('backgroundId', 'light')
    } else {
      const restoreTo = previousBgRef.current !== 'light'
        ? previousBgRef.current
        : DEFAULT_SETTINGS.backgroundId
      updateSetting('backgroundId', restoreTo)
    }
  }, [isDark, updateSetting])

  const handleOpenEditor = useCallback((resumeId: string) => {
    updateSetting('activeResumeId', resumeId)
    navigate(`/editor/${resumeId}`)
  }, [navigate, updateSetting])

  const [activeTab, setActiveTab] = useState<Tab>('templates')
  const [panelMode, setPanelMode] = useState<PanelMode>('browser')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<string | 'blank'>('blank')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  const { robotRef, setRobotHost } = useRobotContext()
  const { currentTip, visible, robotRef: tipRobotRef, rotateTip } = useTipRotation()
  const { resumes, isReady: resumesReady, createResume, updateResume, deleteResume } = useResumes()

  const { user } = useUser()
  const { records: versionRecords, status: versionsStatus } = useQuery('resume-versions')
  const latestPdfByResume = useMemo<Record<string, string>>(() => {
    if (!user || versionsStatus !== 'ready') return {}
    const map: Record<string, { pdfData: string; versionNum: number }> = {}
    for (const r of versionRecords) {
      if (r.createdBy !== user.id) continue
      // `records[].data` is `unknown` from the SDK (schema-agnostic). Narrow
      // at the access site; the schema guarantees these three fields exist.
      const data = r.data as { resumeId?: string; versionNum?: number; pdfData?: string }
      const resumeId = data.resumeId
      const versionNum = data.versionNum
      const pdfData = data.pdfData
      if (!resumeId || !pdfData || typeof versionNum !== 'number') continue
      if (!map[resumeId] || versionNum > map[resumeId].versionNum) {
        map[resumeId] = { pdfData, versionNum }
      }
    }
    const result: Record<string, string> = {}
    for (const [id, v] of Object.entries(map)) result[id] = v.pdfData
    return result
  }, [versionRecords, versionsStatus, user])

  const robotSlotRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    tipRobotRef.current = robotRef.current
  })

  useEffect(() => {
    const slot = robotSlotRef.current
    if (!slot) return
    const handler = () => rotateTip()
    slot.addEventListener('click', handler)
    return () => slot.removeEventListener('click', handler)
  }, [rotateTip])

  useEffect(() => {
    const slot = robotSlotRef.current
    if (!slot) return

    setRobotHost(slot)
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))

    return () => {
      setRobotHost(null)
    }
  }, [setRobotHost])

  const { profiles, createProfile } = useProfiles()
  const activeProfile =
    selectedProfile === 'blank'
      ? null
      : profiles.find((profile: Profile) => profile.recordId === selectedProfile) ?? null
  const effectiveSelectedProfile = activeProfile ? activeProfile.recordId : 'blank'
  const isStartingBlank = effectiveSelectedProfile === 'blank'
  const selectedProfileLabel =
    activeProfile?.data.title?.trim() ||
    activeProfile?.data.personalInfo?.name ||
    'Selected profile'
  const createResumeLabel = isStartingBlank ? 'Start with blank resume' : 'Use selected profile'
  const selectedResumeStartLabel = isStartingBlank ? 'Blank resume' : selectedProfileLabel

  useEffect(() => {
    if (selectedProfile !== 'blank' && !activeProfile) {
      setSelectedProfile('blank')
    }
  }, [selectedProfile, activeProfile])

  const handleTemplateClick = (template: TemplateMetadata) => {
    setSelectedTemplate(template)
    setSelectedProfile('blank')
    setPanelMode('profileSelect')
  }

  const handleBackFromProfileSelect = () => {
    setPanelMode('browser')
    setSelectedTemplate(null)
  }

  const handleCreateResume = async () => {
    if (!selectedTemplate) return
    setCreating(true)

    const profileId = activeProfile ? activeProfile.recordId : null
    const profile = activeProfile

    try {
      const id = await createResume({
        title: selectedTemplate.name + ' Resume',
        templateId: selectedTemplate.id,
        profileData: profile?.data,
        sourceProfileId: profileId || '',
      })

      setPanelMode('browser')
      setSelectedTemplate(null)

      if (id) {
        handleOpenEditor(id)
      }
    } catch (error) {
      console.error('Failed to create resume from the selected template.', error)
    } finally {
      setCreating(false)
    }
  }

  const handleProfileSaved = async (data: {
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
  }) => {
    const newId = await createProfile(data)
    setEditorOpen(false)
    if (newId) {
      setSelectedProfile(newId)
    }
  }

  const handleRenameResume = (id: string, newTitle: string) => {
    updateResume(id, { title: newTitle })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteResume(id)
    } catch (err) {
      console.error('[deleteResume] failed:', err)
    }
  }

  return (
    <div className="h-full flex min-h-0">
      {/* Left rail */}
      <div
        className="flex flex-col flex-shrink-0 self-stretch"
        style={{ width: 280 }}
      >
        <div className="flex items-center px-5 py-3">
          <span className="wordmark text-content text-2xl drop-shadow-sm">Resume</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3">
          <ThoughtBubble text={currentTip} visible={visible} />
          <div
            ref={robotSlotRef}
            style={{ width: 260, height: 280, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-h-0 p-4 pl-2">
        <div className="flex-1 flex flex-col min-h-0 glass-content-panel rounded-2xl">
          {/* Header */}
          <div
            className={
              panelMode === 'profileSelect'
                ? 'flex items-center justify-between px-6 pt-5 pb-4'
                : 'flex items-center justify-between px-4 pt-4 pb-2'
            }
          >
            {panelMode === 'browser' ? (
              <>
                <div className="flex rounded-lg p-0.5 glass-tab-bar">
                  <button
                    onClick={() => setActiveTab('resumes')}
                    className={`home-tab ${activeTab === 'resumes' ? 'active' : ''}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    My Resumes
                    {resumesReady && resumes.length > 0 ? (
                      <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {resumes.length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`home-tab ${activeTab === 'templates' ? 'active' : ''}`}
                  >
                    Templates
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleToggleDark}
                    className="toolbar-btn"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setPanelMode('settings')}
                    className="toolbar-btn"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void signOut()}
                    className="toolbar-btn"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : panelMode === 'settings' ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPanelMode('browser')}
                  className="toolbar-btn"
                  title="Back to templates and resumes"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-content">Settings</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackFromProfileSelect}
                  className="toolbar-btn"
                  title="Back to templates"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-content">
                    Template Setup
                  </span>
                  <span className="truncate text-sm font-semibold text-content">
                    {selectedTemplate ? selectedTemplate.name : 'Create Resume'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {panelMode === 'browser' ? (
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {activeTab === 'resumes' ? (
                <>
                  {!resumesReady ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                      {[1, 2, 3].map(i => (
                        <SkeletonCard key={i} hasImage className="h-40" />
                      ))}
                    </div>
                  ) : resumes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <FileText className="w-10 h-10 text-content-tertiary mb-3" />
                      <p className="text-content-secondary text-sm font-medium">No resumes yet</p>
                      <p className="text-content-tertiary text-xs mt-1">
                        Go to Templates to create your first resume
                      </p>
                      <button
                        onClick={() => setActiveTab('templates')}
                        className="btn-primary btn-sm mt-3 inline-flex gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Browse Templates
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                      {resumes.map((resume: Resume) => (
                        <ResumeCard
                          key={resume.recordId}
                          resume={resume}
                          onClick={() => handleOpenEditor(resume.recordId)}
                          onDelete={() => setDeleteTarget(resume.recordId)}
                          onRename={newTitle => handleRenameResume(resume.recordId, newTitle)}
                          latestPdfBase64={latestPdfByResume[resume.recordId]}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {TEMPLATE_METADATA.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => handleTemplateClick(template)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : panelMode === 'settings' ? (
            <SettingsPanelContent />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-6">
              <div className={`resume-studio-layout ${selectedTemplate ? '' : 'resume-studio-layout-single'}`}>
                {/* Left: template preview stage */}
                {selectedTemplate && (
                  <section className="resume-studio-preview-pane">
                    <div className="resume-studio-paper-stage">
                      <div className="resume-studio-paper-scroll">
                        <PdfThumbnail
                          url={selectedTemplate.previewUrl}
                          fill
                          displayMode="full-width"
                          className="resume-studio-preview-image shadow-none rounded-[20px]"
                        />
                      </div>
                    </div>

                    <div className="resume-studio-preview-footer">
                      <span className="resume-studio-region-pill">
                        <Globe className="w-3.5 h-3.5" />
                        {selectedTemplate.region}
                      </span>
                    </div>
                  </section>
                )}

                {/* Right: selector rail with list + CTA */}
                <aside className="resume-studio-rail">
                  <div className="resume-studio-rail-header">
                    <div className="min-w-0">
                      <p className="resume-studio-eyebrow">Choose a Profile</p>
                      <h3 className="resume-studio-rail-title">Pick a starting point</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorOpen(true)}
                      className="resume-studio-add-profile"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Profile
                    </button>
                  </div>

                  <p className="resume-studio-rail-description">
                    Editing the resume never changes the original profile.
                  </p>

                  <div className="resume-studio-list-shell">
                    <div className="resume-studio-list" aria-label="Choose a profile">
                      <ProfileOptionRow
                        variant="blank"
                        title="Start from scratch"
                        meta="Empty resume, filled out manually in the editor."
                        isSelected={isStartingBlank}
                        onClick={() => setSelectedProfile('blank')}
                      />

                      {profiles.length > 0 ? (
                        <>
                          <div className="resume-studio-divider">
                            <span>Your profiles</span>
                          </div>
                          {profiles.map((profile: Profile) => {
                            const isSelected = effectiveSelectedProfile === profile.recordId
                            const name = profile.data.personalInfo?.name
                            const stats = profileStats(profile)
                            const title = profile.data.title?.trim() || 'Untitled profile'

                            return (
                              <ProfileOptionRow
                                key={profile.recordId}
                                variant="profile"
                                title={title}
                                meta={name ? `${name} · ${stats}` : stats}
                                isSelected={isSelected}
                                onClick={() => setSelectedProfile(profile.recordId)}
                              />
                            )
                          })}
                        </>
                      ) : (
                        <p className="resume-studio-empty-note">
                          No saved profiles yet. Add one if you want personal info, experience, and skills prefilled.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="resume-studio-cta-footer">
                    <div className="resume-studio-selection-summary">
                      <span className="resume-studio-selection-kicker">Selected</span>
                      <p className="resume-studio-selection-title">{selectedResumeStartLabel}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateResume}
                      disabled={creating || !selectedTemplate}
                      className="resume-studio-cta-button"
                      title="Create resume"
                    >
                      {creating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                          <span>Creating resume...</span>
                        </>
                      ) : (
                        <>
                          <span>{createResumeLabel}</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Profile Editor (single modal layer) */}
      <ProfileEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        profile={null}
        onSave={handleProfileSaved}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete resume?"
        description="This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
