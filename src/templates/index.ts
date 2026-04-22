/**
 * LaTeX template registry.
 */

import { generateLatex as modernGenerate } from './modern'
import { generateLatex as europassGenerate } from './europass'
import { generateLatex as academicGenerate } from './academic'
import { generateLatex as twocolumnGenerate } from './twocolumn'
import { generateLatex as jakesGenerate } from './jakes'
import type { ResumeFormData } from './types'

export type TemplateId =
  | 'modern'
  | 'europass'
  | 'academic'
  | 'twocolumn'
  | 'jakes'

export const TEMPLATE_GENERATORS: Record<TemplateId, (data: ResumeFormData) => string> = {
  modern: modernGenerate,
  europass: europassGenerate,
  academic: academicGenerate,
  twocolumn: twocolumnGenerate,
  jakes: jakesGenerate,
}

export function generateLatexForTemplate(templateId: TemplateId, data: ResumeFormData): string {
  const fn = TEMPLATE_GENERATORS[templateId] ?? TEMPLATE_GENERATORS.modern
  return fn(data)
}

export type {
  ResumeFormData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  SkillGroup,
  LanguageEntry,
  CefrSkills,
  CertificationEntry,
  ProjectEntry,
  CustomSection,
  CustomEntry,
} from './types'
