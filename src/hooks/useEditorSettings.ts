/**
 * useEditorSettings — per-user resume builder preferences and onboarding state.
 *
 * Reads the user's own record on mount; bootstraps one if absent. Provides
 * optimistic updates backed by the `editorSettings` collection.
 *
 * Bootstrap uses `createConfirmed` + a module-level per-user in-flight
 * guard, so concurrent mounts (from the editor page + home page, or two
 * tabs) don't each race to create a duplicate row.
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

// Module-level flight guard keyed by userId. Two calls that happen during
// the same render pass for the same user share the same promise and resolve
// to the same recordId.
const bootstrapInFlight = new Map<string, Promise<string>>()

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
  const { createConfirmed, put } = useMutations('editorSettings')

  const [localSettings, setLocalSettings] = useState<EditorSettings>(
    normalizeSettings(),
  )
  // `latestRef` always holds the most recent `localSettings` so the updater
  // callbacks below can compute `next` without going through the setState
  // function (which React may double-invoke under strict mode, causing a
  // duplicate `put`).
  const latestRef = useRef(localSettings)
  latestRef.current = localSettings
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
      return
    }

    // No own record — bootstrap. Share the promise across concurrent mounts
    // for the same user to avoid creating duplicate rows.
    const userId = user.id
    let promise = bootstrapInFlight.get(userId)
    if (!promise) {
      promise = createConfirmed(DEFAULT_SETTINGS as Record<string, unknown>)
        .finally(() => bootstrapInFlight.delete(userId))
      bootstrapInFlight.set(userId, promise)
    }
    let cancelled = false
    promise.then((id) => {
      if (cancelled) return
      recordIdRef.current = id
      initializedRef.current = true
    }).catch((err) => {
      console.error('[useEditorSettings] bootstrap failed:', err)
    })
    return () => { cancelled = true }
  }, [status, user, ownRecord, createConfirmed])

  useEffect(() => {
    if (!initializedRef.current || !ownRecord) return
    recordIdRef.current = ownRecord.recordId
    const next = normalizeSettings(ownRecord.data as Partial<EditorSettings>)
    setLocalSettings(prev => (areSettingsEqual(prev, next) ? prev : next))
  }, [ownRecord])

  const updateSetting = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      const next = { ...latestRef.current, [key]: value }
      latestRef.current = next
      setLocalSettings(next)
      if (recordIdRef.current) {
        put(recordIdRef.current, next as Record<string, unknown>)
      }
    },
    [put],
  )

  const updateSettings = useCallback(
    (partial: Partial<EditorSettings>) => {
      const next = { ...latestRef.current, ...partial }
      latestRef.current = next
      setLocalSettings(next)
      if (recordIdRef.current) {
        put(recordIdRef.current, next as Record<string, unknown>)
      }
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
