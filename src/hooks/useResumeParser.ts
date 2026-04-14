/**
 * useResumeParser — Parse PDF/DOCX resume into structured form data.
 *
 * Pipeline:
 *   PDF: file -> base64 -> anthropic/chat-completion (native PDF support) -> JSON -> ResumeFormData
 *   DOCX: file -> text extraction (client-side) -> openai/chat-completion -> JSON -> ResumeFormData
 */

import { useState, useCallback } from 'react'
import { integration } from 'deepspace'
import type { ResumeFormData } from '../templates'

const RESUME_EXTRACTION_PROMPT = `Extract resume/CV data from the following and return ONLY valid JSON (no markdown, no explanation).
Use this exact structure:
{
  "personalInfo": { "name": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "photo": "" },
  "summary": "",
  "experience": [{ "company": "", "role": "", "startDate": "", "endDate": "", "bullets": [] }],
  "education": [{ "institution": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": "" }],
  "skills": [{ "category": "", "items": [] }],
  "languages": [{ "name": "", "proficiency": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "projects": [{ "name": "", "description": "", "url": "", "bullets": [] }],
  "customSections": [{ "title": "", "entries": [{ "primary": "", "secondary": "", "date": "", "bullets": [] }] }]
}

IMPORTANT: Any resume section that does NOT fit into the standard fields above (e.g. Awards, Honors, Publications, Research, Volunteer Work, Teaching, Grants, Conferences, Professional Memberships, Interests, References, etc.) MUST be placed in "customSections". Each custom section keeps its original title. Each entry has: "primary" (main text like award name or publication title), "secondary" (subtitle like issuer or journal), "date", and "bullets" (detail lines). Do NOT drop any section from the resume.

Fill in all fields you can extract. Use empty strings or empty arrays for missing data.`

const DEFAULT_FORM_DATA: ResumeFormData = {
  personalInfo: {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    photo: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  projects: [],
  customSections: [],
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64 || '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function parseJsonSafe<T>(str: string, fallback: T): T {
  try {
    const parsed = JSON.parse(str) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export interface UseResumeParserReturn {
  parse: (file: File) => Promise<ResumeFormData | null>
  isParsing: boolean
  error: string | null
}

export function useResumeParser(): UseResumeParserReturn {
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parse = useCallback(async (file: File): Promise<ResumeFormData | null> => {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setError('Please upload a PDF or DOCX file.')
      return null
    }

    setIsParsing(true)
    setError(null)

    try {
      const base64 = await fileToBase64(file)
      if (!base64) {
        setError('Could not read file.')
        return null
      }

      let llmText: string

      if (ext === 'pdf') {
        // Use Claude's native PDF reading via anthropic/chat-completion
        const res = (await integration.post('anthropic/chat-completion', {
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
              },
              { type: 'text', text: RESUME_EXTRACTION_PROMPT },
            ],
          }],
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
        })) as { success?: boolean; data?: { content?: Array<{ text?: string }> }; error?: string }

        llmText = res?.data?.content?.[0]?.text?.trim() ?? ''
        if (!llmText) {
          setError(res?.error || 'Could not parse resume PDF.')
          return null
        }
      } else {
        // For DOCX: read as text client-side, then use openai for structured parsing
        let rawText: string
        try {
          rawText = await fileToText(file)
        } catch {
          rawText = `[Base64 encoded file: ${file.name}]\n${base64.slice(0, 2000)}`
        }

        const res = (await integration.post('openai/chat-completion', {
          messages: [{ role: 'user', content: `${RESUME_EXTRACTION_PROMPT}\n\n---\n\n[File: ${file.name}]\n${rawText}` }],
          model: 'gpt-4o-mini',
          max_tokens: 4000,
        })) as { success?: boolean; data?: { choices?: Array<{ message?: { content?: string } }> }; error?: string }

        llmText = res?.data?.choices?.[0]?.message?.content?.trim() ?? ''
        if (!llmText) {
          setError(res?.error || 'Could not parse resume.')
          return null
        }
      }

      const jsonMatch = llmText.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : llmText

      const parsed = parseJsonSafe<Partial<ResumeFormData>>(jsonStr, {})

      const result: ResumeFormData = {
        personalInfo: {
          ...DEFAULT_FORM_DATA.personalInfo,
          ...parsed.personalInfo,
        },
        summary: parsed.summary ?? '',
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        languages: Array.isArray(parsed.languages) ? parsed.languages : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
      }

      setError(null)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse failed'
      setError(msg)
      return null
    } finally {
      setIsParsing(false)
    }
  }, [])

  return { parse, isParsing, error }
}
