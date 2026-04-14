/**
 * useVersionHistory — manage compiled PDF + LaTeX versions per resume.
 *
 * Stores both pdfData (base64) and latexSource for each version.
 * Enforces VERSION_CAP; oldest version is removed when limit exceeded.
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutations, useUser } from 'deepspace'
import { VERSION_CAP } from '../constants'

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
  const { create, remove } = useMutations('resume-versions')
  const blobUrlCache = useRef<Map<string, string>>(new Map())

  const versions = useMemo<VersionRecord[]>(() => {
    if (!user || status !== 'ready' || !resumeId) return []
    return records
      .filter(r => r.createdBy === user.id && r.data.resumeId === resumeId)
      .map(r => ({
        recordId: r.recordId,
        data: {
          resumeId: r.data.resumeId as string,
          pdfData: r.data.pdfData as string,
          latexSource: r.data.latexSource as string,
          compiler: r.data.compiler as string | undefined,
          templateId: r.data.templateId as string | undefined,
          compiledAt: r.data.compiledAt as number,
          versionNum: r.data.versionNum as number,
        },
      }))
      .sort((a, b) => b.data.versionNum - a.data.versionNum)
  }, [records, status, user, resumeId])

  const addVersion = useCallback(
    (opts: {
      pdfBase64: string
      latexSource: string
      compiler: string
      templateId?: string
    }): string | null => {
      if (!resumeId) return null

      const nextVersionNum =
        versions.length > 0 ? Math.max(...versions.map(v => v.data.versionNum)) + 1 : 1

      if (versions.length >= VERSION_CAP) {
        const oldest = versions[versions.length - 1]
        remove(oldest.recordId)
      }

      const recordId = create({
        resumeId,
        pdfData: opts.pdfBase64,
        latexSource: opts.latexSource,
        compiler: opts.compiler,
        templateId: opts.templateId ?? '',
        compiledAt: Date.now(),
        versionNum: nextVersionNum,
      })
      return recordId
    },
    [resumeId, versions, create, remove]
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
