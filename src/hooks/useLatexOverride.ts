/**
 * useLatexOverride — Manage LaTeX override mode: toggle, warning modals, form lock.
 *
 * In override mode: form is read-only, user edits latexSource directly.
 * Exiting override regenerates LaTeX from form data and discards manual edits.
 */

import { useState, useCallback } from 'react'
import { useResumes } from './useResumes'

export interface UseLatexOverrideOptions {
  resumeId: string | null
  generateLatexFromForm: () => string
}

export interface UseLatexOverrideReturn {
  latexOverrideMode: boolean
  enterOverride: () => void
  exitOverride: () => void
  showEnterWarning: boolean
  showExitConfirm: boolean
  confirmEnterOverride: () => void
  cancelEnterOverride: () => void
  confirmExitOverride: () => void
  cancelExitOverride: () => void
}

export function useLatexOverride({
  resumeId,
  generateLatexFromForm,
}: UseLatexOverrideOptions): UseLatexOverrideReturn {
  const { resumes, updateResume } = useResumes()
  const [showEnterWarning, setShowEnterWarning] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const resume = resumes.find(r => r.recordId === resumeId) ?? null
  const latexOverrideMode = !!resume?.data.latexOverrideMode

  const enterOverride = useCallback(() => {
    setShowEnterWarning(true)
  }, [])

  const cancelEnterOverride = useCallback(() => {
    setShowEnterWarning(false)
  }, [])

  const confirmEnterOverride = useCallback(() => {
    if (!resumeId) return
    const currentLatex = generateLatexFromForm()
    updateResume(resumeId, {
      latexOverrideMode: true,
      latexSource: currentLatex || undefined,
    })
    setShowEnterWarning(false)
  }, [resumeId, generateLatexFromForm, updateResume])

  const exitOverride = useCallback(() => {
    setShowExitConfirm(true)
  }, [])

  const cancelExitOverride = useCallback(() => {
    setShowExitConfirm(false)
  }, [])

  const confirmExitOverride = useCallback(() => {
    if (!resumeId) return
    const regenerated = generateLatexFromForm()
    updateResume(resumeId, {
      latexOverrideMode: false,
      latexSource: regenerated,
    })
    setShowExitConfirm(false)
  }, [resumeId, generateLatexFromForm, updateResume])

  return {
    latexOverrideMode,
    enterOverride,
    exitOverride,
    showEnterWarning,
    showExitConfirm,
    confirmEnterOverride,
    cancelEnterOverride,
    confirmExitOverride,
    cancelExitOverride,
  }
}
