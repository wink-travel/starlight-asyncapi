import { expect, test } from '@playwright/test'
import { AstroError } from 'astro/errors'

import { validateConfig } from '../libs/schemas/config'

test('accepts a minimal valid configuration and applies defaults', () => {
  const config = validateConfig([{ base: 'events', schema: 'v3/simple-pubsub.yaml' }])

  expect(config).toHaveLength(1)
  expect(config[0]).toMatchObject({
    base: 'events',
    schema: 'v3/simple-pubsub.yaml',
    sidebar: {
      collapsed: true,
      operations: { badges: false, labels: 'summary', sort: 'document' },
      tags: { sort: 'document' },
    },
  })
})

test('strips leading and trailing slashes from base', () => {
  const config = validateConfig([{ base: '/events/orders/', schema: 'v3/simple-pubsub.yaml' }])

  expect(config[0]?.base).toBe('events/orders')
})

test('throws an AstroError when base is missing', () => {
  expect(() => validateConfig([{ schema: 'v3/simple-pubsub.yaml' }])).toThrow(AstroError)
})

test('throws an AstroError when schema is missing', () => {
  expect(() => validateConfig([{ base: 'events' }])).toThrow(AstroError)
})

test('throws an AstroError when the configuration array is empty', () => {
  expect(() => validateConfig([])).toThrow(AstroError)
})

test('respects explicit sidebar.operations overrides', () => {
  const config = validateConfig([
    {
      base: 'events',
      schema: 'v3/simple-pubsub.yaml',
      sidebar: { operations: { badges: true, labels: 'operationId', sort: 'alphabetical' } },
    },
  ])

  expect(config[0]?.sidebar.operations).toEqual({ badges: true, labels: 'operationId', sort: 'alphabetical' })
})
