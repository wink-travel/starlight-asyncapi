import { expect, test } from '@playwright/test'

import { ensureSchemaDereference } from '../libs/dereference'

import { parseTestSchema } from './utils'

test('dereferences payload schemas so $ref pointers resolve to real objects', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  const message = schema.document.messages.find((entry) => entry.id === 'lightMeasured')
  const ref = message?.payloadSchemaRef?.replace('#/schemas/', '') ?? ''

  await ensureSchemaDereference(schema)

  const payload = schema.document.schemas[ref] as { type: string; properties: Record<string, unknown> }
  expect(payload.type).toBe('object')
  expect(Object.keys(payload.properties)).toEqual(['id', 'lumens'])
})

test('memoizes the dereference promise: a second call after success is a no-op re-resolve, not a re-run', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')

  await ensureSchemaDereference(schema)
  const dereferencedSchemas = schema.document.schemas

  await ensureSchemaDereference(schema)

  // Re-resolving should not have replaced the already-dereferenced registry with a new object.
  expect(schema.document.schemas).toBe(dereferencedSchemas)
})

test('concurrent calls before the first resolves share the same in-flight promise', async () => {
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')

  const first = ensureSchemaDereference(schema)
  const second = ensureSchemaDereference(schema)

  await Promise.all([first, second])

  const message = schema.document.messages.find((entry) => entry.id === 'lightMeasured')
  const ref = message?.payloadSchemaRef?.replace('#/schemas/', '') ?? ''
  const payload = schema.document.schemas[ref] as { type: string }
  expect(payload.type).toBe('object')
})

test('does not mutate the pre-dereference plain-JSON schema registry in place', async () => {
  const schema = await parseTestSchema('v3/recursive-payload.yaml')
  // Captured BEFORE `ensureSchemaDereference` runs. If dereferencing mutates the input in place
  // (the `@apidevtools/json-schema-ref-parser` default, `mutateInputSchema: true`), this same
  // object gets turned into a circular graph by the call below, even though we never touch it
  // again ourselves — proving the registry is no longer a safe, `JSON.stringify`-able snapshot.
  const registryBeforeDereference = schema.document.schemas

  await ensureSchemaDereference(schema)

  expect(() => JSON.stringify(registryBeforeDereference)).not.toThrow()
})
