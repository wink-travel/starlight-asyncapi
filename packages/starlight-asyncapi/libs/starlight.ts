import type { StarlightRouteData } from '@astrojs/starlight/route-data'
import type { HookParameters } from '@astrojs/starlight/types'
import type { MarkdownHeading } from 'astro'

import { getOperationsByTag, type NormalizedOperationEntry, type OperationTag, type TranslateFn } from './operation'
import { slug, stripHtmlExtension, stripLeadingAndTrailingSlashes } from './path'
import { isObjectLike } from './predicate'
import { getSchemaSidebarGroups, type Schema } from './schemas/schema'
import type { StarlightAsyncAPIContext } from './vite'

const starlightAsyncAPISidebarGroupsLabel = Symbol('StarlightAsyncAPISidebarGroupsLabel')

export function getSidebarGroupsPlaceholder(): SidebarManualGroupConfig[] {
  return [getSidebarGroupPlaceholder(starlightAsyncAPISidebarGroupsLabel)]
}

export function getSidebarGroupPlaceholder(label: symbol): SidebarManualGroupConfig {
  return {
    collapsed: false,
    items: [],
    label: label.toString(),
  }
}

export function getPageProps(
  t: TranslateFn,
  title: string,
  schema: Schema,
  operationEntry?: NormalizedOperationEntry,
  tag?: OperationTag,
): StarlightPageProps {
  const isSchemaOverview = operationEntry === undefined
  const isOperationTagOverview = tag !== undefined

  return {
    frontmatter: {
      title,
    },
    headings: isOperationTagOverview
      ? getOperationTagOverviewHeadings(t, schema, tag)
      : isSchemaOverview
        ? getSchemaOverviewHeadings(t, schema)
        : getOperationHeadings(t, schema, operationEntry),
  }
}

export function getSidebarFromSchemas(
  pathname: string,
  sidebar: StarlightRouteData['sidebar'],
  schemas: Schema[],
  context: StarlightAsyncAPIContext,
  t: TranslateFn,
): StarlightRouteData['sidebar'] {
  if (sidebar.length === 0) {
    return sidebar
  }

  const sidebarGroups = schemas.map((schema) =>
    getSchemaSidebarGroups(pathname, schema, context, t, starlightAsyncAPISidebarGroupsLabel.toString()),
  )

  const sidebarGroupsMap: Record<string, SidebarGroup[]> = {}

  for (const [label, group] of sidebarGroups) {
    sidebarGroupsMap[label] ??= []
    sidebarGroupsMap[label].push(group)
  }

  function replaceSidebarGroupsPlaceholder(group: SidebarGroup): SidebarGroup | SidebarGroup[] {
    const groups = sidebarGroupsMap[group.label]

    if (groups) {
      return groups
    }

    if (isSidebarGroup(group)) {
      return {
        ...group,
        entries: group.entries.flatMap((item) => {
          return isSidebarGroup(item) ? replaceSidebarGroupsPlaceholder(item) : item
        }),
      }
    }

    return group
  }

  return sidebar.flatMap((item) => {
    return isSidebarGroup(item) ? replaceSidebarGroupsPlaceholder(item) : item
  })
}

export function makeSidebarGroup(label: string, entries: SidebarItem[], collapsed: boolean): SidebarGroup {
  return { type: 'group', collapsed, entries, label, badge: undefined }
}

export function makeSidebarLink(pathname: string, label: string, href: string, badge?: SidebarBadge): SidebarLink {
  return {
    type: 'link',
    isCurrent: pathname === stripLeadingAndTrailingSlashes(stripHtmlExtension(href)),
    label,
    href,
    badge,
    attrs: {},
  }
}

/**
 * The AsyncAPI analog of the reference OpenAPI plugin's `getMethodSidebarBadge`: instead of an
 * HTTP method (`GET`/`POST`/...), an AsyncAPI operation only ever has one of two actions. Unlike
 * an HTTP method mnemonic, "Send"/"Receive" reads as ordinary UI copy to an end user, so — per the
 * no-hardcoded-strings rule — its text is resolved through the translate function rather than
 * hardcoded like the reference's `method.toUpperCase()`.
 */
export function getActionSidebarBadge(action: NormalizedOperationEntry['action'], t: TranslateFn): SidebarBadge {
  return {
    class: `sl-asyncapi-action-${action}`,
    text: t(`operation.action.${action}`),
    variant: action === 'send' ? 'success' : 'note',
  }
}

export function getPaginationLinks(
  sidebar: StarlightRouteData['sidebar'],
  config: Pick<StarlightRouteData['entry']['data'], 'prev' | 'next'>,
  context: StarlightAsyncAPIContext,
): StarlightRouteData['pagination'] {
  const links = flattenSidebar(sidebar)
  const currentIndex = links.findIndex((entry) => entry.isCurrent)

  return {
    prev: applyPaginationLinkConfig(links[currentIndex - 1], config.prev, context),
    next: applyPaginationLinkConfig(currentIndex > -1 ? links[currentIndex + 1] : undefined, config.next, context),
  }
}

function flattenSidebar(sidebar: StarlightRouteData['sidebar']): SidebarLink[] {
  return sidebar.flatMap((entry) => (entry.type === 'group' ? flattenSidebar(entry.entries) : entry))
}

// https://github.com/withastro/starlight/blob/cb573b5410ab97620b59f71a5a6e448f13b88a7f/packages/starlight/utils/navigation.ts#L495-L526
function applyPaginationLinkConfig(
  link: SidebarLink | undefined,
  config: StarlightRouteData['entry']['data']['prev'],
  context: StarlightAsyncAPIContext,
): SidebarLink | undefined {
  // Explicitly remove the link.
  if (config === false) return undefined
  // Use the generated link if any.
  if (config === true) return link
  // If a link exists, update its label if needed.
  if (typeof config === 'string' && link) return { ...link, label: config }

  if (isObjectLike(config)) {
    if (link) {
      return {
        ...link,
        label: config.label ?? link.label,
        href: config.link ?? link.href,
        // Explicitly remove sidebar link attributes for prev/next links.
        attrs: {},
      }
    }
    if (config.link && config.label) {
      // If there is no link and the frontmatter contains both a URL and a label, create a new link.
      return {
        type: 'link',
        isCurrent: false,
        label: config.label,
        href: config.link,
        badge: undefined,
        attrs: {},
      }
    }
  }

  // Otherwise, if the global config is enabled, return the generated link if any.
  return context.pagination ? link : undefined
}

function isSidebarGroup(item: SidebarItem): item is SidebarGroup {
  return item.type === 'group'
}

function getSchemaOverviewHeadings(t: TranslateFn, schema: Schema): MarkdownHeading[] {
  const { document } = schema

  const items: MarkdownHeading[] = [makeHeading(2, `${document.info.title} (${document.info.version})`, 'overview')]

  if (hasSchemaNavigationItems(schema, t)) {
    items.push(makeHeading(2, t('nav.operations')))
  }

  const securitySchemeNames = Object.keys(document.components.securitySchemes)

  if (securitySchemeNames.length > 0) {
    items.push(makeHeading(2, t('security.authentication')), ...securitySchemeNames.map((name) => makeHeading(3, name)))
  }

  return makeHeadings(t, items)
}

function getOperationTagOverviewHeadings(t: TranslateFn, schema: Schema, tag: OperationTag): MarkdownHeading[] {
  const items: MarkdownHeading[] = [makeHeading(2, tag.name, 'overview')]

  if (hasOperationTagNavigationItems(schema, tag, t)) {
    items.push(makeHeading(2, t('nav.operations')))
  }

  return makeHeadings(t, items)
}

function getOperationHeadings(t: TranslateFn, schema: Schema, entry: NormalizedOperationEntry): MarkdownHeading[] {
  const items: MarkdownHeading[] = []
  const { operation } = entry

  if (operation.security.length > 0) {
    items.push(makeHeading(2, t('security.authorizations')))
  }

  if (operation.messageIds.length > 0) {
    const messages = operation.messageIds
      .map((id) => schema.document.messages.find((message) => message.id === id))
      .filter((message): message is NonNullable<typeof message> => message !== undefined)

    items.push(makeHeading(2, t('operation.messages')), ...messages.map((message) => makeHeading(3, message.name ?? message.id)))
  }

  if (operation.bindings.length > 0) {
    items.push(
      makeHeading(2, t('operation.bindings')),
      ...operation.bindings.map((binding) => makeHeading(3, binding.protocol)),
    )
  }

  if (operation.reply) {
    items.push(makeHeading(2, t('operation.reply')))
  }

  return makeHeadings(t, items)
}

function hasSchemaNavigationItems(schema: Schema, t: TranslateFn): boolean {
  return getOperationsByTag(schema, t).size > 0
}

function hasOperationTagNavigationItems(schema: Schema, tag: OperationTag, t: TranslateFn): boolean {
  return (getOperationsByTag(schema, t).get(tag.name)?.entries.length ?? 0) > 0
}

function makeHeadings(t: TranslateFn, items: MarkdownHeading[]): MarkdownHeading[] {
  return [makeHeading(1, t('nav.overview'), '_top'), ...items]
}

function makeHeading(depth: number, text: string, customSlug?: string): MarkdownHeading {
  return { depth, slug: customSlug ?? slug(text), text }
}

type SidebarUserConfig = NonNullable<HookParameters<'config:setup'>['config']['sidebar']>

type SidebarItemConfig = SidebarUserConfig[number]
type SidebarManualGroupConfig = Extract<SidebarItemConfig, { items: SidebarItemConfig[] }>
export type StarlightAsyncAPISidebarGroup = SidebarManualGroupConfig

type SidebarItem = StarlightRouteData['sidebar'][number]
type SidebarLink = Extract<SidebarItem, { type: 'link' }>
export type SidebarGroup = Extract<SidebarItem, { type: 'group' }>

export type SidebarBadge = SidebarItem['badge']

interface StarlightPageProps {
  frontmatter: {
    title: string
  }
  headings: MarkdownHeading[]
}
