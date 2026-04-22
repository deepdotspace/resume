/**
 * Settings page — `/settings`
 *
 * Settings with profile management and preferences.
 * Theme is derived from backgroundId.
 */

import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SettingsPanelContent from '../components/settings/SettingsPanelContent'

export default function SettingsPage() {
  const navigate = useNavigate()
  // Theme sync lives at AppShell level (src/pages/_app.tsx).

  const handleBack = useCallback(() => {
    navigate('/home')
  }, [navigate])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 glass-header">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="toolbar-btn" title="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-content">Settings</span>
        </div>
      </div>

      <SettingsPanelContent />
    </div>
  )
}
