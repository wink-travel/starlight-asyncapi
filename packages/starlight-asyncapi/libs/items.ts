import type { SchemaObject } from './schemaObject'

/**
 * Sentinel returned by `getType` when its `seen`-guarded cycle detection kicks in (a genuinely
 * self-referencing schema, post-dereference). Deliberately NOT a string — `libs/` must never
 * originate user-facing copy (see the no-hardcoded-strings rule), so this can't be accidentally
 * rendered as-is. Callers that need a label for this case MUST check for the sentinel explicitly
 * and translate it themselves (e.g. `t('schema.type.recursive')`).
 */
export const RECURSIVE_TYPE = Symbol('starlight-asyncapi:recursive-type')

/**
 * AsyncAPI payload/header schemas are plain JSON Schema (no OpenAPI v2 "Items Object" duality to
 * account for), so — unlike the reference OpenAPI plugin's `libs/items.ts` — this operates
 * directly on `SchemaObject` rather than a separate `Items` type.
 */
export function getType(
  items: SchemaObject,
  seen = new WeakSet<object>(),
): string | typeof RECURSIVE_TYPE | undefined {
  if (seen.has(items)) return RECURSIVE_TYPE
  seen.add(items)

  const types = Array.isArray(items.type) ? items.type : items.type ? [items.type] : []

  if (types.includes('array') && items.items) {
    const arrayItems = Array.isArray(items.items) ? items.items[0] : items.items
    const arrayType = arrayItems ? getType(arrayItems, seen) : undefined

    // Propagate the sentinel rather than interpolating it into `Array<${arrayType}>` — a Symbol
    // can't be stringified (it would throw), and this case's meaning ("this whole thing recurses
    // into itself") isn't well captured by an `Array<...>` wrapper anyway.
    if (arrayType === RECURSIVE_TYPE) return RECURSIVE_TYPE

    const type = arrayType ? `Array<${arrayType}>` : 'Array'
    const otherTypes = types.filter((candidate) => candidate !== 'array')

    return [type, ...otherTypes].join(' | ')
  }

  return Array.isArray(items.type) ? items.type.join(' | ') : items.type
}

export function getBound(items: SchemaObject, type: 'maximum' | 'minimum'): string | undefined {
  const exclusive = items[type === 'maximum' ? 'exclusiveMaximum' : 'exclusiveMinimum']
  const sign = type === 'maximum' ? '<' : '>'
  const value = items[type]

  if (typeof exclusive === 'number') {
    return `${sign} ${exclusive}`
  } else if (value !== undefined) {
    return `${sign}= ${value}`
  }

  return undefined
}
