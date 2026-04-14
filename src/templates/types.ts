/**
 * Shared types for resume form data used by all LaTeX template mappers.
 */

export interface PersonalInfo {
  name: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  photo: string
  /** Europass: nationality (e.g. "German") */
  nationality?: string
  /** Europass: date of birth (e.g. "15/03/1990") */
  dateOfBirth?: string
  /** Europass: driving license category (e.g. "B") */
  drivingLicense?: string
}

export interface ExperienceEntry {
  company: string
  role: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa: string
}

export interface SkillGroup {
  category: string
  items: string[]
}

/** CEFR sub-skills for Europass self-assessment grid */
export interface CefrSkills {
  listening?: string
  reading?: string
  spokenInteraction?: string
  spokenProduction?: string
  writing?: string
}

export interface LanguageEntry {
  name: string
  proficiency: string
  /** Europass: mother tongue vs other language */
  isMotherTongue?: boolean
  /** Europass: 5-skill CEFR grid (overrides proficiency when present) */
  cefr?: CefrSkills
}

export interface CertificationEntry {
  name: string
  issuer: string
  date: string
}

export interface ProjectEntry {
  name: string
  description: string
  url: string
  bullets: string[]
}

export interface CustomEntry {
  primary: string
  secondary: string
  date: string
  bullets: string[]
}

export interface CustomSection {
  title: string
  entries: CustomEntry[]
}

export interface ResumeFormData {
  personalInfo: PersonalInfo
  summary: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillGroup[]
  languages: LanguageEntry[]
  certifications: CertificationEntry[]
  projects: ProjectEntry[]
  customSections: CustomSection[]
}
