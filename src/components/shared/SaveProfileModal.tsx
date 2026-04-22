/**
 * SaveProfileModal — lets the user save the current resume form data
 * back to an existing profile (update) or as a brand-new profile.
 */

import React, { useState, useCallback } from 'react'
import { Save, FilePlus, RefreshCw } from 'lucide-react'
import { Modal, Button, Input } from '../ui'
import type { Profile } from '../../hooks'
import type { ResumeFormData } from '../../templates'

interface SaveProfileModalProps {
  open: boolean
  onClose: () => void
  formData: ResumeFormData
  sourceProfile: Profile | null
  onUpdateProfile: (profileId: string, formData: ResumeFormData) => void | Promise<void>
  onCreateProfile: (title: string, formData: ResumeFormData) => void | Promise<void>

}

export default function SaveProfileModal({
  open,
  onClose,
  formData,
  sourceProfile,
  onUpdateProfile,
  onCreateProfile,
}: SaveProfileModalProps) {
  const [mode, setMode] = useState<'choose' | 'new'>('choose')
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setMode('choose')
    setNewTitle('')
    setSaving(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const handleUpdate = useCallback(async () => {
    if (!sourceProfile || saving) return
    setSaving(true)
    try {
      await onUpdateProfile(sourceProfile.recordId, formData)
      handleClose()
    } catch (err) {
      console.error('[SaveProfileModal] update failed:', err)
    } finally {
      setSaving(false)
    }
  }, [sourceProfile, formData, onUpdateProfile, handleClose, saving])

  const handleCreateNew = useCallback(async () => {
    if (saving) return
    const title = newTitle.trim() || `${formData.personalInfo?.name || 'Untitled'} Profile`
    setSaving(true)
    try {
      await onCreateProfile(title, formData)
      handleClose()
    } catch (err) {
      console.error('[SaveProfileModal] create failed:', err)
    } finally {
      setSaving(false)
    }
  }, [newTitle, formData, onCreateProfile, handleClose, saving])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'new' && !saving) {
      handleCreateNew()
    }
  }, [mode, saving, handleCreateNew])

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <Modal.Header onClose={handleClose}>
        <Modal.Title>Save to Profile</Modal.Title>
        <Modal.Description>
          {mode === 'choose'
            ? 'Save your current resume data to a profile for reuse.'
            : 'Choose a name for the new profile.'}
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        {mode === 'choose' && (
          <div className="space-y-3">
            {sourceProfile && (
              <button
                type="button"
                onClick={handleUpdate}
                disabled={saving}
                className="w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors text-left group"
              >
                <div className="mt-0.5 p-1.5 rounded-md bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content">Update existing profile</p>
                  <p className="text-xs text-content-secondary mt-0.5 truncate">
                    Overwrite "{sourceProfile.data.title}" with current data
                  </p>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode('new')}
              disabled={saving}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors text-left group"
            >
              <div className="mt-0.5 p-1.5 rounded-md bg-success/10 text-success group-hover:bg-success/20 transition-colors">
                <FilePlus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content">Create new profile</p>
                <p className="text-xs text-content-secondary mt-0.5">
                  Save as a new profile you can reuse across resumes
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === 'new' && (
          <div className="space-y-3" onKeyDown={handleKeyDown}>
            <Input
              label="Profile name"
              placeholder={`${formData.personalInfo?.name || 'Untitled'} Profile`}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {mode === 'new' ? (
          <>
            <Button variant="ghost" onClick={() => setMode('choose')} disabled={saving}>
              Back
            </Button>
            <Button variant="primary" onClick={handleCreateNew} loading={saving}>
              <Save className="w-3.5 h-3.5" />
              Create Profile
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}
