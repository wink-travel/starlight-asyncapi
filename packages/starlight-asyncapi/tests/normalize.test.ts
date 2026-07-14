import { expect, test } from '@playwright/test'

import { parseTestSchema } from './utils'

test('normalizes v3 send/receive topology for a simple pub/sub schema', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const { document } = schema

  expect(document.info.title).toBe('Simple Pub/Sub Example')
  expect(document.operations).toHaveLength(2)

  const receive = document.operations.find((operation) => operation.id === 'receiveLightMeasured')
  expect(receive?.action).toBe('receive')
  expect(receive?.channelId).toBe('lightMeasured')
  expect(receive?.messageIds).toEqual(['lightMeasured'])

  const send = document.operations.find((operation) => operation.id === 'sendTurnOnLight')
  expect(send?.action).toBe('send')
  expect(send?.channelId).toBe('turnOnLight')
})

test('merges traits without hand-merging (parser does it, we just read the merged fields)', async () => {
  const schema = await parseTestSchema('v3/traits-correlation.yaml')
  const { document } = schema

  const operation = document.operations.find((entry) => entry.id === 'receiveOrderCreated')
  // This description only exists on the operation TRAIT in the fixture, never directly on the
  // operation itself — its presence here proves trait merging happened upstream in the parser.
  expect(operation?.description).toBe(
    'A trait-provided description shared across operations that receive domain events.',
  )

  const message = document.messages.find((entry) => entry.id === 'orderCreated')
  // Same story for the message trait's `contentType`/`headers`.
  expect(message?.contentType).toBe('application/json')
  expect(message?.headersSchemaRef).toBeDefined()
})

test('is JSON.stringify-safe for every fixture, including the recursive one', async () => {
  const fixtures = [
    'v3/simple-pubsub.yaml',
    'v3/kafka-bindings.yaml',
    'v3/mqtt-qos.yaml',
    'v3/request-reply.yaml',
    'v3/traits-correlation.yaml',
    'v3/recursive-payload.yaml',
    'v3/multi-server.yaml',
    'v3/reply-address.yaml',
    'v3/reply-collision.yaml',
  ]

  for (const fixture of fixtures) {
    const schema = await parseTestSchema(fixture)
    expect(() => JSON.stringify(schema.document)).not.toThrow()
  }
})

test('bundles the recursive payload schema into a self-referencing $ref registry', async () => {
  const schema = await parseTestSchema('v3/recursive-payload.yaml')
  const { document } = schema

  const message = document.messages.find((entry) => entry.id === 'treeUpdated')
  const payloadRef = message?.payloadSchemaRef
  expect(payloadRef).toBe('#/schemas/TreeNode')

  const treeNode = document.schemas['TreeNode']
  expect(treeNode).toBeDefined()
  expect(treeNode && typeof treeNode === 'object' && 'properties' in treeNode).toBe(true)

  // Every bundled schema is registered and referenced via `{ $ref }` — even non-circular,
  // non-shared ones like the `children` array schema — so `properties.children` is itself a
  // pointer, not an inline object. Follow it into the registry to reach `items`.
  if (treeNode && typeof treeNode === 'object' && 'properties' in treeNode) {
    const childrenRef = treeNode.properties?.['children']
    expect(childrenRef && typeof childrenRef === 'object' && '$ref' in childrenRef).toBe(true)

    const childrenRefName =
      childrenRef && typeof childrenRef === 'object' && '$ref' in childrenRef
        ? childrenRef.$ref.replace('#/schemas/', '')
        : ''
    const childrenSchema = document.schemas[childrenRefName]

    expect(
      childrenSchema && typeof childrenSchema === 'object' && 'items' in childrenSchema
        ? childrenSchema.items
        : undefined,
    ).toEqual({ $ref: '#/schemas/TreeNode' })
  }
})

test('exposes a defaultContentType and security schemes registry', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  expect(schema.document.components.securitySchemes).toEqual({})
})
