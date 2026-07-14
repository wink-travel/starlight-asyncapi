import {
  getOperationsByTag,
  isMinimalOperationTag,
  type NormalizedOperationEntry,
  type OperationTag,
  type TranslateFn,
} from './operation'
import { getSchemaBaseLink, getLinkTransformer, slug, type TrailingSlashTransformer } from './path'
import type { Schema } from './schemas/schema'
import { getActionSidebarBadge, makeSidebarGroup, makeSidebarLink, type SidebarBadge, type SidebarGroup } from './starlight'
import type { StarlightAsyncAPIContext } from './vite'

/**
 * AsyncAPI analog of the reference OpenAPI plugin's `pathItem.ts` (renamed: there is no "path
 * item" concept in AsyncAPI — operations are grouped by tag directly, and there is no webhooks
 * equivalent to fold in).
 */
export function getOperationSidebarGroups(
  pathname: string,
  schema: Schema,
  context: StarlightAsyncAPIContext,
  t: TranslateFn,
): SidebarGroup['entries'] {
  const { config } = schema
  const schemaBaseLink = getSchemaBaseLink(config)
  const transformLink = getLinkTransformer(context)

  return getSchemaNavigationGroups(schema, context, t).map((group) => {
    const items = group.links.map(({ badge, href, label }) => makeSidebarLink(pathname, label, href, badge))

    if (!isMinimalOperationTag(group.operationTag)) {
      items.unshift(
        makeSidebarLink(
          pathname,
          t('nav.overview'),
          transformLink(`${schemaBaseLink}operations/tags/${slug(group.operationTag.name)}`),
        ),
      )
    }

    return makeSidebarGroup(group.label, items, config.sidebar.collapsed)
  })
}

export function getSchemaNavigationGroups(
  schema: Schema,
  context: StarlightAsyncAPIContext,
  t: TranslateFn,
): OperationsNavigationGroup[] {
  const { config } = schema
  const schemaBaseLink = getSchemaBaseLink(config)
  const transformLink = getLinkTransformer(context)
  const operationsByTag = getOperationsByTag(schema, t)

  const operationGroups =
    config.sidebar.tags.sort === 'alphabetical'
      ? [...operationsByTag.entries()].toSorted(([a], [b]) => a.localeCompare(b))
      : [...operationsByTag.entries()]

  return operationGroups.map(([label, operations]) => ({
    label,
    links: getSchemaNavigationLinks(operations.entries, schemaBaseLink, transformLink, config.sidebar.operations, t),
    operationTag: operations.tag,
  }))
}

function getSchemaNavigationLinks(
  operations: NormalizedOperationEntry[],
  schemaBaseLink: string,
  transformLink: TrailingSlashTransformer,
  options: Schema['config']['sidebar']['operations'],
  t: TranslateFn,
): SchemaNavigationLink[] {
  const entries =
    options.sort === 'alphabetical'
      ? operations.toSorted((a, b) => a.sidebar.label.localeCompare(b.sidebar.label))
      : operations

  return entries.map(({ action, channelId, sidebar, slug: operationSlug }) => ({
    action,
    badge: options.badges ? getActionSidebarBadge(action, t) : undefined,
    channelId,
    href: transformLink(schemaBaseLink + operationSlug),
    label: sidebar.label,
  }))
}

interface SchemaNavigationLink {
  action: NormalizedOperationEntry['action']
  badge?: SidebarBadge
  channelId: string
  href: string
  label: string
}

export interface OperationsNavigationGroup {
  label: string
  links: SchemaNavigationLink[]
  operationTag: OperationTag
}

/**
 * Currently an alias for {@link OperationsNavigationGroup} — AsyncAPI has no webhooks-style second
 * navigation group kind the way the reference OpenAPI plugin does. Kept as a distinct exported name
 * so a future Servers/Channels navigation group (deferred past Phase 3, see the master plan) can
 * widen this to a union without changing call sites.
 */
export type SchemaNavigationGroup = OperationsNavigationGroup
