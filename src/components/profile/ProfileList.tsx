/**
 * ProfileList — List of profiles with edit/delete/duplicate actions.
 */

import React from 'react'
import { User, Trash2, Edit2, Copy } from 'lucide-react'
import { ConfirmModal } from '../ui'
import type { Profile } from '../../hooks'

function timeAgo(ts: number): string {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface ProfileListProps {
  profiles: Profile[]
  onEdit: (profile: Profile) => void
  onDelete: (profile: Profile) => void
  onDuplicate: (profile: Profile) => void
}

export function ProfileList({ profiles, onEdit, onDelete, onDuplicate }: ProfileListProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<Profile | null>(null)

  return (
    <>
      <div className="space-y-2">
        {profiles.length === 0 ? (
          <div className="text-center py-8 text-content-tertiary text-sm">
            No profiles yet. Create one from the dashboard or add below.
          </div>
        ) : (
          profiles.map(profile => (
            <div
              key={profile.recordId}
              className="flex items-center gap-3 px-4 py-3 rounded-xl glass-elevated"
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content truncate">
                  {profile.data.title}
                </p>
                <p className="text-xs text-content-tertiary">
                  Updated {timeAgo(profile.data.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(profile)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDuplicate(profile)}
                  className="btn-icon"
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(profile)}
                  className="btn-icon btn-icon-danger"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget)
            setDeleteTarget(null)
          }
        }}
        title="Delete profile?"
        description="This cannot be undone. Resumes created from this profile will not be affected."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  )
}
