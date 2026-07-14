import type { SchemaInterface } from '@asyncapi/parser'

/**
 * The cycle-safe payload/header schema re-bundling algorithm.
 *
 * `@asyncapi/parser` fully dereferences `$ref`s into real nested `SchemaInterface` object trees
 * (it does NOT keep `$ref` strings around like `@readme/openapi-parser`'s `bundle()` does), so a
 * naive `JSON.stringify(schema.json())` throws on any genuinely circular schema (e.g. a
 * self-referencing tree node). This module walks the parser's `SchemaInterface` model objects
 * ourselves and re-bundles them into our own flat `$ref`-based registry, which IS safe to
 * `JSON.stringify`.
 *
 * Cycle-safety note (empirically verified, a correction from the plan's initial design):
 * `SchemaInterface` *wrapper* accessor methods (`.payload()`, `.items()`, `.properties()`, ...) do
 * NOT return the same wrapper instance on repeated access, even for the exact same logical schema
 * — wrapper identity is not stable. An identity-keyed `Map<SchemaInterface, string>` therefore
 * CANNOT detect cycles by wrapper identity. What IS stable is `model.json()`: it returns the
 * underlying raw JSON node the wrapper wraps, and — confirmed empirically, including a case where
 * `JSON.stringify` on it throws with "Converting circular structure to JSON" — the parser reuses
 * the exact same raw JSON node object for every access path to the same logical schema, cycles
 * included. `visited` is therefore a `WeakMap` keyed by `model.json()` (the raw node), not by the
 * wrapper instance or by `model.id()` alone (`model.id()` is still used, just for naming the
 * registry entry, since it usually carries the component name or a stable synthesized
 * `'<anonymous-schema-N>'` label).
 */

export type JsonSchemaWithRefs = boolean | JsonSchemaRef | JsonSchemaObject

export interface JsonSchemaRef {
  $ref: string
}

// All fields below are declared as `T | undefined` (present-but-possibly-undefined) rather than
// `field?: T` (optional/absent) so that construction sites can assign `someAccessor() ?? undefined`
// directly without fighting `exactOptionalPropertyTypes`. `JSON.stringify` — the only consumer, via
// the virtual module — drops `undefined`-valued keys identically either way, so the serialized
// output is unaffected by this choice.
export interface JsonSchemaObject {
  // `JsonSchemaWithRefs` already includes `boolean` (the JSON Schema boolean-form case) — no need
  // to repeat it here.
  additionalItems: JsonSchemaWithRefs | undefined
  additionalProperties: JsonSchemaWithRefs | undefined
  allOf: JsonSchemaWithRefs[] | undefined
  anyOf: JsonSchemaWithRefs[] | undefined
  const: unknown
  contains: JsonSchemaWithRefs | undefined
  contentEncoding: string | undefined
  contentMediaType: string | undefined
  default: unknown
  definitions: Record<string, JsonSchemaWithRefs> | undefined
  dependencies: Record<string, JsonSchemaWithRefs | string[]> | undefined
  deprecated: boolean | undefined
  description: string | undefined
  discriminator: string | undefined
  else: JsonSchemaWithRefs | undefined
  enum: unknown[] | undefined
  examples: unknown[] | undefined
  exclusiveMaximum: number | undefined
  exclusiveMinimum: number | undefined
  format: string | undefined
  if: JsonSchemaWithRefs | undefined
  items: JsonSchemaWithRefs | JsonSchemaWithRefs[] | undefined
  maximum: number | undefined
  maxItems: number | undefined
  maxLength: number | undefined
  maxProperties: number | undefined
  minimum: number | undefined
  minItems: number | undefined
  minLength: number | undefined
  minProperties: number | undefined
  multipleOf: number | undefined
  not: JsonSchemaWithRefs | undefined
  oneOf: JsonSchemaWithRefs[] | undefined
  pattern: string | undefined
  patternProperties: Record<string, JsonSchemaWithRefs> | undefined
  properties: Record<string, JsonSchemaWithRefs> | undefined
  propertyNames: JsonSchemaWithRefs | undefined
  readOnly: boolean | undefined
  required: string[] | undefined
  then: JsonSchemaWithRefs | undefined
  title: string | undefined
  type: string | string[] | undefined
  uniqueItems: boolean | undefined
  writeOnly: boolean | undefined
}

export type SchemaRegistry = Record<string, JsonSchemaWithRefs>
export type VisitedSchemas = WeakMap<object, string>

/**
 * Bundles a required `SchemaInterface` model into the `registry`, returning a `{ $ref }` pointer
 * (or the raw boolean for a JSON Schema boolean-form schema). Real structure lives once in
 * `registry`; every call site gets back a pointer.
 */
export function bundleSchema(
  model: SchemaInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): JsonSchemaWithRefs {
  const node = model.json()
  if (typeof node === 'boolean') return node

  const existingName = visited.get(node)
  if (existingName) return { $ref: `#/schemas/${existingName}` }

  // Reserve the name BEFORE recursing so a self-reference encountered while building this same
  // schema's body resolves back to this `$ref` instead of recursing forever.
  const name = reserveSchemaName(model, node, registry, visited)

  registry[name] = buildPlainSchema(model, registry, visited)

  return { $ref: `#/schemas/${name}` }
}

function reserveSchemaName(
  model: SchemaInterface,
  node: object,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): string {
  // `model.id()` is typed as always returning a `string`, but empirically returns `undefined` for
  // some synthesized schemas (e.g. a channel parameter with no explicit `schema:`, which the
  // parser fills in with a default `{ type: 'string' }` schema that was never assigned an
  // `x-parser-schema-id`). Fall back to a generic base name in that case — the collision loop
  // below already disambiguates multiple such id-less schemas within the same document.
  const baseName = sanitizeSchemaName(model.id() || 'schema')
  let name = baseName
  let suffix = 2

  while (name in registry) {
    name = `${baseName}-${suffix}`
    suffix += 1
  }

  visited.set(node, name)

  return name
}

/** Same as {@link bundleSchema}, but tolerates an absent (`undefined`) model. */
export function bundleOptionalSchema(
  model: SchemaInterface | undefined,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): JsonSchemaWithRefs | undefined {
  return model ? bundleSchema(model, registry, visited) : undefined
}

function sanitizeSchemaName(schemaId: string): string {
  return schemaId.replaceAll(/^<|>$/g, '')
}

function buildPlainSchema(model: SchemaInterface, registry: SchemaRegistry, visited: VisitedSchemas): JsonSchemaObject {
  const schema = createEmptySchema()

  assignPrimitiveKeywords(schema, model)
  assignSingleSchemaKeywords(schema, model, registry, visited)
  assignSchemaArrayKeywords(schema, model, registry, visited)
  assignSchemaRecordKeywords(schema, model, registry, visited)
  assignItemsKeyword(schema, model, registry, visited)
  assignBooleanOrSchemaKeywords(schema, model, registry, visited)

  return schema
}

function createEmptySchema(): JsonSchemaObject {
  return {
    additionalItems: undefined,
    additionalProperties: undefined,
    allOf: undefined,
    anyOf: undefined,
    const: undefined,
    contains: undefined,
    contentEncoding: undefined,
    contentMediaType: undefined,
    default: undefined,
    definitions: undefined,
    dependencies: undefined,
    deprecated: undefined,
    description: undefined,
    discriminator: undefined,
    else: undefined,
    enum: undefined,
    examples: undefined,
    exclusiveMaximum: undefined,
    exclusiveMinimum: undefined,
    format: undefined,
    if: undefined,
    items: undefined,
    maximum: undefined,
    maxItems: undefined,
    maxLength: undefined,
    maxProperties: undefined,
    minimum: undefined,
    minItems: undefined,
    minLength: undefined,
    minProperties: undefined,
    multipleOf: undefined,
    not: undefined,
    oneOf: undefined,
    pattern: undefined,
    patternProperties: undefined,
    properties: undefined,
    propertyNames: undefined,
    readOnly: undefined,
    required: undefined,
    // `then` is a real JSON Schema if/then/else keyword we must round-trip; this plain data
    // object is never awaited, so it is not an actual thenable footgun.
    // eslint-disable-next-line unicorn/no-thenable
    then: undefined,
    title: undefined,
    type: undefined,
    uniqueItems: undefined,
    writeOnly: undefined,
  }
}

function assignPrimitiveKeywords(schema: JsonSchemaObject, model: SchemaInterface): void {
  schema.const = model.const()
  schema.contentEncoding = model.contentEncoding()
  schema.contentMediaType = model.contentMediaType()
  schema.default = model.default()
  schema.deprecated = model.deprecated() ? true : undefined
  schema.description = model.description()
  schema.discriminator = model.discriminator()
  schema.enum = model.enum()
  schema.examples = model.examples()
  schema.exclusiveMaximum = model.exclusiveMaximum()
  schema.exclusiveMinimum = model.exclusiveMinimum()
  schema.format = model.format()
  schema.maximum = model.maximum()
  schema.maxItems = model.maxItems()
  schema.maxLength = model.maxLength()
  schema.maxProperties = model.maxProperties()
  schema.minimum = model.minimum()
  schema.minItems = model.minItems()
  schema.minLength = model.minLength()
  schema.minProperties = model.minProperties()
  schema.multipleOf = model.multipleOf()
  schema.pattern = model.pattern()
  schema.readOnly = model.readOnly()
  schema.required = model.required()
  schema.title = model.title()
  schema.type = model.type()
  schema.uniqueItems = model.uniqueItems()
  schema.writeOnly = model.writeOnly()
}

const singleSchemaKeywords = ['contains', 'else', 'if', 'not', 'propertyNames', 'then'] as const

function assignSingleSchemaKeywords(
  schema: JsonSchemaObject,
  model: SchemaInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): void {
  for (const keyword of singleSchemaKeywords) {
    schema[keyword] = bundleOptionalSchema(model[keyword](), registry, visited)
  }
}

const schemaArrayKeywords = ['allOf', 'anyOf', 'oneOf'] as const

function assignSchemaArrayKeywords(
  schema: JsonSchemaObject,
  model: SchemaInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): void {
  for (const keyword of schemaArrayKeywords) {
    const models = model[keyword]()
    schema[keyword] = models?.map((nested) => bundleSchema(nested, registry, visited))
  }
}

function assignSchemaRecordKeywords(
  schema: JsonSchemaObject,
  model: SchemaInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): void {
  const definitions = model.definitions()
  schema.definitions = definitions ? bundleSchemaRecord(definitions, registry, visited) : undefined

  const patternProperties = model.patternProperties()
  schema.patternProperties = patternProperties ? bundleSchemaRecord(patternProperties, registry, visited) : undefined

  const properties = model.properties()
  schema.properties = properties ? bundleSchemaRecord(properties, registry, visited) : undefined

  const dependencies = model.dependencies()
  schema.dependencies = dependencies ? bundleDependencies(dependencies, registry, visited) : undefined
}

function assignItemsKeyword(
  schema: JsonSchemaObject,
  model: SchemaInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): void {
  const items = model.items()
  if (!items) {
    schema.items = undefined
    return
  }

  schema.items = Array.isArray(items)
    ? items.map((item) => bundleSchema(item, registry, visited))
    : bundleSchema(items, registry, visited)
}

/**
 * `additionalItems`/`additionalProperties` are the only two keywords whose accessor materializes a
 * JSON Schema draft-07 default (`true`) even when the author never wrote the keyword. Guard against
 * leaking that synthesized default into the normalized output by checking the raw JSON for presence
 * first.
 */
function assignBooleanOrSchemaKeywords(
  schema: JsonSchemaObject,
  model: SchemaInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): void {
  const raw = model.json()
  if (typeof raw === 'boolean') return

  if ('additionalItems' in raw) {
    const additionalItems = model.additionalItems()
    schema.additionalItems =
      typeof additionalItems === 'boolean' ? additionalItems : bundleSchema(additionalItems, registry, visited)
  }

  if ('additionalProperties' in raw) {
    const additionalProperties = model.additionalProperties()
    schema.additionalProperties =
      typeof additionalProperties === 'boolean'
        ? additionalProperties
        : bundleSchema(additionalProperties, registry, visited)
  }
}

function bundleSchemaRecord(
  models: Record<string, SchemaInterface>,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): Record<string, JsonSchemaWithRefs> {
  return Object.fromEntries(Object.entries(models).map(([key, model]) => [key, bundleSchema(model, registry, visited)]))
}

function bundleDependencies(
  dependencies: Record<string, SchemaInterface | string[]>,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): Record<string, JsonSchemaWithRefs | string[]> {
  const result: Record<string, JsonSchemaWithRefs | string[]> = {}

  for (const [key, value] of Object.entries(dependencies)) {
    result[key] = Array.isArray(value) ? value : bundleSchema(value, registry, visited)
  }

  return result
}
