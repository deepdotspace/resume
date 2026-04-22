/**
 * useVersionHistory — manage compiled PDF + LaTeX versions per resume.
 *
 * Stores both pdfData (base64) and latexSource for each version.
 * Enforces VERSION_CAP; oldest version is removed when limit exceeded.
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutations, useUser } from 'deepspace'
import { VERSION_CAP } from '../constants'

// Serialise in-flight `addVersion` calls per resumeId so two rapid compiles
// can't read the same `versions` snapshot and assign the same versionNum.
// Each call awaits the previous create's confirmation before computing its
// `nextVersionNum`.
const addVersionChains = new Map<string, Promise<unknown>>()

export interface VersionRecord {
  recordId: string
  data: {
    resumeId: string
    pdfData: string
    latexSource: string
    compiler?: string
    templateId?: string
    compiledAt: number
    versionNum: number
  }
}

function base64ToBlobUrl(base64: string): string {
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

export function useVersionHistory(resumeId: string | null) {
  const { user } = useUser()
  const { records, status } = useQuery('resume-versions', {
    where: resumeId ? { resumeId } : { resumeId: '' },
    orderBy: 'versionNum',
    orderDir: 'desc',
  })
  const { createConfirmed, remove } = useMutations('resume-versions')
  const blobUrlCache = useRef<Map<string, string>>(new Map())

  const versions = useMemo<VersionRecord[]>(() => {
    if (!user || status !== 'ready' || !resumeId) return []
    // The SDK types `records[].data` as `unknown` (it's schema-agnostic). Narrow
    // to the version-row shape here so downstream reads are type-safe.
    return records
      .map(r => ({ ...r, data: r.data as VersionRecord['data'] }))
      .filter(r => r.createdBy === user.id && r.data.resumeId === resumeId)
      .map(r => ({
        recordId: r.recordId,
        data: {
          resumeId: r.data.resumeId,
          pdfData: r.data.pdfData,
          latexSource: r.data.latexSource,
          compiler: r.data.compiler,
          templateId: r.data.templateId,
          compiledAt: r.data.compiledAt,
          versionNum: r.data.versionNum,
        },
      }))
      .sort((a, b) => b.data.versionNum - a.data.versionNum)
  }, [records, status, user, resumeId])

  const addVersion = useCallback(
    async (opts: {
      pdfBase64: string
      latexSource: string
      compiler: string
      templateId?: string
    }): Promise<string | null> => {
      if (!resumeId) return null

      // Chain per-resume so rapid compiles don't both read the same
      // `versions` snapshot and assign the same versionNum.
      const prev = addVersionChains.get(resumeId) ?? Promise.resolve()
      const next = prev
        .catch(() => undefined)
        .then(async () => {
          const nextVersionNum =
            versions.length > 0
              ? Math.max(...versions.map(v => v.data.versionNum)) + 1
              : 1

          if (versions.length >= VERSION_CAP) {
            const oldest = versions[versions.length - 1]
            remove(oldest.recordId)
          }

          return createConfirmed({
            resumeId,
            pdfData: opts.pdfBase64,
            latexSource: opts.latexSource,
            compiler: opts.compiler,
            templateId: opts.templateId ?? '',
            compiledAt: Date.now(),
            versionNum: nextVersionNum,
          })
        })

      addVersionChains.set(resumeId, next)
      try {
        return await next
      } catch (err) {
        console.error('[addVersion] failed:', err)
        return null
      } finally {
        // Evict when the chain has drained, so the next burst starts fresh.
        if (addVersionChains.get(resumeId) === next) {
          addVersionChains.delete(resumeId)
        }
      }
    },
    [resumeId, versions, createConfirmed, remove]
  )

  const getPdfUrl = useCallback((version: VersionRecord): string => {
    const cached = blobUrlCache.current.get(version.recordId)
    if (cached) return cached
    const url = base64ToBlobUrl(version.data.pdfData)
    blobUrlCache.current.set(version.recordId, url)
    return url
  }, [])

  useEffect(() => {
    return () => {
      blobUrlCache.current.forEach(url => URL.revokeObjectURL(url))
      blobUrlCache.current.clear()
    }
  }, [])

  return {
    versions,
    isReady: status === 'ready',
    addVersion,
    getPdfUrl,
  }
}
