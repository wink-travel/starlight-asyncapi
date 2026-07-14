import { expect, test } from '@playwright/test'

import { getType, RECURSIVE_TYPE } from '../libs/items'
import type { SchemaObject } from '../libs/schemaObject'

test('returns the non-string RECURSIVE_TYPE sentinel for a self-referencing array schema, never a literal string', () => {
  // A schema that is an array of itself, e.g. post-`ensureSchemaDereference` object-identity cycle
  // (`Matrix: { type: array, items: $ref -> Matrix }`, resolved into a real circular reference).
  const selfReferencingArray: SchemaObject = { type: 'array' }
  selfReferencingArray.items = selfReferencingArray

  const type = getType(selfReferencingArray)

  expect(type).toBe(RECURSIVE_TYPE)
  expect(typeof type).not.toBe('string')
})

test('propagates the sentinel out of a nested Array<...> wrapper rather than stringifying it', () => {
  // `outer` is `Array<self-referencing-array>` — the inner recursion must not get embedded into an
  // `Array<...>` string (which would require coercing the Symbol sentinel to a string and throw).
  const selfReferencingArray: SchemaObject = { type: 'array' }
  selfReferencingArray.items = selfReferencingArray
  const outer: SchemaObject = { type: 'array', items: selfReferencingArray }

  expect(() => getType(outer)).not.toThrow()
  expect(getType(outer)).toBe(RECURSIVE_TYPE)
})

test('still returns an ordinary type string for non-recursive schemas', () => {
  expect(getType({ type: 'string' })).toBe('string')
  expect(getType({ type: 'array', items: { type: 'string' } })).toBe('Array<string>')
})

test('the WeakSet cycle guard is scoped per top-level call: the same object visited via two independent calls is not falsely flagged recursive', () => {
  const shared: SchemaObject = { type: 'string' }

  expect(getType(shared)).toBe('string')
  // A second, independent top-level call (fresh default `seen`) must not be affected by the first.
  expect(getType(shared)).toBe('string')
})
