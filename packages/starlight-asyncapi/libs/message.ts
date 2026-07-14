import type { MessageExampleInterface, MessageInterface } from '@asyncapi/parser'

import { getBindings, type NormalizedBindingGroup } from './binding'
import type { NormalizedAsyncAPIDocument } from './normalize'
import { bundleOptionalSchema, type JsonSchemaWithRefs, type SchemaRegistry, type VisitedSchemas } from './schemaBundle'

export interface NormalizedCorrelationId {
  location: string
  description: string | undefined
}

export interface NormalizedMessageExample {
  name: string | undefined
  summary: string | undefined
  payload: unknown
  headers: unknown
}

export interface NormalizedMessageExternalDocs {
  url: string
  description: string | undefined
}

export interface NormalizedMessage {
  id: string
  name: string | undefined
  title: string | undefined
  summary: string | undefined
  description: string | undefined
  contentType: string | undefined
  payloadSchemaRef: string | undefined
  headersSchemaRef: string | undefined
  correlationId: NormalizedCorrelationId | undefined
  bindings: NormalizedBindingGroup[]
  examples: NormalizedMessageExample[]
  // Added in Phase 4 (rendering), see the matching note on `NormalizedOperation.externalDocs` in
  // `normalize.ts` — the parser's `MessageTraitInterface` also carries `externalDocs`.
  externalDocs: NormalizedMessageExternalDocs | undefined
}

export function normalizeMessage(
  message: MessageInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): NormalizedMessage {
  const correlationId = message.correlationId()
  const externalDocs = message.externalDocs()

  return {
    id: message.id(),
    name: message.name(),
    title: message.title(),
    summary: message.summary(),
    description: message.description(),
    contentType: message.contentType(),
    payloadSchemaRef: extractRef(bundleOptionalSchema(message.payload(), registry, visited)),
    headersSchemaRef: extractRef(bundleOptionalSchema(message.headers(), registry, visited)),
    correlationId: correlationId
      ? { location: correlationId.location() ?? '', description: correlationId.description() }
      : undefined,
    bindings: getBindings(message.bindings()),
    examples: message.examples().all().map(normalizeMessageExample),
    externalDocs: externalDocs ? { url: externalDocs.url(), description: externalDocs.description() } : undefined,
  }
}

/** Resolves message ids (e.g. `operation.messageIds`) to their `NormalizedMessage`, in order. */
export function getMessages(document: Pick<NormalizedAsyncAPIDocument, 'messages'>, ids: string[]): NormalizedMessage[] {
  return ids
    .map((id) => document.messages.find((message) => message.id === id))
    .filter((message): message is NormalizedMessage => message !== undefined)
}

function extractRef(schema: JsonSchemaWithRefs | undefined): string | undefined {
  return schema && typeof schema === 'object' && '$ref' in schema ? schema.$ref : undefined
}

function normalizeMessageExample(example: MessageExampleInterface): NormalizedMessageExample {
  return {
    name: example.name(),
    summary: example.summary(),
    payload: example.payload(),
    headers: example.headers(),
  }
}
