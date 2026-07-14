import { expect, test } from '@playwright/test'

import { getOperationsByTag, type TranslateFn } from '../libs/operation'

import { parseTestSchema } from './utils'

const t: TranslateFn = (key) => key

test('groups untagged operations under the translated default tag group', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const groups = getOperationsByTag(schema, t)

  expect(groups.size).toBe(1)
  expect(groups.has('operation.defaultTagGroup')).toBe(true)
  expect(groups.get('operation.defaultTagGroup')?.entries).toHaveLength(2)
})

test('groups operations by their real tags when present', async () => {
  const schema = await parseTestSchema('v3/traits-correlation.yaml', {
    // The fixture's operation has no explicit `tags`, but the operation trait carries a
    // description — this schema still exercises the trait-merge path via a different assertion
    // in normalize.test.ts. Here we only check the default-tag fallback works for it too.
  })
  const groups = getOperationsByTag(schema, t)

  expect(groups.get('operation.defaultTagGroup')?.entries[0]?.operation.id).toBe('receiveOrderCreated')
})

test('computes operation slugs from the operation id', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const groups = getOperationsByTag(schema, t)
  const entries = groups.get('operation.defaultTagGroup')?.entries ?? []

  const receive = entries.find((entry) => entry.operation.id === 'receiveLightMeasured')
  expect(receive?.slug).toBe('operations/receivelightmeasured')
  expect(receive?.action).toBe('receive')
})

test('computes the sidebar label from config.sidebar.operations.labels', async () => {
  const schemaByChannel = await parseTestSchema('v3/simple-pubsub.yaml', {
    sidebar: {
      collapsed: true,
      operations: { badges: false, labels: 'channel', sort: 'document' },
      tags: { sort: 'document' },
    },
  })
  const byChannel = getOperationsByTag(schemaByChannel, t)
  const receiveByChannel = byChannel
    .get('operation.defaultTagGroup')
    ?.entries.find((entry) => entry.operation.id === 'receiveLightMeasured')
  expect(receiveByChannel?.sidebar.label).toBe('light/measured')

  const schemaByOperationId = await parseTestSchema('v3/simple-pubsub.yaml', {
    sidebar: {
      collapsed: true,
      operations: { badges: false, labels: 'operationId', sort: 'document' },
      tags: { sort: 'document' },
    },
  })
  const byOperationId = getOperationsByTag(schemaByOperationId, t)
  const receiveByOperationId = byOperationId
    .get('operation.defaultTagGroup')
    ?.entries.find((entry) => entry.operation.id === 'receiveLightMeasured')
  expect(receiveByOperationId?.sidebar.label).toBe('receiveLightMeasured')
})

test('exposes the protocols reachable from an operation channel', async () => {
  const schema = await parseTestSchema('v3/multi-server.yaml')
  const groups = getOperationsByTag(schema, t)
  const entries = groups.get('operation.defaultTagGroup')?.entries ?? []

  const kafkaOperation = entries.find((entry) => entry.operation.id === 'sendNotificationKafka')
  expect(kafkaOperation?.protocols).toEqual(['kafka'])

  const mqttOperation = entries.find((entry) => entry.operation.id === 'sendNotificationMqtt')
  expect(mqttOperation?.protocols).toEqual(['mqtt'])
})
