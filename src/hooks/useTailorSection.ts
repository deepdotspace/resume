/**
 * useTailorSection — Per-section tailoring to job description.
 *
 * Focused prompts: rephrase only what exists, never fabricate.
 * Each function sends a small payload and gets a narrow response.
 */

import { useState, useCallback } from 'react'
import { integration } from 'deepspace'
import { AI_PROMPTS } from '../constants'

function parseJsonArray(str: string): string[] {
  try {
    const parsed = JSON.parse(str) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string')
    }
    return []
  } catch {
    return []
  }
}

async function chatCompletion(prompt: string, maxTokens: number): Promise<{ text: string | null; error: string | null }> {
  const res = (await integration.post('openai/chat-completion', {
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
  })) as { success?: boolean; data?: { choices?: Array<{ message?: { content?: string } }> }; error?: string }

  const text = res?.data?.choices?.[0]?.message?.content?.trim() ?? null
  if (!text) {
    return { text: null, error: res?.error || 'Failed to generate' }
  }
  return { text, error: null }
}

export function useTailorSection() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tailorSummary = useCallback(
    async (summary: string, jobDescription: string): Promise<string | null> => {
      if (!summary.trim() || !jobDescription.trim()) return null
      setLoading(true)
      setError(null)
      try {
        const { text, error: err } = await chatCompletion(
          `${AI_PROMPTS.TAILOR_SUMMARY_TO_JD}

--- JOB DESCRIPTION ---
${jobDescription.trim()}

--- CANDIDATE SUMMARY ---
${summary.trim()}`,
          400,
        )

        if (!text) {
          setError(err || 'Failed to tailor summary.')
          return null
        }
        setError(null)
        return text
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const tailorBullets = useCallback(
    async (
      bullets: string[],
      jobDescription: string,
      context: string
    ): Promise<string[]> => {
      const filtered = bullets.filter(b => b.trim())
      if (filtered.length === 0 || !jobDescription.trim()) return []

      setLoading(true)
      setError(null)
      try {
        const { text, error: err } = await chatCompletion(
          `${AI_PROMPTS.TAILOR_EXPERIENCE_BULLETS_TO_JD}

--- JOB DESCRIPTION ---
${jobDescription.trim()}

--- CONTEXT (role/company) ---
${context || 'Unspecified'}

--- BULLETS (one per line) ---
${filtered.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
          800,
        )

        if (!text) {
          setError(err || 'Failed to tailor bullets.')
          return []
        }

        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const arr = jsonMatch ? parseJsonArray(jsonMatch[0]) : []
        if (arr.length !== filtered.length) {
          setError('Response length mismatch. Please try again.')
          return []
        }
        setError(null)
        return arr
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const tailorProjectBullets = useCallback(
    async (
      bullets: string[],
      jobDescription: string,
      projectName: string
    ): Promise<string[]> => {
      const filtered = bullets.filter(b => b.trim())
      if (filtered.length === 0 || !jobDescription.trim()) return []

      setLoading(true)
      setError(null)
      try {
        const { text, error: err } = await chatCompletion(
          `${AI_PROMPTS.TAILOR_PROJECT_BULLETS_TO_JD}

--- JOB DESCRIPTION ---
${jobDescription.trim()}

--- PROJECT ---
${projectName || 'Unspecified'}

--- BULLETS (one per line) ---
${filtered.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
          800,
        )

        if (!text) {
          setError(err || 'Failed to tailor bullets.')
          return []
        }

        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const arr = jsonMatch ? parseJsonArray(jsonMatch[0]) : []
        if (arr.length !== filtered.length) {
          setError('Response length mismatch. Please try again.')
          return []
        }
        setError(null)
        return arr
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const suggestSkillsFromJd = useCallback(
    async (
      jobDescription: string,
      existingSkills: string[]
    ): Promise<string[]> => {
      if (!jobDescription.trim()) return []

      setLoading(true)
      setError(null)
      try {
        const existingStr = existingSkills.length
          ? `Candidate already has: ${existingSkills.join(', ')}`
          : 'Candidate has no skills listed yet.'

        const { text, error: err } = await chatCompletion(
          `${AI_PROMPTS.TAILOR_SKILLS_FROM_JD}

--- JOB DESCRIPTION ---
${jobDescription.trim()}

--- ${existingStr} ---

Return skills from the JD that are NOT in the candidate's list. Max 10.`,
          300,
        )

        if (!text) {
          setError(err || 'Failed to suggest skills.')
          return []
        }

        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const arr = jsonMatch ? parseJsonArray(jsonMatch[0]) : []
        setError(null)
        return arr
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    tailorSummary,
    tailorBullets,
    tailorProjectBullets,
    suggestSkillsFromJd,
    loading,
    error,
    clearError,
  }
}
