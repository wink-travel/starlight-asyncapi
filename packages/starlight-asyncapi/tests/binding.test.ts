import { expect, test } from '@playwright/test'

import { parseTestSchema } from './utils'

test('extracts channel, operation, and message level Kafka bindings', async () => {
  const schema = await parseTestSchema('v3/kafka-bindings.yaml')
  const { document } = schema

  const channel = document.channels.find((entry) => entry.id === 'userSignedUp')
  expect(channel?.bindings).toEqual([
    {
      protocol: 'kafka',
      entries: expect.arrayContaining([
        ['partitions', 3],
        ['replicas', 2],
      ]),
    },
  ])

  const operation = document.operations.find((entry) => entry.id === 'receiveUserSignedUp')
  expect(operation?.bindings[0]?.protocol).toBe('kafka')
  const operationEntryKeys = operation?.bindings[0]?.entries.map(([key]) => key)
  expect(operationEntryKeys).toEqual(expect.arrayContaining(['groupId', 'clientId']))

  const message = document.messages.find((entry) => entry.id === 'userSignedUp')
  const messageEntryKeys = message?.bindings[0]?.entries.map(([key]) => key)
  expect(message?.bindings[0]?.protocol).toBe('kafka')
  expect(messageEntryKeys).toEqual(expect.arrayContaining(['key', 'schemaIdLocation']))
})

test('extracts an MQTT operation binding with qos and retain', async () => {
  const schema = await parseTestSchema('v3/mqtt-qos.yaml')
  const { document } = schema

  const operation = document.operations.find((entry) => entry.id === 'sendDeviceStatus')
  expect(operation?.bindings).toEqual([
    {
      protocol: 'mqtt',
      entries: expect.arrayContaining([
        ['qos', 1],
        ['retain', true],
      ]),
    },
  ])
})

test('returns an empty array when there are no bindings', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const operation = schema.document.operations.find((entry) => entry.id === 'receiveLightMeasured')

  expect(operation?.bindings).toEqual([])
})
