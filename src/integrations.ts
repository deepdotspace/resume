/**
 * Integration Billing Config
 *
 * Configure who pays for each integration's API calls.
 *
 * - 'developer': The app owner pays (default). Works for anonymous users.
 * - 'user': The calling user pays. Requires sign-in.
 *
 * Integrations not listed here default to 'developer'.
 */

export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  'latex-compiler': { billing: 'user' },
  openai: { billing: 'user' },
  anthropic: { billing: 'user' },
}
