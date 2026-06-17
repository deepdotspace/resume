import { test, expect } from 'deepspace/testing'

/**
 * This app is single-user: every collection is `own`-scoped (see src/schemas),
 * so there is no shared/real-time surface for a classic "A acts, B sees" test.
 * What matters instead is that the authenticated path works end to end —
 * sign-in, the gated AuthGate opening, RecordScope mounting its DO WebSocket,
 * and the dashboard rendering — and that two accounts get independent sessions.
 *
 * Uses the published `users` fixture from 'deepspace/testing', which signs in
 * existing accounts from the local test-account pool (public signup is disabled
 * by design). Provision the pool once with `npx deepspace test-accounts create`.
 *
 * Signed-in landmark: the `.wordmark` element in the left rail. It renders in
 * every panel mode, unlike the "My Resumes" tab which only exists in browser
 * mode — so it's the stable "the gated dashboard mounted" signal.
 */
test.describe('Authenticated app', () => {
  test('a signed-in user reaches their dashboard', async ({ users }) => {
    const [user] = await users(1)
    await user.page.goto('/home')
    await expect(user.page.locator('.wordmark')).toBeVisible({ timeout: 20000 })
    // The auth gate has opened — no overlay for a signed-in user.
    await expect(user.page.getByTestId('auth-overlay')).toHaveCount(0)
  })

  test('a signed-in user hitting an unknown route sees the 404 page', async ({ users }) => {
    const [user] = await users(1)
    await user.page.goto('/this-route-does-not-exist')
    // Gate is open (signed in), so the catch-all route renders, not the overlay.
    await expect(user.page.getByText('Page not found')).toBeVisible({ timeout: 20000 })
    await expect(user.page.getByTestId('auth-overlay')).toHaveCount(0)
  })

  test('two users get independent signed-in sessions', async ({ users }) => {
    const [a, b] = await users(2)
    await a.page.goto('/home')
    await b.page.goto('/home')
    await expect(a.page.locator('.wordmark')).toBeVisible({ timeout: 20000 })
    await expect(b.page.locator('.wordmark')).toBeVisible({ timeout: 20000 })
    expect(a.email).not.toBe(b.email)
  })
})
