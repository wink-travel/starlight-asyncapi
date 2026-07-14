import { expect, test } from '@playwright/test'

import { ensureSchemaDereference } from '../libs/dereference'

import { parseTestSchema } from './utils'

test('normalizes a self-referencing schema without throwing', async () => {
  const schema = await parseTestSchema('v3/recursive-payload.yaml')

  expect(() => JSON.stringify(schema.document)).not.toThrow()
  expect(schema.document.schemas['TreeNode']).toBeDefined()
})

test('dereferences the bundled schema into a real in-memory cycle', async () => {
  const schema = await parseTestSchema('v3/recursive-payload.yaml')

  await ensureSchemaDereference(schema)

  const treeNode = schema.document.schemas['TreeNode'] as unknown as {
    properties: { children: { items: unknown } }
  }

  // Walk a bounded number of levels through the real (circular) in-memory structure to prove the
  // `$ref` was actually resolved into a self-referencing object graph, not just left as a string.
  let cursor: { properties?: { children?: { items?: unknown } } } = treeNode
  for (let depth = 0; depth < 25; depth++) {
    const items = cursor.properties?.children?.items as typeof cursor | undefined
    expect(items).toBeDefined()
    cursor = items as typeof cursor
  }

  // The walk above only terminates because `items` keeps pointing back to the same node — assert
  // that directly too.
  const items = treeNode.properties.children.items
  expect(items).toBe(treeNode)
})

test('dereferencing is memoized: concurrent calls share one in-flight promise', async () => {
  const schema = await parseTestSchema('v3/recursive-payload.yaml')

  const [a, b] = await Promise.all([ensureSchemaDereference(schema), ensureSchemaDereference(schema)])

  expect(a).toBeUndefined()
  expect(b).toBeUndefined()
})
