import schemas from 'virtual:starlight-asyncapi/schemas'

import {
  getOperationsByTag,
  isMinimalOperationTag,
  type NormalizedOperationEntry,
  type OperationTag,
  type TranslateFn,
} from './operation'
import { getSchemaBasePath, getSlugFromPathname, slug, stripLeadingAndTrailingSlashes } from './path'
import type { Schema } from './schemas/schema'

/**
 * Route generation runs once at module-evaluation time (triggered by the top-level
 * `virtual:starlight-asyncapi/schemas` import below), long before any request has a locale-aware
 * `Astro.locals.t` to hand it. This identity translator only ever affects the *internal* Map key
 * used to group untagged operations under the synthesized fallback tag (see `operation.ts`'s
 * `getOperationsByTag`) — real, document-authored tag names never pass through translation. The
 * fallback tag is also always `isMinimalOperationTag` (it has no `description`), so it never
 * produces an `operation-tag-overview` route whose URL slug could depend on the translated label.
 * In short: translation never affects which URLs this module generates.
 */
const buildTimeTranslate: TranslateFn = (key) => key

const routes = Object.values(schemas).flatMap((schema): StarlightAsyncAPIRoute[] => [
  {
    params: {
      asyncAPISlug: stripLeadingAndTrailingSlashes(getSchemaBasePath(schema.config)),
    },
    props: {
      schema,
      type: 'schema-overview',
    },
  },
  ...getOperationRoutes(schema),
])

const routesBySlug = new Map(routes.map((route) => [route.params.asyncAPISlug, route]))

export function getSchemaStaticPaths(): StarlightAsyncAPIRoute[] {
  return routes
}

export function getSchemaRouteFromPathname(pathname: string): StarlightAsyncAPIRoute | undefined {
  const routeSlug = getSlugFromPathname(pathname)
  return routeSlug === undefined ? undefined : routesBySlug.get(routeSlug)
}

function getOperationRoutes(schema: Schema): StarlightAsyncAPIRoute[] {
  const schemaBasePath = getSchemaBasePath(schema.config)
  const operations = getOperationsByTag(schema, buildTimeTranslate)

  return [...operations.entries()].flatMap(([, group]) => {
    const routes: StarlightAsyncAPIRoute[] = group.entries.map((operation) => ({
      params: {
        asyncAPISlug: stripLeadingAndTrailingSlashes(schemaBasePath + operation.slug),
      },
      props: {
        operation,
        schema,
        type: 'operation',
      },
    }))

    if (!isMinimalOperationTag(group.tag)) {
      routes.unshift({
        params: {
          asyncAPISlug: stripLeadingAndTrailingSlashes(`${schemaBasePath}operations/tags/${slug(group.tag.name)}`),
        },
        props: {
          schema,
          tag: group.tag,
          type: 'operation-tag-overview',
        },
      })
    }

    return routes
  })
}

export type StarlightAsyncAPIRouteProps =
  | StarlightAsyncAPIRouteSchemaOverviewProps
  | StarlightAsyncAPIRouteOperationProps
  | StarlightAsyncAPIRouteOperationTagOverviewProps

interface StarlightAsyncAPIRoute {
  params: { asyncAPISlug: string }
  props: StarlightAsyncAPIRouteProps
}

interface StarlightAsyncAPIRouteSchemaOverviewProps {
  schema: Schema
  type: 'schema-overview'
}

interface StarlightAsyncAPIRouteOperationTagOverviewProps {
  schema: Schema
  tag: OperationTag
  type: 'operation-tag-overview'
}

interface StarlightAsyncAPIRouteOperationProps {
  operation: NormalizedOperationEntry
  schema: Schema
  type: 'operation'
}
