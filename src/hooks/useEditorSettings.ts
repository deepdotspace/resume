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
import { THEME_STORAGE_KEY } from './useThemeSync'

// Mirrors the user's chosen background image across reloads so the shell
// shows the same visual state on next load instead of flashing the
// DEFAULT_SETTINGS background before the server query resolves.
const BACKGROUND_STORAGE_KEY = 'resume-background-id'

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

/**
 * Synchronously read the user's cached theme + background choice — the
 * same values written by `useThemeSync` and the mirror effect below, and
 * restored by the pre-boot script in `index.html`. Used to seed the
 * initial settings so AppShell's first render computes the correct
 * theme AND renders the user's chosen background image instead of the
 * DEFAULT_SETTINGS image, eliminating the pre-sync visual flash.
 */
function seedInitialSettings(): EditorSettings {
  let cachedTheme: 'light' | 'dark' | null = null
  let cachedBg: string | null = null
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY)
    if (t === 'light' || t === 'dark') cachedTheme = t
    const b = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (b) cachedBg = b
  } catch { /* ignore */ }

  const patch: Partial<EditorSettings> = {}
  if (cachedTheme) patch.theme = cachedTheme
  if (cachedBg) {
    patch.backgroundId = cachedBg
  } else if (cachedTheme === 'light') {
    // Cached theme without a specific bg — the `'light'` background is
    // the canonical light-mode choice.
    patch.backgroundId = 'light'
  }
  return normalizeSettings(patch)
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

  const [localSettings, setLocalSettings] = useState<EditorSettings>(seedInitialSettings)
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

  // Mirror the backgroundId to localStorage so the next reload can seed
  // the same image pre-query (eliminates the flash of DEFAULT_SETTINGS
  // background between mount and record sync).
  useEffect(() => {
    try {
      localStorage.setItem(BACKGROUND_STORAGE_KEY, localSettings.backgroundId)
    } catch { /* ignore */ }
  }, [localSettings.backgroundId])

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
