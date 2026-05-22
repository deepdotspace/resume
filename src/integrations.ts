/**
 * Integration Billing Config
 *
 * Configure who pays for each integration's API calls.
 *
 * - 'user': The calling user pays. Requires sign-in. (Default — see worker.ts.)
 *   New DeepSpace accounts start with 500 credits, which cover early AI chat
 *   and résumé compiles on this app.
 * - 'developer': The app owner pays. Works for anonymous users. Use only for
 *   surfaces that genuinely should run on the owner's tab (none today).
 *
 * Integrations not listed here default to 'user'.
 */

export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  'latex-compiler': { billing: 'user' },
  openai: { billing: 'user' },
  anthropic: { billing: 'user' },
}
