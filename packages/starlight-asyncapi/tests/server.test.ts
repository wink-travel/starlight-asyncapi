import { expect, test } from '@playwright/test'

import { parseTestSchema } from './utils'

test('normalizes multiple servers on different protocols', async () => {
  const schema = await parseTestSchema('v3/multi-server.yaml')
  const { document } = schema

  expect(document.servers).toHaveLength(2)

  const kafka = document.servers.find((server) => server.id === 'kafka')
  expect(kafka?.protocol).toBe('kafka')
  expect(kafka?.host).toBe('kafka.example.com:9092')

  const mqtt = document.servers.find((server) => server.id === 'mqtt')
  expect(mqtt?.protocol).toBe('mqtt')
  expect(mqtt?.host).toBe('broker.example.com:1883')
})

test('scopes channels/operations to a subset of the document servers', async () => {
  const schema = await parseTestSchema('v3/multi-server.yaml')
  const { document } = schema

  const kafkaChannel = document.channels.find((channel) => channel.id === 'notificationSentKafka')
  expect(kafkaChannel?.serverIds).toEqual(['kafka'])

  const mqttChannel = document.channels.find((channel) => channel.id === 'notificationSentMqtt')
  expect(mqttChannel?.serverIds).toEqual(['mqtt'])
})

test('extracts channel parameters as server variables are absent here, but server host/protocol are present', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const server = schema.document.servers.find((entry) => entry.id === 'websocket')

  expect(server?.host).toBe('example.com')
  expect(server?.protocol).toBe('ws')
  expect(server?.variables).toEqual({})
})
