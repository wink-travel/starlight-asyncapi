import { expect, test } from '@playwright/test'

import { SidebarPage } from './fixtures/SidebarPage'
import { TestApp } from './fixtures/TestApp'

test.describe('SSR', () => {
  const app = new TestApp(new URL('apps/ssr/', import.meta.url))

  test.beforeAll(async () => {
    await app.start()
  })

  test.afterAll(async () => {
    await app.stop()
  })

  test('serves Starlight content', async ({ page }) => {
    await page.goto(app.url('/guides/example/'))

    await expect(page.getByRole('heading', { level: 1, name: 'Starlight content' })).toBeVisible()
    await expect(page.getByText('A Starlight documentation page example.')).toBeVisible()
  })

  test('serves an AsyncAPI schema-overview page', async ({ page }) => {
    await page.goto(app.url('/tests/pubsub/'))

    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Simple Pub/Sub Example (1.0.0)' })).toBeVisible()
  })

  test('serves an AsyncAPI operation page', async ({ page }) => {
    await page.goto(app.url('/tests/pubsub/operations/receivelightmeasured/'))

    await expect(page.getByRole('heading', { level: 1, name: 'Receive light measurement events.' })).toBeVisible()
  })

  test('serves an AsyncAPI operation-tag-overview page', async ({ page }) => {
    await page.goto(app.url('/tests/tagged/operations/tags/devices/'))

    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Devices' })).toBeVisible()
  })

  test('404s for an unknown route', async ({ page }) => {
    const response = await page.goto(app.url('/tests/pubsub/operations/does-not-exist/'))

    expect(response?.status()).toBe(404)
  })

  test('renders the expected sidebar', async ({ page }) => {
    const sidebarPage = new SidebarPage(page)

    await page.goto(app.url('/guides/example/'))

    expect(await sidebarPage.getSidebarGroupItems('Starlight')).toMatchObject([{ name: 'Example' }])

    expect(await sidebarPage.getSidebarGroupItems('Simple Pub/Sub')).toMatchObject([
      { name: 'Overview' },
      {
        collapsed: false,
        label: 'Operations',
        items: [{ name: 'Receive light measurement events.' }, { name: 'Send a command to turn on a light.' }],
      },
    ])

    expect(await sidebarPage.getSidebarGroupItems('Tagged Operations')).toMatchObject([
      { name: 'Overview' },
      {
        collapsed: false,
        label: 'Devices',
        items: [
          { name: 'Overview' },
          { name: 'Receive device online events.' },
          { name: 'Receive device offline events.' },
        ],
      },
    ])
  })
})
