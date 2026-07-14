import { expect, test } from '@playwright/test'

import { parseTestSchema } from './utils'

test('extracts channel address and parameters', async () => {
  const schema = await parseTestSchema('v3/mqtt-qos.yaml')
  const { document } = schema

  const channel = document.channels.find((entry) => entry.id === 'deviceStatus')
  expect(channel?.address).toBe('device/{deviceId}/status')
  expect(channel?.parameters['deviceId']?.description).toBe('The unique identifier of the device.')
})

test('links channels to their messages and servers', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const { document } = schema

  const channel = document.channels.find((entry) => entry.id === 'lightMeasured')
  expect(channel?.messageIds).toEqual(['lightMeasured'])
  expect(channel?.serverIds).toEqual(['websocket'])
})

test('has no title/summary fields (AsyncAPI v3 Channel Object has neither)', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const channel = schema.document.channels[0]

  expect(channel).toBeDefined()
  expect('title' in (channel ?? {})).toBe(false)
  expect('summary' in (channel ?? {})).toBe(false)
})
