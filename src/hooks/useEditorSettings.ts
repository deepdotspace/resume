/**
 * useEditorSettings — per-user resume builder preferences and onboarding state.
 *
 * Reads own record on mount; creates one with defaults if none exists.
 * Provides optimistic updates backed by the editorSettings collection.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutations, useUser } from 'deepspace'
import { DEFAULT_SETTINGS } from '../constants'
import type { Compiler } from '../constants'

export interface EditorSettings {
  theme: 'light' | 'dark'
  defaultTemplate: string
  defaultCompiler: Compiler
  activeResumeId: string | null
  backgroundId: string
}

function normalizeSettings(data?: Partial<EditorSettings>): EditorSettings {
  return {
    theme: data?.theme ?? DEFAULT_SETTINGS.theme,
    defaultTemplate: data?.defaultTemplate ?? DEFAULT_SETTINGS.defaultTemplate,
    defaultCompiler: data?.defaultCompiler ?? DEFAULT_SETTINGS.defaultCompiler,
    activeResumeId: data?.activeResumeId ?? null,
    backgroundId: data?.backgroundId ?? DEFAULT_SETTINGS.backgroundId,
  }
}

function areSettingsEqual(a: EditorSettings, b: EditorSettings): boolean {
  return (
    a.theme === b.theme &&
    a.defaultTemplate === b.defaultTemplate &&
    a.defaultCompiler === b.defaultCompiler &&
    a.activeResumeId === b.activeResumeId &&
    a.backgroundId === b.backgroundId
  )
}

export function useEditorSettings() {
  const { user } = useUser()
  const { records, status } = useQuery('editorSettings')
  const { create, put } = useMutations('editorSettings')

  const [localSettings, setLocalSettings] = useState<EditorSettings>(
    normalizeSettings(),
  )
  const recordIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  const ownRecord = useMemo(() => {
    if (!user || status !== 'ready') return null
    return records.find(r => r.createdBy === user.id) ?? null
  }, [records, status, user])

  useEffect(() => {
    if (status !== 'ready' || !user || initializedRef.current) return

    if (ownRecord) {
      recordIdRef.current = ownRecord.recordId
      setLocalSettings(normalizeSettings(ownRecord.data as Partial<EditorSettings>))
      initializedRef.current = true
    } else {
      create(DEFAULT_SETTINGS as Record<string, unknown>).then(id => {
        if (id) recordIdRef.current = id
        initializedRef.current = true
      })
    }
  }, [status, user, ownRecord, create])

  useEffect(() => {
    if (!initializedRef.current || !ownRecord) return
    recordIdRef.current = ownRecord.recordId
    const next = normalizeSettings(ownRecord.data as Partial<EditorSettings>)
    setLocalSettings(prev => (areSettingsEqual(prev, next) ? prev : next))
  }, [ownRecord])

  const updateSetting = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      setLocalSettings(prev => {
        const next = { ...prev, [key]: value }
        if (recordIdRef.current) {
          put(recordIdRef.current, next as Record<string, unknown>)
        }
        return next
      })
    },
    [put],
  )

  const updateSettings = useCallback(
    (partial: Partial<EditorSettings>) => {
      setLocalSettings(prev => {
        const next = { ...prev, ...partial }
        if (recordIdRef.current) {
          put(recordIdRef.current, next as Record<string, unknown>)
        }
        return next
      })
    },
    [put],
  )

  return {
    settings: localSettings,
    updateSetting,
    updateSettings,
    isReady: status === 'ready',
  }
}
