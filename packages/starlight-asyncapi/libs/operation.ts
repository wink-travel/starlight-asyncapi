import type { NormalizedAsyncAPIDocument, NormalizedOperation, NormalizedTag } from './normalize'
import { slug } from './path'
import type { Schema } from './schemas/schema'

/**
 * Threaded into libs that build display text, per the no-hardcoded-user-facing-strings rule — the
 * host app resolves `key` (optionally interpolating `params`) through Starlight's translation
 * layer. `operation.ts` is the only Phase 2 lib that originates a user-facing string (the default
 * tag group name for untagged operations), so it is the only one that needs this.
 */
export type TranslateFn = (key: string, params?: Record<string, unknown>) => string

export type OperationTag = NormalizedTag

export interface NormalizedOperationEntry {
  operation: NormalizedOperation
  action: 'send' | 'receive'
  protocols: string[]
  channelId: string
  slug: string
  title: string
  sidebar: {
    label: string
  }
}

export function getOperationsByTag(
  schema: Schema,
  t: TranslateFn,
): Map<string, { tag: OperationTag; entries: NormalizedOperationEntry[] }> {
  const { config, document } = schema
  const operationsByTag = new Map<string, { tag: OperationTag; entries: NormalizedOperationEntry[] }>()
  const defaultTag: OperationTag = { name: t('operation.defaultTagGroup'), description: undefined }

  const operationIds = document.operations.map((operation) => operation.id)
  // Reserves a globally-unique route slug per operation as we iterate. `document.operations` is
  // iterated in the same order here and in every caller (`route.ts` route generation and
  // `navigation.ts` sidebar building), so the reserved slugs are identical across all of them.
  const usedSlugs = new Set<string>()

  for (const operation of document.operations) {
    const entry = buildOperationEntry(document, operation, operationIds, usedSlugs, config.sidebar.operations.labels)
    const tags = operation.tags.length > 0 ? operation.tags : [defaultTag]

    for (const tag of tags) {
      const group = operationsByTag.get(tag.name) ?? { tag, entries: [] }
      group.entries.push(entry)
      operationsByTag.set(tag.name, group)
    }
  }

  return operationsByTag
}

function buildOperationEntry(
  document: NormalizedAsyncAPIDocument,
  operation: NormalizedOperation,
  operationIds: string[],
  usedSlugs: Set<string>,
  labels: 'operationId' | 'channel' | 'summary',
): NormalizedOperationEntry {
  const isDuplicateId = operationIds.filter((id) => id === operation.id).length > 1
  const channel = document.channels.find((candidate) => candidate.id === operation.channelId)

  const title =
    operation.summary ?? (isDuplicateId ? `${operation.id} (${operation.action.toUpperCase()})` : operation.id)

  return {
    operation,
    action: operation.action,
    protocols: getOperationProtocols(document, operation.channelId),
    channelId: operation.channelId,
    slug: reserveOperationSlug(usedSlugs, slug(operation.id), slug(operation.action)),
    title,
    sidebar: { label: getOperationSidebarLabel(operation, channel?.address, labels, title) },
  }
}

/**
 * Reserves a globally-unique `operations/<id>` route slug. Distinct operation ids can slugify to
 * the same value (e.g. `Ping` and `ping`, both valid, case-sensitive AsyncAPI operation keys), which
 * would otherwise collide in `route.ts`'s `routesBySlug` map and silently shadow one page — the
 * stateless `slug()` re-export does not dedupe. Disambiguates with the operation action first (for a
 * readable URL), then a numeric suffix if that still collides.
 */
function reserveOperationSlug(usedSlugs: Set<string>, operationIdSlug: string, actionSlug: string): string {
  const base = `operations/${operationIdSlug}`

  if (!usedSlugs.has(base)) {
    usedSlugs.add(base)
    return base
  }

  const withAction = `${base}/${actionSlug}`
  let candidate = withAction
  let suffix = 2

  while (usedSlugs.has(candidate)) {
    candidate = `${withAction}-${suffix}`
    suffix += 1
  }

  usedSlugs.add(candidate)

  return candidate
}

function getOperationSidebarLabel(
  operation: NormalizedOperation,
  channelAddress: string | undefined,
  labels: 'operationId' | 'channel' | 'summary',
  title: string,
): string {
  if (labels === 'channel' && channelAddress) return channelAddress
  if (labels === 'summary' && operation.summary) return title
  return operation.id
}

function getOperationProtocols(document: NormalizedAsyncAPIDocument, channelId: string): string[] {
  const channel = document.channels.find((candidate) => candidate.id === channelId)
  if (!channel) return []

  const protocols = channel.serverIds
    .map((serverId) => document.servers.find((server) => server.id === serverId)?.protocol)
    .filter((protocol): protocol is string => protocol !== undefined)

  return [...new Set(protocols)]
}

/**
 * Mirrors the reference OpenAPI plugin's `isMinimalOperationTag`: a tag with no `description` is
 * considered "minimal" and does not warrant its own `operation-tag-overview` page (there would be
 * nothing to show beyond the operation list, which already appears inline in the sidebar group).
 * The synthesized default/fallback tag (see `getOperationsByTag`) always has `description:
 * undefined`, so it is always minimal — untagged operations never get a tag overview page.
 */
export function isMinimalOperationTag(tag: OperationTag): boolean {
  return tag.description === undefined || tag.description.length === 0
}
