import type { NormalizedAsyncAPIDocument } from './normalize'
import { isObjectLike } from './predicate'
import type { JsonSchemaWithRefs } from './schemaBundle'

/**
 * The render-time view of a bundled payload/header schema, AFTER `ensureSchemaDereference()` has
 * resolved every `#/schemas/<name>` `$ref` into a real (potentially circular) in-memory object —
 * see `libs/dereference.ts`. `JsonSchemaWithRefs` (from `schemaBundle.ts`) is the *pre-dereference*
 * shape, still including the `$ref` branch; this type is its post-dereference counterpart, with
 * every nested field re-typed to reference `SchemaObject` instead of `JsonSchemaWithRefs`.
 *
 * `resolveSchema`/`resolveSchemaRef` below are the ONLY places that bridge the two: a documented
 * cast, safe because `ensureSchemaDereference` guarantees no `$ref` marker survives into the
 * object graph these components ever see.
 */
export interface SchemaObject {
  additionalItems?: boolean | SchemaObject
  additionalProperties?: boolean | SchemaObject
  allOf?: SchemaObject[]
  anyOf?: SchemaObject[]
  const?: unknown
  contains?: SchemaObject
  contentEncoding?: string
  contentMediaType?: string
  default?: unknown
  definitions?: Record<string, SchemaObject>
  dependencies?: Record<string, SchemaObject | string[]>
  deprecated?: boolean
  description?: string
  discriminator?: string
  else?: SchemaObject
  enum?: unknown[]
  examples?: unknown[]
  exclusiveMaximum?: number
  exclusiveMinimum?: number
  format?: string
  if?: SchemaObject
  items?: SchemaObject | SchemaObject[]
  maximum?: number
  maxItems?: number
  maxLength?: number
  maxProperties?: number
  minimum?: number
  minItems?: number
  minLength?: number
  minProperties?: number
  multipleOf?: number
  not?: SchemaObject
  oneOf?: SchemaObject[]
  pattern?: string
  patternProperties?: Record<string, SchemaObject>
  properties?: Record<string, SchemaObject>
  propertyNames?: SchemaObject
  readOnly?: boolean
  required?: string[]
  then?: SchemaObject
  title?: string
  type?: string | string[]
  uniqueItems?: boolean
  writeOnly?: boolean
}

export type Properties = Record<string, SchemaObject>
export type Discriminator = string | undefined

export interface SchemaObjects {
  schemaObjects: SchemaObject[]
  type: 'anyOf' | 'oneOf'
}

type SchemaObjectObject =
  | (SchemaObject & { type: 'object' })
  | (SchemaObject & { properties: Properties })
  | (SchemaObject & { oneOf: SchemaObject[] })
  | (SchemaObject & { anyOf: SchemaObject[] })
  | (SchemaObject & { allOf: SchemaObject[] })

/** See the module doc comment: the one documented cast bridging bundled and resolved schemas. */
export function resolveSchema(schema: JsonSchemaWithRefs | undefined): SchemaObject | boolean | undefined {
  return schema as SchemaObject | boolean | undefined
}

/** Resolves a `#/schemas/<name>` ref string against a (post-dereference) schema registry. */
export function resolveSchemaRef(
  document: Pick<NormalizedAsyncAPIDocument, 'schemas'>,
  ref: string | undefined,
): SchemaObject | boolean | undefined {
  if (!ref) return undefined

  const name = ref.replace('#/schemas/', '')
  return resolveSchema(document.schemas[name])
}

export function getNullable(schemaObject: SchemaObject): boolean {
  return Array.isArray(schemaObject.type) && schemaObject.type.includes('null')
}

export function isSchemaObjectObject(schemaObject: SchemaObject): schemaObject is SchemaObjectObject {
  return (
    schemaObject.type === 'object' ||
    schemaObject.properties !== undefined ||
    (schemaObject.oneOf?.some(isSchemaObjectObject) ?? false) ||
    (schemaObject.anyOf?.some(isSchemaObjectObject) ?? false) ||
    (schemaObject.allOf?.some(isSchemaObjectObject) ?? false)
  )
}

export function isSchemaObjectAllOf(schemaObject: SchemaObject): boolean {
  return schemaObject.type === 'object' || schemaObject.allOf !== undefined
}

export function getProperties(schemaObject: SchemaObject): Properties {
  return schemaObject.properties ?? {}
}

export function isAdditionalPropertiesWithSchemaObject(
  additionalProperties: SchemaObject['additionalProperties'],
): additionalProperties is SchemaObject {
  return isObjectLike(additionalProperties)
}

export function isSchemaObject(schemaObject: unknown): schemaObject is SchemaObject {
  return isObjectLike(schemaObject)
}

export function isArraySchemaType(type: SchemaObject['type']): boolean {
  return type === 'array' || (Array.isArray(type) && type.includes('array'))
}

export function getSchemaObjects(schemaObject: SchemaObject): SchemaObjects | undefined {
  if (schemaObject.oneOf && schemaObject.oneOf.length > 0) {
    const { oneOf, ...otherProperties } = schemaObject

    return { schemaObjects: normalizeSchemaObjects(oneOf, otherProperties), type: 'oneOf' }
  } else if (schemaObject.anyOf && schemaObject.anyOf.length > 0) {
    const { anyOf, ...otherProperties } = schemaObject

    return { schemaObjects: normalizeSchemaObjects(anyOf, otherProperties), type: 'anyOf' }
  }

  return undefined
}

export function getSchemaObjectItems(schemaObject: unknown): SchemaObject | undefined {
  if (!isObjectLike(schemaObject) || !('items' in schemaObject)) return undefined

  const items = (schemaObject as SchemaObject).items
  return isSchemaObject(items) && !Array.isArray(items) ? items : undefined
}

export function getRecursiveSchemaObject(schemaObject: SchemaObject, parents: SchemaObject[]): SchemaObject | undefined {
  const items = getSchemaObjectItems(schemaObject)

  return parents.find((parent) => parent === schemaObject || parent === items)
}

export function getRecursiveSchemaObjectItems(
  schemaObject: SchemaObject,
  parents: SchemaObject[],
): SchemaObject | undefined {
  const items = getSchemaObjectItems(schemaObject)

  return items && parents.includes(items) ? items : undefined
}

export function getSchemaFormat(schema: SchemaObject): string | undefined {
  return schema.format
}

export function getSchemaObjectRequired(schemaObject: SchemaObject): string[] | undefined {
  return mergeRequired(
    schemaObject.required,
    schemaObject.allOf?.flatMap((allOfSchemaObject) => allOfSchemaObject.required ?? []),
  )
}

function normalizeSchemaObjects(schemaObjects: SchemaObject[], parentSchemaObject: SchemaObject): SchemaObject[] {
  return schemaObjects.map((schemaObjectsObject) => {
    const parentIsObject = isSchemaObjectObject(parentSchemaObject)
    const schemaObjectIsObject = isSchemaObjectObject(schemaObjectsObject)
    const shouldNormalize = schemaObjectsObject.type === undefined || (parentIsObject && schemaObjectIsObject)

    if (!shouldNormalize) return schemaObjectsObject

    if (parentIsObject && schemaObjectIsObject) {
      const properties = { ...getProperties(parentSchemaObject), ...getProperties(schemaObjectsObject) }
      const required = mergeRequired(getSchemaObjectRequired(parentSchemaObject), getSchemaObjectRequired(schemaObjectsObject))

      const normalizedSchemaObject: SchemaObject = {
        ...parentSchemaObject,
        ...schemaObjectsObject,
        ...(Object.keys(properties).length > 0 ? { properties } : {}),
        ...(required ? { required } : {}),
      }

      if (!normalizedSchemaObject.type && normalizedSchemaObject.properties) {
        normalizedSchemaObject.type = 'object'
      }

      return normalizedSchemaObject
    }

    const normalizedSchemaObject: SchemaObject = { ...parentSchemaObject, ...schemaObjectsObject }

    if (!normalizedSchemaObject.type && normalizedSchemaObject.properties) {
      normalizedSchemaObject.type = 'object'
    }

    return normalizedSchemaObject
  })
}

function mergeRequired(...requiredValues: (string[] | undefined)[]): string[] | undefined {
  const required = requiredValues.flatMap((value) => value ?? [])

  return required.length > 0 ? [...new Set(required)] : undefined
}
