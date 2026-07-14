import type { AstroIntegrationLogger } from 'astro'
import type { z } from 'astro/zod'

import { ensureSchemaDereference } from '../libs/dereference'
import { parseSchema } from '../libs/parser'
import { type Schema, SchemaConfigSchema } from '../libs/schemas/schema'

const schemasRoot = new URL('../../../schemas/', import.meta.url)

const stubLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  fork: () => stubLogger,
  options: {},
  label: 'test',
} as unknown as AstroIntegrationLogger

export async function parseTestSchema(
  schemaPath: string,
  schemaConfig: Partial<z.input<typeof SchemaConfigSchema>> = {},
): Promise<Schema> {
  const schema = await parseSchema(
    stubLogger,
    schemasRoot,
    SchemaConfigSchema.parse({
      base: 'test',
      schema: schemaPath,
      sidebar: {
        collapsed: true,
        operations: { badges: false, labels: 'summary', sort: 'document' },
        tags: { sort: 'document' },
      },
      ...schemaConfig,
    }),
  )

  return schema
}

export async function parseAndDereferenceTestSchema(
  schemaPath: string,
  schemaConfig: Partial<z.input<typeof SchemaConfigSchema>> = {},
): Promise<Schema> {
  const schema = await parseTestSchema(schemaPath, schemaConfig)

  await ensureSchemaDereference(schema)

  return schema
}
