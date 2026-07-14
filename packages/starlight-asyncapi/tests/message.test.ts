import { expect, test } from '@playwright/test'

import { parseTestSchema } from './utils'

test('extracts payload schema references and contentType', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const { document } = schema

  const message = document.messages.find((entry) => entry.id === 'lightMeasured')
  expect(message?.payloadSchemaRef).toBeDefined()
  expect(message?.payloadSchemaRef).toMatch(/^#\/schemas\//)

  const payload = message?.payloadSchemaRef
    ? document.schemas[message.payloadSchemaRef.replace('#/schemas/', '')]
    : undefined
  expect(
    payload && typeof payload === 'object' && 'properties' in payload ? Object.keys(payload.properties ?? {}) : [],
  ).toEqual(['id', 'lumens'])
})

test('extracts correlationId location and description from a message trait', async () => {
  const schema = await parseTestSchema('v3/traits-correlation.yaml')
  const { document } = schema

  const message = document.messages.find((entry) => entry.id === 'orderCreated')
  expect(message?.correlationId).toEqual({
    location: '$message.header#/correlationId',
    description: 'The order correlation identifier.',
  })
})

test('extracts headers schema reference from a message trait', async () => {
  const schema = await parseTestSchema('v3/traits-correlation.yaml')
  const { document } = schema

  const message = document.messages.find((entry) => entry.id === 'orderCreated')
  expect(message?.headersSchemaRef).toMatch(/^#\/schemas\//)

  const headers = message?.headersSchemaRef
    ? document.schemas[message.headersSchemaRef.replace('#/schemas/', '')]
    : undefined
  expect(
    headers && typeof headers === 'object' && 'properties' in headers ? Object.keys(headers.properties ?? {}) : [],
  ).toEqual(['correlationId'])
})

test('extracts message examples', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const message = schema.document.messages.find((entry) => entry.id === 'lightMeasured')

  expect(message?.examples).toEqual([
    { name: 'dimLight', summary: 'A dim light measurement.', payload: { id: 1, lumens: 12 }, headers: undefined },
  ])
})

test('exposes an empty examples array when the message defines none', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const message = schema.document.messages.find((entry) => entry.id === 'turnOnLight')

  expect(message?.examples).toEqual([])
})
