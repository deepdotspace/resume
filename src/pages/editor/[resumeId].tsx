/**
 * Editor page — `/editor/:resumeId`
 *
 * Loads a resume by URL param and renders the split-pane form editor.
 * Handles missing/deleted resumes by redirecting to /home.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Play, Download, Save, Sparkles, SquarePen, X } from 'lucide-react'
import { useEditorSettings, useResumes, useProfiles, useResumeForm, useCompilation, usePanelResize, useLatexGenerator, useLatexOverride, useVersionHistory } from '../../hooks'
import { useThemeSync } from '../../hooks/useThemeSync'
import { themeForBackground } from '../../utils/themeForBackground'
import { ResizeDivider } from '../../components/shared/ResizeDivider'
import { CompileLog } from '../../components/shared/CompileLog'
import SaveProfileModal from '../../components/shared/SaveProfileModal'
import { PdfPreview, LatexPreview, PreviewToggle, OverrideBanner } from '../../components/preview'
import { ResumeUpload } from '../../components/upload/ResumeUpload'
import { SectionAccordion, PersonalInfoForm, SummaryForm, ExperienceForm, EducationForm, SkillsForm, LanguagesForm, ProjectsForm, CertificationsForm, CustomSectionsForm } from '../../components/form'
import { Button, ConfirmModal, useToast } from '../../components/ui'
import TargetJobPanel from '../../components/shared/TargetJobPanel'
import { ChatPanel } from '../../components/ai-chat/ChatPanel'
import { TEMPLATE_METADATA, SECTION_LABELS } from '../../constants'
import { parsePhotoDataUrl } from '../../utils/compressImage'
import type { SectionKey } from '../../constants'
import type { TemplateId } from '../../templates'
import type { ResumeFormData } from '../../templates'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function EditorPage() {
  const { resumeId } = useParams<{ resumeId: string }>()
  const navigate = useNavigate()
  const { settings, updateSetting } = useEditorSettings()
  const { resumes, isReady: resumesReady, updateResume } = useResumes()
  const { profiles, updateProfile, createProfile } = useProfiles()

  const derivedTheme = themeForBackground(settings.backgroundId)
  useThemeSync(derivedTheme)
  const isDark = derivedTheme === 'dark'

  const resumeExists = useMemo(() => {
    if (!resumesReady || !resumeId) return undefined
    return resumes.some(r => r.recordId === resumeId)
  }, [resumes, resumesReady, resumeId])

  useEffect(() => {
    if (resumeId) {
      updateSetting('activeResumeId', resumeId)
    }
  }, [resumeId, updateSetting])

  useEffect(() => {
    if (resumesReady && resumeExists === false) {
      navigate('/home', { replace: true })
    }
  }, [resumesReady, resumeExists, navigate])

  const handleBack = useCallback(() => {
    updateSetting('activeResumeId', null)
    navigate('/home')
  }, [updateSetting, navigate])

  const [showSaveProfile, setShowSaveProfile] = useState(false)

  const {
    formData,
    updateField,
    isReady,
    resume,
    sectionOrder,
  } = useResumeForm(resumeId ?? null)

  const templateId = (resume?.data.templateId as TemplateId) || 'modern'
  const compiler = settings.defaultCompiler || 'pdflatex'

  const generatedLatex = useLatexGenerator(formData, templateId)

  const {
    latexOverrideMode,
    enterOverride,
    exitOverride,
    showEnterWarning,
    showExitConfirm,
    confirmEnterOverride,
    cancelEnterOverride,
    confirmExitOverride,
    cancelExitOverride,
  } = useLatexOverride({
    resumeId: resumeId ?? null,
    generateLatexFromForm: () => generatedLatex,
  })

  const latexSource = useMemo(() => {
    if (latexOverrideMode && resume?.data.latexSource) {
      return resume.data.latexSource
    }
    return generatedLatex
  }, [latexOverrideMode, resume?.data.latexSource, generatedLatex])

  const {
    compile,
    isCompiling,
    status,
    pdfUrl,
    compilationLog,
    lastCompiledAt,
  } = useCompilation({ compiler })

  const { versions, addVersion, getPdfUrl } = useVersionHistory(resumeId ?? null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  const displayVersion = useMemo(() => {
    if (selectedVersionId) {
      return versions.find(v => v.recordId === selectedVersionId) ?? null
    }
    return versions[0] ?? null
  }, [versions, selectedVersionId])

  const displayPdfUrl = useMemo(() => {
    if (displayVersion) return getPdfUrl(displayVersion)
    if (status === 'success' && pdfUrl) return pdfUrl
    return null
  }, [displayVersion, getPdfUrl, status, pdfUrl])

  const displayLatex = useMemo(() => {
    if (displayVersion) return displayVersion.data.latexSource
    return latexSource
  }, [displayVersion, latexSource])

  const viewingVersion = !!displayVersion
  const viewingOlderVersion = Boolean(
    selectedVersionId && displayVersion && versions[0] && displayVersion.recordId !== versions[0].recordId
  )

  const { editorRatio, containerRef, handleEditorResize } = usePanelResize()
  const toast = useToast()

  const [previewTab, setPreviewTab] = useState<'pdf' | 'latex'>('pdf')
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set())
  const [uploadUsed, setUploadUsed] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)

  // AI assistant — collapsible right-side panel. Persisted to localStorage so
  // the last-chosen state survives reloads. `resetRequestSignal` bumps to
  // open the in-panel "Start a new chat?" confirm — the actual reset happens
  // only if the user confirms.
  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    // Default open — first-time users land with the assistant visible. An
    // explicit '0' in storage (user closed it before) keeps it closed.
    try { return localStorage.getItem('resume-ai-chat-open') !== '0' } catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem('resume-ai-chat-open', chatOpen ? '1' : '0') } catch { /* ignore */ }
  }, [chatOpen])
  const [resetRequestSignal, setResetRequestSignal] = useState(0)

  const jobDescriptionFromResume = (resume?.data as { jobDescription?: string })?.jobDescription ?? ''
  const [jobDescription, setJobDescription] = useState(jobDescriptionFromResume)
  // Hydrate the local input only when the resumeId changes. Otherwise a
  // storage echo from our own debounced write would race our unsaved edits
  // and clobber them mid-typing.
  useEffect(() => {
    setJobDescription(jobDescriptionFromResume)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId])
  const jobDescriptionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleJobDescriptionChange = useCallback(
    (value: string) => {
      setJobDescription(value)
      if (!resumeId) return
      if (jobDescriptionRef.current) clearTimeout(jobDescriptionRef.current)
      jobDescriptionRef.current = setTimeout(() => {
        updateResume(resumeId, { jobDescription: value })
        jobDescriptionRef.current = null
      }, 500)
    },
    [resumeId, updateResume]
  )
  useEffect(() => () => {
    if (jobDescriptionRef.current) clearTimeout(jobDescriptionRef.current)
  }, [])

  const latexOverrideDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleLatexOverrideChange = useCallback(
    (value: string) => {
      if (!resumeId || !latexOverrideMode) return
      if (latexOverrideDebounceRef.current) clearTimeout(latexOverrideDebounceRef.current)
      latexOverrideDebounceRef.current = setTimeout(() => {
        updateResume(resumeId, { latexSource: value })
        latexOverrideDebounceRef.current = null
      }, 400)
    },
    [resumeId, latexOverrideMode, updateResume]
  )
  useEffect(() => () => {
    if (latexOverrideDebounceRef.current) clearTimeout(latexOverrideDebounceRef.current)
  }, [])

  const handleUploadParsed = useCallback(
    (data: ResumeFormData) => {
      if (!formData) return
      updateField('personalInfo', { ...formData.personalInfo, ...data.personalInfo })
      updateField('summary', data.summary)
      updateField('experience', data.experience)
      updateField('education', data.education)
      updateField('skills', data.skills)
      updateField('languages', data.languages)
      updateField('certifications', data.certifications)
      updateField('projects', data.projects)
      updateField('customSections', data.customSections)
      setUploadUsed(true)
    },
    [formData, updateField]
  )

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const sourceProfile = useMemo(() => {
    const sid = resume?.data.sourceProfileId
    if (!sid) return null
    return profiles.find(p => p.recordId === sid) ?? null
  }, [profiles, resume?.data.sourceProfileId])

  const canCompile = useMemo(() => {
    if (latexOverrideMode) return !!latexSource?.trim()
    if (!formData) return false
    const name = formData.personalInfo?.name?.trim()
    const hasExp = (formData.experience?.length ?? 0) > 0 && formData.experience.some(e => (e.company || e.role)?.trim())
    const hasEdu = (formData.education?.length ?? 0) > 0 && formData.education.some(e => (e.institution || e.degree)?.trim())
    return !!name && (hasExp || hasEdu)
  }, [formData, latexOverrideMode, latexSource])

  const handleCompile = useCallback(async () => {
    const photoData = templateId === 'europass' && formData?.personalInfo?.photo?.trim()
      ? parsePhotoDataUrl(formData.personalInfo.photo)
      : null
    const extraResources = photoData
      ? [{ path: photoData.path, file: photoData.base64 }]
      : undefined
    const result = await compile(latexSource, extraResources)
    if (result.success && result.pdfBase64) {
      await addVersion({
        pdfBase64: result.pdfBase64,
        latexSource,
        compiler,
        templateId,
      })
      setSelectedVersionId(null)
      if (resumeId) {
        updateResume(resumeId, {
          latexSource,
          lastCompiledAt: Date.now(),
        })
      }
      setPreviewTab('pdf')
    } else if (!result.success) {
      toast.error(result.compilationLog.errors[0]?.message || 'Compilation failed')
    }
  }, [compile, latexSource, resumeId, updateResume, toast, templateId, formData?.personalInfo?.photo, addVersion, compiler])

  const handleDownloadPdf = useCallback(() => {
    if (!displayPdfUrl) return
    const nameParts = (formData?.personalInfo?.name ?? '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''
    const tplMeta = TEMPLATE_METADATA.find(t => t.id === templateId)
    const tplName = (tplMeta?.name ?? templateId).replace(/\s+/g, '-')
    const segments = [firstName, lastName, tplName].filter(Boolean)
    const filename = segments.length > 0 ? segments.join('_') : 'resume'
    const a = document.createElement('a')
    a.href = displayPdfUrl
    a.download = `${filename}.pdf`
    a.click()
  }, [displayPdfUrl, formData?.personalInfo?.name, templateId])

  const handleUpdateProfile = useCallback((profileId: string, data: ResumeFormData) => {
    updateProfile(profileId, {
      personalInfo: data.personalInfo,
      summary: data.summary,
      experience: data.experience,
      education: data.education,
      skills: data.skills,
      languages: data.languages,
      certifications: data.certifications,
      projects: data.projects,
      customSections: data.customSections,
    })
    toast.success('Profile updated')
  }, [updateProfile, toast])

  const handleCreateNewProfile = useCallback(async (title: string, data: ResumeFormData) => {
    const id = await createProfile({
      title,
      personalInfo: data.personalInfo,
      summary: data.summary,
      experience: data.experience,
      education: data.education,
      skills: data.skills,
      languages: data.languages,
      certifications: data.certifications,
      projects: data.projects,
      customSections: data.customSections,
    })
    if (id && resumeId) {
      updateResume(resumeId, { sourceProfileId: id })
      toast.success('New profile created')
    }
  }, [createProfile, updateResume, resumeId, toast])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        if (canCompile && !isCompiling) handleCompile()
      } else if (mod && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        if (displayPdfUrl) handleDownloadPdf()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canCompile, isCompiling, displayPdfUrl, handleCompile, handleDownloadPdf])

  const handleTemplateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as TemplateId
    if (resumeId) updateResume(resumeId, { templateId: v })
  }, [resumeId, updateResume])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (resumeId) updateResume(resumeId, { title: e.target.value })
  }, [resumeId, updateResume])

  const sectionCount = useMemo(() => {
    if (!formData) return 0
    let n = 0
    if (formData.personalInfo?.name?.trim()) n++
    if (formData.summary?.trim()) n++
    if ((formData.experience?.length ?? 0) > 0) n++
    if ((formData.education?.length ?? 0) > 0) n++
    if ((formData.skills?.length ?? 0) > 0) n++
    if ((formData.languages?.length ?? 0) > 0) n++
    if ((formData.projects?.length ?? 0) > 0) n++
    if ((formData.certifications?.length ?? 0) > 0) n++
    if ((formData.customSections?.length ?? 0) > 0) n++
    return n
  }, [formData])

  const compileStatusLabel = status === 'compiling'
    ? 'Compiling...'
    : status === 'success' && lastCompiledAt
      ? `Compiled ${formatTime(lastCompiledAt)}`
      : status === 'error'
        ? 'Compile error'
        : 'Ready'

  const compileStatusTextClass = status === 'error'
    ? 'text-danger'
    : status === 'success'
      ? 'text-success'
      : status === 'compiling'
        ? 'text-accent'
        : 'text-content-secondary'

  // Guard: no resumeId
  if (!resumeId) {
    return <Navigate to="/home" replace />
  }

  // Guard: loading
  if (!resumesReady) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center glass-elevated rounded-2xl p-8">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-content-secondary text-sm">Loading resume...</div>
        </div>
      </div>
    )
  }

  // Guard: resume deleted
  if (resumeExists === false) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center glass-elevated rounded-2xl p-8">
          <div className="text-content-danger text-sm font-medium mb-2">Resume not found</div>
          <div className="text-content-secondary text-sm mb-4">
            This resume may have been deleted.
          </div>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!isReady || !resume) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center glass-elevated rounded-2xl p-8">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-content-secondary text-sm">Loading resume...</p>
        </div>
      </div>
    )
  }

  const templateMeta = TEMPLATE_METADATA.find(t => t.id === templateId) ?? TEMPLATE_METADATA[0]

  return (
    <div className="h-full flex p-3 gap-3">
      <div className="glass-content-panel flex-1 min-w-0 min-h-0 rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="editor-toolbar-unified shrink-0">
          <div className="editor-toolbar-scroll">
            <div className="editor-toolbar-track">
              <button type="button" onClick={handleBack} className="toolbar-btn" title="Back to dashboard">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="toolbar-separator" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSaveProfile(true)}
                disabled={!formData || isParsingResume}
                title={isParsingResume ? 'Wait for resume parsing to finish' : 'Save current form data to a profile'}
              >
                <Save className="w-3.5 h-3.5" />
                {isParsingResume ? 'Parsing...' : 'Save Profile'}
              </Button>
              <span className="toolbar-separator" />
              <input
                type="text"
                value={resume.data.title ?? ''}
                onChange={handleTitleChange}
                className="bg-transparent border-none text-sm font-medium text-content focus:outline-none focus:ring-0 min-w-[120px] max-w-[200px]"
                placeholder="Resume title"
              />
              <span className="toolbar-separator" />
              <select
                value={templateId}
                onChange={handleTemplateChange}
                className="text-xs px-2 py-1 rounded-lg text-content glass-input"
              >
                {TEMPLATE_METADATA.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="flex-1" />
              <select
                value={selectedVersionId ?? (versions[0]?.recordId ?? '')}
                onChange={e => setSelectedVersionId(e.target.value || null)}
                className="text-xs px-2 py-1 rounded-lg text-content min-w-[72px] focus:outline-none focus:ring-0 glass-input"
                title="Version history"
              >
                {versions.length === 0 ? (
                  <option value="">No versions</option>
                ) : (
                  versions.map(v => (
                    <option key={v.recordId} value={v.recordId}>
                      v{v.data.versionNum}
                    </option>
                  ))
                )}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCompile}
                disabled={!canCompile || isCompiling}
                title={!canCompile ? 'Add your name and at least one experience or education entry to compile.' : 'Compile'}
              >
                {isCompiling ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isCompiling ? 'Compiling...' : 'Compile'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadPdf} disabled={!displayPdfUrl}>
                <Download className="w-3.5 h-3.5" />
                PDF
              </Button>
              <span className="toolbar-separator" />
              <button
                type="button"
                onClick={() => setChatOpen((v) => !v)}
                className={`toolbar-btn ${chatOpen ? 'text-primary' : ''}`}
                title={chatOpen ? 'Close assistant' : 'Open assistant'}
                aria-label={chatOpen ? 'Close assistant' : 'Open assistant'}
                aria-pressed={chatOpen}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Two-panel body */}
        <div ref={containerRef} className="flex-1 flex min-h-0 glass-editor-body overflow-hidden">
          {/* Left: Form panel */}
          <div
            className="flex flex-col min-w-0 shrink-0 overflow-hidden editor-form-panel"
            style={{ width: `calc(${editorRatio * 100}% - 3px)` }}
          >
            <div className="flex-1 overflow-y-auto p-4">
              {latexOverrideMode && (
                <OverrideBanner onReturnToForm={exitOverride} />
              )}
              {!latexOverrideMode && (
                <>
                  <ResumeUpload
                    onParsed={handleUploadParsed}
                    collapsed={uploadUsed}
                    onParsingChange={setIsParsingResume}
                  />
                  <TargetJobPanel
                    jobDescription={jobDescription}
                    onChange={handleJobDescriptionChange}
                    readOnly={latexOverrideMode}
                  />
                </>
              )}
              {formData && (
                <div className={`space-y-1 ${latexOverrideMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  {sectionOrder.map(key => {
                    const isOpen = openSections.has(key)
                    const count = key === 'experience' ? (formData.experience?.length ?? 0)
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
                        required={key === 'personalInfo' || key === 'experience' || key === 'education'}
                      >
                        {key === 'personalInfo' && (
                          <PersonalInfoForm
                            value={formData.personalInfo}
                            onChange={v => updateField('personalInfo', v)}
                            showEuropassFields={templateId === 'europass'}
                          />
                        )}
                        {key === 'summary' && (
                          <SummaryForm
                            value={formData.summary}
                            onChange={v => updateField('summary', v)}
                            context={[
                              formData.personalInfo?.name,
                              formData.personalInfo?.title,
                            ].filter(Boolean).join(', ')}
                            jobDescription={jobDescription}
                            readOnly={latexOverrideMode}
                          />
                        )}
                        {key === 'experience' && (
                          <ExperienceForm
                            value={formData.experience}
                            onChange={v => updateField('experience', v)}
                            jobDescription={jobDescription}
                            readOnly={latexOverrideMode}
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
                            jobDescription={jobDescription}
                            readOnly={latexOverrideMode}
                          />
                        )}
                        {key === 'languages' && (
                          <LanguagesForm
                            value={formData.languages}
                            onChange={v => updateField('languages', v)}
                            readOnly={latexOverrideMode}
                            showEuropassFields={templateId === 'europass'}
                          />
                        )}
                        {key === 'projects' && (
                          <ProjectsForm
                            value={formData.projects}
                            onChange={v => updateField('projects', v)}
                            jobDescription={jobDescription}
                            readOnly={latexOverrideMode}
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
                            readOnly={latexOverrideMode}
                          />
                        )}
                      </SectionAccordion>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <ResizeDivider onResize={handleEditorResize} />

          {/* Right: Preview panel */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 min-h-0 flex flex-col relative">
              <PreviewToggle
                activeTab={previewTab}
                onTabChange={setPreviewTab}
                overrideMode={latexOverrideMode}
                onToggleOverride={viewingOlderVersion ? undefined : enterOverride}
              />
              {previewTab === 'pdf' ? (
                <PdfPreview
                  pdfUrl={displayPdfUrl}
                  isCompiling={isCompiling}
                />
              ) : (
                <LatexPreview
                  content={displayLatex}
                  editable={!viewingVersion && latexOverrideMode}
                  onChange={handleLatexOverrideChange}
                />
              )}

              <CompileLog
                compilationLog={compilationLog}
                forceOpen={status === 'error'}
              />
            </div>
          </div>
        </div>

        <div className="status-bar-unified">
          <div className="editor-status-group">
            {latexOverrideMode ? (
              <span className="editor-status-pill text-warning">Override mode</span>
            ) : (
              <span className="editor-status-pill">{sectionCount} populated sections</span>
            )}
            {sourceProfile && (
              <span className="editor-status-pill">From {sourceProfile.data.title}</span>
            )}
          </div>
          <div className="editor-status-group ml-auto">
            <span className="editor-status-pill">{templateMeta.name}</span>
            <span className="editor-status-pill opacity-80">{compiler}</span>
            <span className={`editor-status-pill ${compileStatusTextClass}`}>
              {status === 'compiling' && <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />}
              {status === 'error' && <span className="inline-block w-2 h-2 bg-danger rounded-full" />}
              {status === 'success' && <span className="inline-block w-2 h-2 bg-success rounded-full" />}
              {compileStatusLabel}
            </span>
          </div>
        </div>
      </div>

      {chatOpen && (
        <aside
          aria-label="Resume assistant"
          className="glass-content-panel w-[380px] shrink-0 min-h-0 rounded-2xl overflow-hidden flex flex-col"
        >
          <header className="shrink-0 flex items-center justify-between px-3 h-[var(--spacing-toolbar)] border-b border-border">
            <span className="text-[12px] font-medium text-content tracking-tight truncate">
              Assistant
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setResetRequestSignal((n) => n + 1)}
                title="New chat"
                aria-label="New chat"
                className="toolbar-btn !w-7 !h-7"
              >
                <SquarePen className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                title="Close assistant"
                aria-label="Close assistant"
                className="toolbar-btn !w-7 !h-7"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>
          <div className="flex-1 min-h-0">
            <ChatPanel resumeId={resumeId} resetRequestSignal={resetRequestSignal} />
          </div>
        </aside>
      )}

      {/* Enter override */}
      <ConfirmModal
        open={showEnterWarning}
        onClose={cancelEnterOverride}
        onConfirm={confirmEnterOverride}
        title="Edit LaTeX directly"
        description="Edit the LaTeX source directly — you have full control. Your form data is safely stored. If you return to form mode, the LaTeX will be rebuilt from your form data and these edits will be lost."
        confirmText="Switch to LaTeX editing"
        cancelText="Cancel"
        variant="primary"
        size="md"
      />

      {/* Exit override */}
      <ConfirmModal
        open={showExitConfirm}
        onClose={cancelExitOverride}
        onConfirm={confirmExitOverride}
        title="Return to form mode?"
        description="Your form data will be used to regenerate the LaTeX. Any direct LaTeX edits you made will be replaced."
        confirmText="Return to form"
        cancelText="Cancel"
        variant="primary"
        size="md"
      />

      {/* Save to Profile modal */}
      {formData && (
        <SaveProfileModal
          open={showSaveProfile}
          onClose={() => setShowSaveProfile(false)}
          formData={formData}
          sourceProfile={sourceProfile}
          onUpdateProfile={handleUpdateProfile}
          onCreateProfile={handleCreateNewProfile}
        />
      )}
    </div>
  )
}
