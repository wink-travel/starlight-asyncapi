import { expect, test } from './test'

test('displays the toc for a basic schema overview with no security schemes', async ({ docPage }) => {
  await docPage.goto('/events/pubsub/')

  expect(await docPage.getTocItems()).toMatchObject([
    { name: 'Overview' },
    { name: 'Simple Pub/Sub Example (1.0.0)' },
    { name: 'Operations' },
  ])
})

test('displays the toc for a schema overview with security schemes', async ({ docPage }) => {
  await docPage.goto('/events/security/')

  expect(await docPage.getTocItems()).toMatchObject([
    { name: 'Overview' },
    { name: 'Security Example (1.0.0)' },
    { name: 'Operations' },
    {
      label: 'Authentication',
      items: [{ name: 'apiKey' }, { name: 'oauth' }],
    },
  ])
})

test('displays the toc for an operation with authorizations, messages, and bindings', async ({ docPage }) => {
  await docPage.goto('/events/security/operations/sendorderplaced/')

  expect(await docPage.getTocItems()).toMatchObject([
    { name: 'Overview' },
    { name: 'Authorizations' },
    {
      label: 'Messages',
      items: [{ name: 'orderPlaced' }],
    },
  ])

  await docPage.goto('/events/kafka/operations/receiveusersignedup/')

  expect(await docPage.getTocItems()).toMatchObject([
    { name: 'Overview' },
    {
      label: 'Messages',
      items: [{ name: 'userSignedUp' }],
    },
    {
      label: 'Bindings',
      items: [{ name: 'kafka' }],
    },
  ])
})

test('displays the toc for an operation with a reply', async ({ docPage }) => {
  await docPage.goto('/events/request-reply/operations/getuser/')

  expect(await docPage.getTocItems()).toMatchObject([
    { name: 'Overview' },
    {
      label: 'Messages',
      items: [{ name: 'getUserRequest' }],
    },
    { name: 'Reply' },
  ])
})

test('displays the toc for an operation with a reply that has an address but no channel', async ({ docPage }) => {
  await docPage.goto('/events/reply-address/operations/ping/')

  expect(await docPage.getTocItems()).toMatchObject([
    { name: 'Overview' },
    {
      label: 'Messages',
      items: [{ name: 'pingRequest' }],
    },
    { name: 'Reply' },
  ])
})

test('displays the toc for an operation-tag-overview page', async ({ docPage }) => {
  await docPage.goto('/events/tagged/operations/tags/devices/')

  expect(await docPage.getTocItems()).toMatchObject([{ name: 'Overview' }, { name: 'Devices' }, { name: 'Operations' }])
})
