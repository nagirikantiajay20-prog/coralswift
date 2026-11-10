import { expect, test } from '@playwright/test'

// No credentials needed: route guards, login pages, failure handling and layout.
// Live workflow tests below run only when E2E_* credentials for a TEST environment are set.

const protectedAdmin = [
  '/admin/dashboard',
  '/admin/enquiries',
  '/admin/strategic-enquiries',
  '/admin/users',
]
const protectedPartner = ['/partner/dashboard', '/partner/documents', '/partner/messages']

for (const path of protectedAdmin) {
  test(`unauthenticated ${path} redirects to admin login`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
  })
}

for (const path of protectedPartner) {
  test(`unauthenticated ${path} redirects to partner login`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/partner\/login$/)
    await expect(page.getByRole('heading', { name: 'Partner sign in' })).toBeVisible()
  })
}

for (const [path, heading] of [
  ['/login', 'Admin sign in'],
  ['/partner/login', 'Partner sign in'],
] as const) {
  test(`${path}: labelled form, no horizontal scroll`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
  })

  test(`${path}: rejected login stays on page with no session`, async ({ page }) => {
    await page.route('**/api/v1/auth/login', (r) =>
      r.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials',
          error: { code: 'UNAUTHORIZED' },
        }),
      }),
    )
    await page.goto(path)
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-1')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(path + '$'))
  })

  test(`${path}: backend outage shows an error, not success`, async ({ page }) => {
    await page.route('**/api/v1/auth/login', (r) => r.abort('failed'))
    await page.goto(path)
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-1')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })
}

test('keyboard: login form is reachable by Tab', async ({ page }) => {
  await page.goto('/partner/login')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
})

// --- Live (opt-in, TEST environment only; never point at production data) ---
const live = process.env.E2E_PARTNER_EMAIL && process.env.E2E_PARTNER_PASSWORD
test.describe('live partner session', () => {
  test.skip(!live, 'set E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD (test account, no MFA)')
  test('partner signs in and sees dashboard; admin route denied', async ({ page }) => {
    await page.goto('/partner/login')
    await page.getByLabel('Email').fill(process.env.E2E_PARTNER_EMAIL!)
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PARTNER_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/partner\/dashboard/)
    await page.goto('/admin/dashboard') // full reload drops the in-memory session by design
    await expect(page).toHaveURL(/\/login$/)
  })
})
