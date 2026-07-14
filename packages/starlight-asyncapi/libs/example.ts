import { createSchemaExampleValue } from './exampleValue'
import type { NormalizedMessage, NormalizedMessageExample } from './message'
import type { SchemaObject } from './schemaObject'

/**
 * AsyncAPI message examples (`message.examples()`) are a flat array of named `{name, summary,
 * payload, headers}` pairs — unlike the reference OpenAPI plugin's `ExamplesV3` (an OpenAPI
 * `examples` map keyed by name with a single `value`), so this module normalizes either the
 * `payload` or `headers` side of that array into the same shape the reference's `Example(s)`
 * components expect, rather than porting `libs/example.ts`'s OpenAPI-typed `ExampleV3`/`ExamplesV3`
 * verbatim.
 */
/**
 * `name` is only set when the AsyncAPI document itself authors one (`message.examples[].name`) —
 * unlike a previous version of this module, it is NEVER synthesized here (a lib must not originate
 * user-facing copy, and a literal like `example-1` would leak as visible dropdown/heading text).
 * When `name` is `undefined`, callers that need a display label build one via
 * `t('example.numbered', { n: <1-based position> })` — the entry's position in the array it came
 * from doubles as a stable, unique identifier for that purpose.
 */
export interface NamedExampleValue {
  name: string | undefined
  summary: string | undefined
  value: unknown
}

export interface ResolvedExamples {
  example: unknown
  examples: Record<string, NamedExampleValue> | undefined
  generated: boolean
}

export function getPayloadNamedExamples(message: NormalizedMessage): NamedExampleValue[] {
  return toNamedExamples(message.examples, 'payload')
}

export function getHeadersNamedExamples(message: NormalizedMessage): NamedExampleValue[] {
  return toNamedExamples(message.examples, 'headers')
}

/**
 * Resolves the example(s) to render for a schema: authored named example(s) take precedence: a
 * single one renders inline, multiple render as a tab picker. With none authored, a fallback value
 * is generated from the schema itself (flagged `generated: true`), mirroring the reference OpenAPI
 * plugin's `MediaEntries`/`Examples` fallback behavior.
 */
export function resolveExamples(
  namedExamples: NamedExampleValue[],
  schema: SchemaObject | boolean | undefined,
): ResolvedExamples {
  if (namedExamples.length > 1) {
    // Keyed by array index (always unique, never user-facing copy), NOT `example.name` — the
    // latter can be `undefined` (or, in principle, repeated) for unnamed authored examples.
    return {
      example: undefined,
      examples: Object.fromEntries(namedExamples.map((example, index) => [String(index), example])),
      generated: false,
    }
  }

  if (namedExamples.length === 1 && namedExamples[0]) {
    return { example: namedExamples[0].value, examples: undefined, generated: false }
  }

  if (schema === undefined || typeof schema === 'boolean') {
    return { example: undefined, examples: undefined, generated: false }
  }

  return { example: createSchemaExampleValue(schema), examples: undefined, generated: true }
}

function toNamedExamples(examples: NormalizedMessageExample[], field: 'headers' | 'payload'): NamedExampleValue[] {
  const named: NamedExampleValue[] = []

  for (const example of examples) {
    const value = example[field]
    if (value === undefined) continue

    named.push({ name: example.name, summary: example.summary, value })
  }

  return named
}
