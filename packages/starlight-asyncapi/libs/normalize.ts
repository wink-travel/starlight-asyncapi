import type { AsyncAPIDocumentInterface, OperationInterface } from '@asyncapi/parser'

import { getBindings, type NormalizedBindingGroup } from './binding'
import { normalizeChannel, type NormalizedChannel } from './channel'
import { normalizeMessage, type NormalizedMessage } from './message'
import type { SchemaRegistry, VisitedSchemas } from './schemaBundle'
import {
  normalizeSecurityRequirements,
  normalizeSecuritySchemes,
  type NormalizedSecurityRequirement,
  type NormalizedSecurityScheme,
} from './security'
import { normalizeServer, type NormalizedServer } from './server'

/**
 * A plain-JSON, `JSON.stringify`-safe, v3-shaped representation of an AsyncAPI document. This is
 * the ONLY document shape that ever leaves `parseSchema()` — no `@asyncapi/parser` model instance
 * (which is not JSON-serializable, and can contain genuine object-graph cycles for recursive
 * payload schemas) escapes past this module. See `schemaBundle.ts` for the cycle-safe payload
 * re-bundling that makes this possible.
 */
export interface NormalizedAsyncAPIDocument {
  info: NormalizedInfo
  defaultContentType: string | undefined
  servers: NormalizedServer[]
  channels: NormalizedChannel[]
  operations: NormalizedOperation[]
  messages: NormalizedMessage[]
  schemas: SchemaRegistry
  components: {
    securitySchemes: Record<string, NormalizedSecurityScheme>
  }
}

export interface NormalizedInfo {
  title: string
  version: string
  description: string | undefined
  termsOfService: string | undefined
  contact: NormalizedContact | undefined
  license: NormalizedLicense | undefined
  tags: NormalizedTag[] | undefined
  externalDocs: NormalizedExternalDocs | undefined
}

export interface NormalizedContact {
  name: string | undefined
  url: string | undefined
  email: string | undefined
}

export interface NormalizedLicense {
  name: string
  url: string | undefined
}

export interface NormalizedTag {
  name: string
  description: string | undefined
}

export interface NormalizedExternalDocs {
  url: string
  description: string | undefined
}

/**
 * The AsyncAPI v3 Operation Reply Address Object: `location` is a runtime expression (e.g.
 * `$message.header#/replyTo`) pointing at where the reply destination is carried, used when a
 * reply has no `channel` of its own. Shape mirrors `NormalizedCorrelationId` in `message.ts`.
 */
export interface NormalizedOperationReplyAddress {
  location: string
  description: string | undefined
}

export interface NormalizedOperationReply {
  channelId: string | undefined
  messageIds: string[]
  address: NormalizedOperationReplyAddress | undefined
}

export interface NormalizedOperation {
  id: string
  action: 'send' | 'receive'
  channelId: string
  // Note: unlike `NormalizedChannel`/`NormalizedMessage`, the AsyncAPI v3 Operation Object has no
  // `title` field of its own (only `summary`/`description`) — omitted here rather than always
  // being `undefined`, a deliberate deviation from the plan's literal field list.
  summary: string | undefined
  description: string | undefined
  tags: NormalizedTag[]
  messageIds: string[]
  reply: NormalizedOperationReply | undefined
  bindings: NormalizedBindingGroup[]
  security: NormalizedSecurityRequirement[]
  // Added in Phase 4 (rendering): the AsyncAPI v3 Operation Object carries `externalDocs` via the
  // parser's `ExternalDocumentationMixinInterface` (see `operation-trait.d.ts`) even though it was
  // not enumerated in the original Phase 2 field list — `Operation.astro` needs it to render the
  // plan's "external docs" surface. Purely additive (optional-shaped), so it does not affect any
  // existing exact-equality assertions in the Phase 2/3 test suite.
  externalDocs: NormalizedExternalDocs | undefined
}

export function normalizeDocument(document: AsyncAPIDocumentInterface): NormalizedAsyncAPIDocument {
  const schemas: SchemaRegistry = {}
  const visited: VisitedSchemas = new WeakMap()
  const { schemes, idsByNode } = normalizeSecuritySchemes(document)

  const channels = document
    .allChannels()
    .all()
    .map((channel) => normalizeChannel(channel, schemas, visited))
  const messages = document
    .allMessages()
    .all()
    .map((message) => normalizeMessage(message, schemas, visited))
  const servers = document
    .allServers()
    .all()
    .map((server) => normalizeServer(server, idsByNode))
  const operations = document
    .allOperations()
    .all()
    .map((operation) => normalizeOperation(operation, idsByNode))

  return {
    info: normalizeInfo(document),
    defaultContentType: document.defaultContentType(),
    servers,
    channels,
    operations,
    messages,
    schemas,
    components: { securitySchemes: schemes },
  }
}

function normalizeInfo(document: AsyncAPIDocumentInterface): NormalizedInfo {
  const info = document.info()
  const contact = info.contact()
  const license = info.license()
  const externalDocs = info.externalDocs()
  const tags = info.tags().all()

  return {
    title: info.title(),
    version: info.version(),
    description: info.description(),
    termsOfService: info.termsOfService(),
    contact: contact ? { name: contact.name(), url: contact.url(), email: contact.email() } : undefined,
    license: license ? { name: license.name(), url: license.url() } : undefined,
    tags: tags.length > 0 ? tags.map((tag) => ({ name: tag.name(), description: tag.description() })) : undefined,
    externalDocs: externalDocs ? { url: externalDocs.url(), description: externalDocs.description() } : undefined,
  }
}

function normalizeOperation(
  operation: OperationInterface,
  securitySchemeIdsByNode: WeakMap<object, string>,
): NormalizedOperation {
  const channel = operation.channels().all()[0]
  const tags = operation.tags().all()

  const externalDocs = operation.externalDocs()

  return {
    id: operation.id() ?? operation.operationId() ?? '',
    action: operation.isSend() ? 'send' : 'receive',
    channelId: channel?.id() ?? '',
    summary: operation.summary(),
    description: operation.description(),
    tags: tags.map((tag) => ({ name: tag.name(), description: tag.description() })),
    messageIds: operation
      .messages()
      .all()
      .map((message) => message.id()),
    reply: normalizeOperationReply(operation),
    bindings: getBindings(operation.bindings()),
    security: normalizeSecurityRequirements(operation.security(), securitySchemeIdsByNode),
    externalDocs: externalDocs ? { url: externalDocs.url(), description: externalDocs.description() } : undefined,
  }
}

function normalizeOperationReply(operation: OperationInterface): NormalizedOperationReply | undefined {
  const reply = operation.reply()
  if (!reply) return undefined

  const address = reply.hasAddress() ? reply.address() : undefined

  return {
    channelId: reply.channel()?.id(),
    messageIds: reply
      .messages()
      .all()
      .map((message) => message.id()),
    address: address ? { location: address.location(), description: address.description() } : undefined,
  }
}
