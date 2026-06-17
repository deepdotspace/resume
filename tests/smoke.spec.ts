import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Smoke tests run signed-out, so they need no test accounts and keep the
 * default `npx deepspace test` suite green on a fresh clone.
 *
 * This app is fully auth-gated: `src/pages/_app.tsx` wraps every route in an
 * AuthGate that renders the SDK's <AuthOverlay/> until the visitor signs in.
 * So the signed-out surface to assert is the overlay, not an app nav bar.
 * Signed-in behaviour is covered in collab.spec.ts via the `users` fixture.
 */
test.describe('Smoke tests (signed out)', () => {
  test('app mounts and shows the auth overlay when signed out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('auth-overlay')).toBeVisible({ timeout: 15000 })
  })

  test('app loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await expect(page.getByTestId('auth-overlay')).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('gated dashboard content is not exposed to signed-out visitors', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByTestId('auth-overlay')).toBeVisible({ timeout: 15000 })
    // The AuthGate replaces children with the overlay when signed out, so the
    // dashboard's signed-in landmark (the left-rail wordmark) must be absent.
    await expect(page.locator('.wordmark')).toHaveCount(0)
  })
})
