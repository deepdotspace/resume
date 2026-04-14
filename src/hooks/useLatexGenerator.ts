/**
 * useLatexGenerator — form data → LaTeX string via template mapper.
 */

import { useMemo } from 'react'
import { generateLatexForTemplate, type TemplateId } from '../templates'
import type { ResumeFormData } from '../templates'

export function useLatexGenerator(
  formData: ResumeFormData | null,
  templateId: TemplateId
): string {
  return useMemo(() => {
    if (!formData) return ''
    return generateLatexForTemplate(templateId, formData)
  }, [formData, templateId])
}
