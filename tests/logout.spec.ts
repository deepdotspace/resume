import { test, expect } from 'deepspace/testing'

test('log out button signs the user out to the auth overlay', async ({ users }) => {
  const [user] = await users(1)
  await user.page.goto('/home')
  await expect(user.page.locator('.wordmark')).toBeVisible({ timeout: 20000 })
  await user.page.getByTitle('Log out').click()
  await expect(user.page.getByTestId('auth-overlay')).toBeVisible({ timeout: 15000 })
  await user.page.screenshot({ path: '/private/tmp/claude-501/-Users-harshkathiriya-Downloads-test/f10ab66a-4904-4f55-a396-2bc8abeeafe6/scratchpad/logout.png' })
})
