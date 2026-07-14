import $RefParser from '@apidevtools/json-schema-ref-parser'

import type { SchemaRegistry } from './schemaBundle'
import type { Schema } from './schemas/schema'

const dereferences = new WeakMap<Schema, Promise<void>>()

/**
 * Dereferences a schema's bundled `#/schemas/<name>` payload/header registry in-memory, at render
 * time only. `@apidevtools/json-schema-ref-parser`'s `dereference()` resolves `$ref` pointers into
 * real (potentially circular) in-memory object references — safe here because, unlike
 * `normalize.ts`'s bundling step, this result is never re-serialized. Mirrors the reference
 * OpenAPI plugin's `WeakMap`-memoized `ensureSchemaDereference` pattern: this is the one place in
 * the codebase allowed to mutate a `Schema` object in place rather than returning a new one.
 */
export async function ensureSchemaDereference(schema: Schema): Promise<void> {
  let promise = dereferences.get(schema)

  if (!promise) {
    promise = (async () => {
      try {
        const { schemas } = await $RefParser.dereference<{ schemas: SchemaRegistry }>(
          { schemas: schema.document.schemas },
          // `mutateInputSchema` defaults to `true`, which would otherwise mutate the plain-JSON
          // registry we pass in (and every other reference to that same object) into a circular
          // graph in place. Forcing `false` makes the parser deep-clone before dereferencing, so
          // the RETURNED `schemas` below is a fresh clone — the input registry is left untouched.
          { mutateInputSchema: false },
        )
        schema.document = { ...schema.document, schemas }
      } catch (error) {
        dereferences.delete(schema)
        throw error
      }
    })()

    dereferences.set(schema, promise)
  }

  await promise
}
