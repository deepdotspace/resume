/**
 * Settings page — `/settings`
 *
 * Settings with profile management and preferences.
 * Theme is derived from backgroundId.
 */

import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEditorSettings } from '../hooks'
import { useThemeSync } from '../hooks/useThemeSync'
import { themeForBackground } from '../utils/themeForBackground'
import SettingsPanelContent from '../components/settings/SettingsPanelContent'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings } = useEditorSettings()

  const isDark = themeForBackground(settings.backgroundId) === 'dark'
  useThemeSync(isDark ? 'dark' : 'light')

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
