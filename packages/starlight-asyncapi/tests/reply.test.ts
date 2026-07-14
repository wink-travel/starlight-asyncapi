import { expect, test } from '@playwright/test'

import { parseTestSchema } from './utils'

test('resolves the reply channel and messages for a request/reply operation', async () => {
  const schema = await parseTestSchema('v3/request-reply.yaml')
  const { document } = schema

  const operation = document.operations.find((entry) => entry.id === 'getUser')
  expect(operation?.reply).toEqual({
    channelId: 'getUserReply',
    messageIds: ['getUserReply'],
    address: undefined,
  })
})

test('leaves reply undefined for operations without one', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const operation = schema.document.operations.find((entry) => entry.id === 'receiveLightMeasured')

  expect(operation?.reply).toBeUndefined()
})

test('resolves the reply address (location + description) for a reply with no channel', async () => {
  const schema = await parseTestSchema('v3/reply-address.yaml')
  const { document } = schema

  const operation = document.operations.find((entry) => entry.id === 'ping')
  expect(operation?.reply).toEqual({
    channelId: undefined,
    messageIds: ['pingRequest'],
    address: {
      location: '$message.header#/replyTo',
      description: "The dynamic reply destination carried in the request message's `replyTo` header.",
    },
  })
})

test('leaves reply.address undefined for a reply that specifies a channel', async () => {
  const schema = await parseTestSchema('v3/reply-collision.yaml')
  const operation = schema.document.operations.find((entry) => entry.id === 'sendEcho')

  expect(operation?.reply?.address).toBeUndefined()
})
