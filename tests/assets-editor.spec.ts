import { test, expect } from 'deepspace/testing'

/**
 * Regression smoke for two prod incidents (July 2026):
 *  1. Template previews + backgrounds were hotlinked to a host that went
 *     offline (deepspacesites.com) — they now ship in public/ and must
 *     actually render, not just 200.
 *  2. An AI chat write with a malformed `skills` shape crashed the editor
 *     route. The create→editor flow must mount the form panel with the
 *     error fallback nowhere in sight.
 */
test.describe('Dashboard assets and editor smoke', () => {
  test('template PDF previews and the background image render', async ({ users }) => {
    const [user] = await users(1)
    await user.page.goto('/home')
    await expect(user.page.locator('.wordmark')).toBeVisible({ timeout: 20000 })

    // PdfThumbnail swaps in an <img alt="PDF preview"> only after pdf.js
    // fetched and rasterized the local PDF — a broken URL never reaches this.
    await expect(
      user.page.locator('.template-card img[alt="PDF preview"]').first(),
    ).toBeVisible({ timeout: 30000 })

    // The background layer must point at a same-origin asset that loads.
    const bgUrl = await user.page.evaluate(() => {
      const el = document.querySelector('.background-layer-image') as HTMLElement | null
      const bg = el ? getComputedStyle(el).backgroundImage : ''
      const match = bg.match(/url\("?([^")]+)"?\)/)
      return match ? match[1] : ''
    })
    expect(bgUrl).toContain('/backgrounds/')
    const bgStatus = await user.page.evaluate(
      (url: string) => fetch(url).then((r) => r.status),
      bgUrl,
    )
    expect(bgStatus).toBe(200)
  })

  test('creating a resume from a template opens the editor without crashing', async ({ users }) => {
    const [user] = await users(1)
    await user.page.goto('/home')
    await expect(user.page.locator('.wordmark')).toBeVisible({ timeout: 20000 })

    await user.page.locator('.template-card', { hasText: 'Modern' }).first().click()
    await user.page.getByText('Start with blank resume').click({ timeout: 10000 })

    await user.page.waitForURL(/\/editor\//, { timeout: 20000 })
    await expect(user.page.getByText('Personal Information').first()).toBeVisible({
      timeout: 20000,
    })
    // Neither our fallback card nor react-router's raw error screen.
    await expect(user.page.getByText('Something went wrong')).toHaveCount(0)
    await expect(user.page.getByText('Unexpected Application Error')).toHaveCount(0)
  })
})
