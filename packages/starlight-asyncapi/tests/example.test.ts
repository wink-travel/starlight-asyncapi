import { expect, test } from '@playwright/test'

import { getPayloadNamedExamples, resolveExamples } from '../libs/example'
import type { NormalizedMessage } from '../libs/message'

function messageWithExamples(examples: { name: string | undefined; payload: unknown }[]): NormalizedMessage {
  return {
    id: 'test-message',
    name: undefined,
    title: undefined,
    summary: undefined,
    description: undefined,
    contentType: undefined,
    payloadSchemaRef: undefined,
    headersSchemaRef: undefined,
    correlationId: undefined,
    bindings: [],
    examples: examples.map((example) => ({ ...example, summary: undefined, headers: undefined })),
    externalDocs: undefined,
  }
}

test('never synthesizes an "example-N" (or any other) literal string as the example name', () => {
  const message = messageWithExamples([
    { name: undefined, payload: { a: 1 } },
    { name: undefined, payload: { b: 2 } },
  ])

  const named = getPayloadNamedExamples(message)

  expect(named).toEqual([
    { name: undefined, summary: undefined, value: { a: 1 } },
    { name: undefined, summary: undefined, value: { b: 2 } },
  ])
  // In particular, no lib-originated literal like the old `example-1`/`example-2`.
  for (const example of named) {
    expect(example.name).toBeUndefined()
  }
})

test('keys the multi-example record by array index, not by (possibly undefined/duplicate) name', () => {
  const message = messageWithExamples([
    { name: undefined, payload: { a: 1 } },
    { name: undefined, payload: { b: 2 } },
    { name: 'namedOne', payload: { c: 3 } },
  ])

  const { examples } = resolveExamples(getPayloadNamedExamples(message), undefined)

  expect(examples).toBeDefined()
  expect(Object.keys(examples ?? {})).toEqual(['0', '1', '2'])
  expect(examples?.['0']?.name).toBeUndefined()
  expect(examples?.['2']?.name).toBe('namedOne')
})

test('preserves an authored example name untouched', () => {
  const message = messageWithExamples([{ name: 'dimLight', payload: { id: 1, lumens: 12 } }])

  const named = getPayloadNamedExamples(message)

  expect(named).toEqual([{ name: 'dimLight', summary: undefined, value: { id: 1, lumens: 12 } }])
})
