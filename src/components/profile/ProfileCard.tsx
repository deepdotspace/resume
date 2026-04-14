/**
 * ProfileCard — Compact card for profile selection (import modal, settings).
 */

import React from 'react'
import { User } from 'lucide-react'
import type { Profile } from '../../hooks'

interface ProfileCardProps {
  profile: Profile
  selected?: boolean
  onClick?: () => void
}

export function ProfileCard({ profile, selected = false, onClick }: ProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all w-full
        ${selected
          ? 'border-accent bg-accent-light'
          : 'glass-elevated hover:border-accent/40'}
      `}
    >
      <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
        <User className="w-5 h-5 text-accent" />
      </div>
      <div className="w-full min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-accent' : 'text-content'}`}>
          {profile.data.title}
        </p>
        {profile.data.personalInfo?.name && (
          <p className="text-xs text-content-tertiary mt-0.5 truncate">
            {profile.data.personalInfo.name}
          </p>
        )}
      </div>
    </button>
  )
}
