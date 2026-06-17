import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('record-room websocket endpoint accepts an upgrade', async ({ page }) => {
    // Anonymous WS upgrade is allowed (the worker assigns an anon id when no
    // token is present), so this exercises the route without needing auth.
    await page.goto('/')
    const result = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const ws = new WebSocket(`ws://${location.host}/ws/app:resume`)
          const timer = setTimeout(() => {
            resolve('timeout')
            ws.close()
          }, 8000)
          ws.onopen = () => {
            clearTimeout(timer)
            ws.close()
            resolve('open')
          }
          ws.onerror = () => {
            clearTimeout(timer)
            resolve('error')
          }
        }),
    )
    expect(result).toBe('open')
  })
})
