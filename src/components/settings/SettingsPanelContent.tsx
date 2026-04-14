/**
 * SettingsPanelContent — Shared settings body used by both the dashboard panel
 * and the standalone settings route.
 */

import React, { useState } from 'react'
import { Sun, Moon, Plus, Check } from 'lucide-react'
import { Button } from '../ui'
import { ProfileList, ProfileEditor } from '../profile'
import { useProfiles, useEditorSettings } from '../../hooks'
import { TEMPLATE_METADATA, COMPILERS, BACKGROUNDS } from '../../constants'
import type { Profile } from '../../hooks'

interface SettingsPanelContentProps {
  bodyClassName?: string
  innerClassName?: string
}

const SELECT_CLASS = `
  px-3 py-2 rounded-lg text-content text-sm glass-input
  focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors
`

export default function SettingsPanelContent({
  bodyClassName = 'flex-1 overflow-y-auto',
  innerClassName = 'max-w-xl mx-auto px-5 py-6 space-y-8',
}: SettingsPanelContentProps) {
  const {
    profiles,
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
  } = useProfiles()
  const { settings, updateSetting } = useEditorSettings()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  const handleAddProfile = () => {
    setEditingProfile(null)
    setEditorOpen(true)
  }

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile)
    setEditorOpen(true)
  }

  const handleEditorSave = async (data: {
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
    if (editingProfile) {
      updateProfile(editingProfile.recordId, data)
    } else {
      await createProfile(data)
    }

    setEditorOpen(false)
    setEditingProfile(null)
  }

  return (
    <>
      <div className={bodyClassName}>
        <div className={innerClassName}>
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-content">Profiles</h2>
                <p className="text-xs text-content-secondary mt-0.5">
                  Reusable career data snapshots. Import into any resume.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleAddProfile}>
                <Plus className="w-3.5 h-3.5" />
                Add Profile
              </Button>
            </div>

            <ProfileList
              profiles={profiles}
              onEdit={handleEditProfile}
              onDelete={profile => deleteProfile(profile.recordId)}
              onDuplicate={profile => duplicateProfile(profile.recordId)}
            />
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-content">Background & Theme</h2>
              <p className="text-xs text-content-secondary mt-0.5">
                Light and Dark are solid themes. Image backgrounds use dark mode styling.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BACKGROUNDS.map(background => {
                const isSolid = background.id === 'light' || background.id === 'dark'
                const isSelected = settings.backgroundId === background.id

                return (
                  <button
                    key={background.id}
                    onClick={() => updateSetting('backgroundId', background.id)}
                    className={`bg-picker-item ${isSelected ? 'selected' : ''}`}
                    title={background.label}
                  >
                    {isSolid ? (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: background.id === 'light' ? '#F8F9FA' : '#121220',
                        }}
                      >
                        {background.id === 'light' ? (
                          <Sun className="w-6 h-6 text-gray-400" />
                        ) : (
                          <Moon className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                    ) : (
                      <img src={background.url} alt={background.label} loading="lazy" />
                    )}
                    {isSelected ? (
                      <span className="bg-picker-check">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    ) : null}
                    <span
                      className="absolute bottom-0 inset-x-0 px-2 py-1.5 text-[10px] font-medium"
                      style={{
                        background: isSolid
                          ? 'transparent'
                          : 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        color: background.id === 'light' ? '#6B7280' : '#FFFFFF',
                      }}
                    >
                      {background.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-content mb-4">Preferences</h2>

            <div className="glass-elevated rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-content">Default template</p>
                  <p className="text-xs text-content-secondary">
                    Used when creating new resumes
                  </p>
                </div>
                <select
                  className={SELECT_CLASS}
                  value={settings.defaultTemplate}
                  onChange={event => updateSetting('defaultTemplate', event.target.value)}
                >
                  {TEMPLATE_METADATA.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-content">Default compiler</p>
                  <p className="text-xs text-content-secondary">
                    LaTeX compiler for PDF generation
                  </p>
                </div>
                <select
                  className={SELECT_CLASS}
                  value={settings.defaultCompiler}
                  onChange={event =>
                    updateSetting(
                      'defaultCompiler',
                      event.target.value as typeof settings.defaultCompiler,
                    )
                  }
                >
                  {COMPILERS.map(compiler => (
                    <option key={compiler.id} value={compiler.id}>
                      {compiler.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ProfileEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          setEditingProfile(null)
        }}
        profile={editingProfile}
        onSave={handleEditorSave}
      />
    </>
  )
}
