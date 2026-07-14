import { test } from './test'

test('paginates from the homepage to the first schema overview', async ({ page, paginationPage }) => {
  await page.goto('/')

  await paginationPage.expectNextLink('Overview', '/events/pubsub/')
})

test('paginates a schema overview page', async ({ page, paginationPage }) => {
  await page.goto('/events/pubsub/')

  await paginationPage.expectPreviousLink('Getting Started', '/')
  await paginationPage.expectNextLink('Receive light measurement events.', '/events/pubsub/operations/receivelightmeasured/')
})

test('paginates between operation pages within a schema', async ({ page, paginationPage }) => {
  await page.goto('/events/pubsub/operations/receivelightmeasured/')

  await paginationPage.expectPreviousLink('Overview', '/events/pubsub/')
  await paginationPage.expectNextLink('Send a command to turn on a light.', '/events/pubsub/operations/sendturnonlight/')
})

test('paginates from the last operation of a schema into the next schema overview', async ({ page, paginationPage }) => {
  await page.goto('/events/pubsub/operations/sendturnonlight/')

  await paginationPage.expectNextLink('Overview', '/events/kafka/')
})

test('paginates through an operation-tag-overview page', async ({ page, paginationPage }) => {
  await page.goto('/events/tagged/')

  await paginationPage.expectNextLink('Overview', '/events/tagged/operations/tags/devices/')

  await page.goto('/events/tagged/operations/tags/devices/')

  await paginationPage.expectPreviousLink('Overview', '/events/tagged/')
  await paginationPage.expectNextLink('Receive device online events.', '/events/tagged/operations/receivedeviceonline/')
})
