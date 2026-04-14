/**
 * useCompilation — compile LaTeX via latex-compiler integration (cloud).
 *
 * Simplified for resume builder: single .tex content, no bibliography, no log persistence.
 */

import { useState, useCallback, useRef } from 'react'
import { integration } from 'deepspace'
import type {
  CompilationResult,
  CompilationLog,
  CompileStatus,
} from '../constants'
import { EMPTY_COMPILATION_LOG } from '../constants'
import type { Compiler } from '../constants'

function base64ToBlob(base64: string, contentType = 'application/pdf'): Blob {
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}

function mapApiLogItem(item: { info?: Record<string, unknown>; context?: string }): { message: string; type?: string; package?: string; line?: number; file?: string; context: string } {
  const info = item.info || {}
  return {
    message: (info.message as string) || (info.type as string) || 'Unknown',
    type: info.type as string,
    package: info.package as string,
    line: (info.lines as number[])?.[0] ?? (info.line as number),
    file: info.file as string,
    context: (item.context as string) || '',
  }
}

function buildCompilationLog(data: Record<string, unknown>): CompilationLog {
  const parsed = data?.parsedLog as Record<string, unknown> | undefined
  if (!parsed) {
    const rawLog = (data?.compilationLog as string) || ''
    return {
      ...EMPTY_COMPILATION_LOG,
      compiled: !!(data?.compiled),
      duration: data?.duration as number,
      rawLog,
      errors: rawLog ? [{ message: rawLog.slice(0, 1000), context: '' }] : [],
      summary: {
        errorsCount: rawLog ? 1 : 0,
        warningsCount: 0,
        badboxesCount: 0,
        missingRefsCount: 0,
        hasErrors: !!rawLog,
        hasWarnings: false,
      },
    }
  }

  const errors = ((parsed.errors as unknown[]) || []).map(mapApiLogItem)
  const warnings = ((parsed.warnings as unknown[]) || []).map(mapApiLogItem)
  const badboxes = ((parsed.badboxes as unknown[]) || []).map(mapApiLogItem)
  const missingRefs = ((parsed.missing_refs as unknown[]) || []).map(mapApiLogItem)

  return {
    compiled: !!(data.compiled),
    duration: data.duration as number,
    summary: {
      errorsCount: (parsed.errors_count as number) ?? errors.length,
      warningsCount: (parsed.warnings_count as number) ?? warnings.length,
      badboxesCount: (parsed.badboxes_count as number) ?? badboxes.length,
      missingRefsCount: missingRefs.length,
      hasErrors: (parsed.has_errors as boolean) ?? errors.length > 0,
      hasWarnings: (parsed.has_warnings as boolean) ?? warnings.length > 0,
    },
    errors,
    warnings,
    badboxes,
    missingRefs,
    rawLog: (data.compilationLog as string) || '',
    logFiles: (data.logFiles as Record<string, string>) || {},
  }
}

export interface UseCompilationOptions {
  compiler: Compiler
}

export interface ExtraResource {
  path: string
  file: string
}

export interface UseCompilationReturn {
  compile: (latexSource: string, extraResources?: ExtraResource[]) => Promise<CompilationResult>
  isCompiling: boolean
  status: CompileStatus
  pdfUrl: string | null
  compilationLog: CompilationLog
  error: string | null
  lastCompiledAt: number | null
}

export function useCompilation({ compiler }: UseCompilationOptions): UseCompilationReturn {
  const [status, setStatus] = useState<CompileStatus>('idle')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [compilationLog, setCompilationLog] = useState<CompilationLog>(EMPTY_COMPILATION_LOG)
  const [error, setError] = useState<string | null>(null)
  const [lastCompiledAt, setLastCompiledAt] = useState<number | null>(null)

  const prevBlobUrlRef = useRef<string | null>(null)

  const compile = useCallback(async (latexSource: string, extraResources?: ExtraResource[]): Promise<CompilationResult> => {
    setStatus('compiling')
    setError(null)

    const trimmed = latexSource?.trim() || ''
    if (!trimmed) {
      const failLog: CompilationLog = {
        ...EMPTY_COMPILATION_LOG,
        rawLog: 'LaTeX source is empty.',
        errors: [{ message: 'LaTeX source is empty. Add content to compile.', context: '' }],
        summary: { ...EMPTY_COMPILATION_LOG.summary, errorsCount: 1, hasErrors: true },
      }
      setCompilationLog(failLog)
      setError('LaTeX source is empty')
      setStatus('error')
      return { success: false, compilationLog: failLog }
    }

    const resources: Array<{ main?: boolean; content?: string; path?: string; file?: string }> = [
      { main: true, content: latexSource },
      ...(extraResources || []).map(r => ({ path: r.path, file: r.file })),
    ]

    try {
      const response = (await integration.post('latex-compiler/compile', {
        compiler,
        resources,
      })) as { success?: boolean; data?: Record<string, unknown>; error?: string }

      if (response?.success && response?.data?.pdfBase64) {
        const pdfBlob = base64ToBlob(response.data.pdfBase64 as string)
        const blobUrl = URL.createObjectURL(pdfBlob)
        const log = buildCompilationLog(response.data)

        if (prevBlobUrlRef.current) {
          URL.revokeObjectURL(prevBlobUrlRef.current)
        }
        prevBlobUrlRef.current = blobUrl

        setPdfUrl(blobUrl)
        setCompilationLog(log)
        setStatus('success')
        setLastCompiledAt(Date.now())
        setError(null)
        return {
          success: true,
          pdfUrl: blobUrl,
          pdfBlob,
          pdfBase64: response.data.pdfBase64 as string,
          compilationLog: log,
        }
      }

      const compilationLog = response?.data
        ? buildCompilationLog(response.data)
        : {
            ...EMPTY_COMPILATION_LOG,
            rawLog: (response?.error as string) || 'Compilation failed',
            errors: [{ message: (response?.error as string) || 'Compilation failed', context: '' }],
            summary: { ...EMPTY_COMPILATION_LOG.summary, errorsCount: 1, hasErrors: true },
          }

      setCompilationLog(compilationLog)
      setError(compilationLog.errors[0]?.message || 'Compilation failed')
      setStatus('error')
      return { success: false, compilationLog }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Compilation error'
      const failLog: CompilationLog = {
        ...EMPTY_COMPILATION_LOG,
        rawLog: message,
        errors: [{ message, context: '' }],
        summary: { ...EMPTY_COMPILATION_LOG.summary, errorsCount: 1, hasErrors: true },
      }
      setCompilationLog(failLog)
      setError(message)
      setStatus('error')
      return { success: false, compilationLog: failLog }
    }
  }, [compiler])

  return {
    compile,
    isCompiling: status === 'compiling',
    status,
    pdfUrl,
    compilationLog,
    error,
    lastCompiledAt,
  }
}
