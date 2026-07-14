import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'
import type { AstroIntegrationLogger } from 'astro'
import { AstroError } from 'astro/errors'

import { parseSchema } from '../libs/parser'
import { SchemaConfigSchema } from '../libs/schemas/schema'

import { parseTestSchema } from './utils'

const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
} as unknown as AstroIntegrationLogger

test('throws an AstroError when the schema file does not exist', async () => {
  await expect(parseTestSchema('v3/does-not-exist.yaml')).rejects.toThrow(AstroError)
})

test('throws an AstroError with the diagnostics report when the schema fails validation', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'starlight-asyncapi-test-'))
  const filePath = path.join(dir, 'invalid.yaml')

  try {
    // Missing the required top-level `info` object — a real AsyncAPI validation error, not a mock.
    await writeFile(filePath, 'asyncapi: 3.0.0\nchannels: {}\noperations: {}\n', 'utf8')

    const config = SchemaConfigSchema.parse({
      base: 'test',
      schema: filePath,
      sidebar: {
        collapsed: true,
        operations: { badges: false, labels: 'summary', sort: 'document' },
        tags: { sort: 'document' },
      },
    })

    await expect(parseSchema(silentLogger, new URL(`file://${dir}/`), config)).rejects.toThrow(AstroError)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('successfully parses a schema that only emits informational diagnostics', async () => {
  // `simple-pubsub.yaml` intentionally targets `asyncapi: 3.0.0` rather than the latest `3.1.0`,
  // which the parser flags as an informational (not warning/error) diagnostic — exercises the
  // non-error diagnostic logging branch without failing the parse.
  const schema = await parseTestSchema('v3/simple-pubsub.yaml')
  expect(schema.document.info.title).toBe('Simple Pub/Sub Example')
})
