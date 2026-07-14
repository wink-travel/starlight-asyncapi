import {
  getProperties,
  getSchemaFormat,
  getSchemaObjects,
  isAdditionalPropertiesWithSchemaObject,
  isArraySchemaType,
  isSchemaObject,
  isSchemaObjectObject,
  type SchemaObject,
} from './schemaObject'

/**
 * Adapted from the reference OpenAPI plugin's `libs/exampleValue.ts`: AsyncAPI payload/header
 * schemas have no OpenAPI-style singular `example` field or parameter-level example precedence
 * (`content.example`, `parameter.example`, ...) — only the plain JSON Schema `const`/`enum`/
 * `default`/`examples` (array) keywords apply, so the parameter-example machinery is dropped.
 */
const schemaExampleValuePrecedence = ['const', 'enum', 'default', 'examples'] as const

/** Generates a fallback example value for a schema with no authored example. */
export function createSchemaExampleValue(rootSchema: SchemaObject): unknown {
  const seen = new WeakSet<SchemaObject>()

  function visit(schema: SchemaObject): unknown {
    if (seen.has(schema)) {
      if (isArraySchemaType(schema.type)) return []
      if (isSchemaObjectObject(schema)) return {}

      return createPrimitiveExampleValue(schema.type, getSchemaFormat(schema))
    }

    seen.add(schema)

    try {
      const value = getSchemaExampleValueByPrecedence(schema)
      if (value !== undefined) return value

      const otherSchemaObjects = getSchemaObjects(schema)?.schemaObjects
      if (otherSchemaObjects) {
        const sortedSchemaObjects = otherSchemaObjects
          .filter((otherSchemaObject) => !seen.has(otherSchemaObject))
          .toSorted((a, b) => getSchemaExamplePriority(b) - getSchemaExamplePriority(a))

        for (const otherSchemaObject of sortedSchemaObjects) {
          const nestedValue = visit(otherSchemaObject)
          if (nestedValue !== undefined) return nestedValue
        }
      }

      if (schema.allOf && schema.allOf.length > 0) {
        const objectValues: Record<string, unknown>[] = []
        let firstValue: unknown

        for (const otherSchemaObject of schema.allOf) {
          const nestedValue = visit(otherSchemaObject)
          if (firstValue === undefined && nestedValue !== undefined) firstValue = nestedValue

          if (isSchemaObjectObject(otherSchemaObject) && isRecordLike(nestedValue)) {
            objectValues.push(nestedValue)
          }
        }

        if (objectValues.length > 0) return Object.assign({}, ...objectValues)
        if (firstValue !== undefined) return firstValue
      }

      if (isSchemaObjectObject(schema)) {
        const value: Record<string, unknown> = {}

        for (const [propertyName, propertySchema] of Object.entries(getProperties(schema))) {
          if (propertySchema.readOnly === true) continue

          const propertyValue = visit(propertySchema)
          if (propertyValue !== undefined) value[propertyName] = propertyValue
        }

        if (Object.keys(value).length > 0) return value
        if (isAdditionalPropertiesWithSchemaObject(schema.additionalProperties)) {
          const additionalPropertyValue = visit(schema.additionalProperties)
          if (additionalPropertyValue !== undefined) return { additionalProperty: additionalPropertyValue }
        }

        return {}
      }

      if (isArraySchemaType(schema.type)) {
        const items = Array.isArray(schema.items) ? schema.items[0] : schema.items

        if (items && isSchemaObject(items)) {
          if (seen.has(items)) return []

          const itemValue = visit(items)
          if (itemValue !== undefined) return [itemValue]
        }

        return ['example']
      }

      return createPrimitiveExampleValue(schema.type, getSchemaFormat(schema))
    } finally {
      seen.delete(schema)
    }
  }

  return visit(rootSchema)
}

export function getSchemaExampleValueByPrecedence(schema: SchemaObject): unknown {
  for (const field of schemaExampleValuePrecedence) {
    switch (field) {
      case 'const': {
        if (schema.const !== undefined) return schema.const
        break
      }
      case 'default': {
        if (schema.default !== undefined) return schema.default
        break
      }
      case 'enum': {
        if (schema.enum && schema.enum.length > 0) return schema.enum[0]
        break
      }
      case 'examples': {
        if (schema.examples && schema.examples.length > 0) return schema.examples[0]
        break
      }
    }
  }

  return undefined
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createPrimitiveExampleValue(primitiveType: unknown, format?: string): unknown {
  const type =
    typeof primitiveType === 'string'
      ? primitiveType
      : Array.isArray(primitiveType) && primitiveType.every((item): item is string => typeof item === 'string')
        ? (primitiveType.find((item) => item !== 'null') ?? primitiveType[0])
        : undefined

  switch (type) {
    case 'boolean': {
      return true
    }
    case 'integer':
    case 'number': {
      return 1
    }
    case 'string': {
      switch (format) {
        case 'date': {
          return '2026-04-15'
        }
        case 'date-time': {
          return '2026-04-15T12:00:00Z'
        }
        case 'email': {
          return 'hello@example.com'
        }
        case 'uri': {
          return 'https://example.com'
        }
        case 'uuid': {
          return '2489E9AD-2EE2-8E00-8EC9-32D5F69181C0'
        }
      }
    }
  }

  return 'example'
}

function getSchemaExamplePriority(schema: SchemaObject): number {
  if (getSchemaExampleValueByPrecedence(schema) !== undefined) return 4
  if (schema.allOf && schema.allOf.length > 0) return 3
  if (isSchemaObjectObject(schema)) return 2
  if (isArraySchemaType(schema.type)) return 1
  return 0
}
