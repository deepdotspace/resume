/**
 * useAiAssist — Thin wrapper around the openai/chat-completion integration endpoint.
 *
 * Returns a `generate` function that sends a prompt and returns the text result,
 * plus `loading` and `error` state for the caller to react to.
 */

import { useState, useCallback } from 'react'
import { integration } from 'deepspace'

export interface UseAiAssistReturn {
  generate: (prompt: string, maxTokens?: number) => Promise<string | null>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useAiAssist(): UseAiAssistReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (prompt: string, maxTokens = 400): Promise<string | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = (await integration.post('openai/chat-completion', {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
      })) as { success?: boolean; data?: { choices?: Array<{ message?: { content?: string } }> }; error?: string }

      const text = res?.data?.choices?.[0]?.message?.content
      if (!text) {
        setError(res?.error || 'Failed to generate suggestion')
        return null
      }
      return text.trim()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { generate, loading, error, clearError }
}
