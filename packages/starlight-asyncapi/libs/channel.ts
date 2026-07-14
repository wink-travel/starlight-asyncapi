import type { ChannelInterface } from '@asyncapi/parser'

import { getBindings, type NormalizedBindingGroup } from './binding'
import type { NormalizedAsyncAPIDocument } from './normalize'
import { bundleOptionalSchema, type SchemaRegistry, type VisitedSchemas } from './schemaBundle'

export interface NormalizedChannelParameter {
  description: string | undefined
  schemaRef: string | undefined
}

export interface NormalizedChannel {
  id: string
  // Note: unlike `NormalizedMessage`, the AsyncAPI v3 Channel Object has no `title`/`summary`
  // fields of its own (only `description`) — omitted here rather than always being `undefined`.
  address: string | undefined
  description: string | undefined
  parameters: Record<string, NormalizedChannelParameter>
  messageIds: string[]
  serverIds: string[]
  bindings: NormalizedBindingGroup[]
}

export function normalizeChannel(
  channel: ChannelInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): NormalizedChannel {
  return {
    id: channel.id(),
    address: channel.address() ?? undefined,
    description: channel.description(),
    parameters: normalizeChannelParameters(channel, registry, visited),
    messageIds: channel
      .messages()
      .all()
      .map((message) => message.id()),
    serverIds: channel
      .servers()
      .all()
      .map((server) => server.id()),
    bindings: getBindings(channel.bindings()),
  }
}

/** Resolves a channel id (e.g. `operation.channelId`) to its `NormalizedChannel`. */
export function findChannel(
  document: Pick<NormalizedAsyncAPIDocument, 'channels'>,
  id: string | undefined,
): NormalizedChannel | undefined {
  return id === undefined ? undefined : document.channels.find((channel) => channel.id === id)
}

function normalizeChannelParameters(
  channel: ChannelInterface,
  registry: SchemaRegistry,
  visited: VisitedSchemas,
): Record<string, NormalizedChannelParameter> {
  const parameters: Record<string, NormalizedChannelParameter> = {}

  for (const parameter of channel.parameters().all()) {
    const schema = parameter.schema()
    const schemaRef = schema ? bundleOptionalSchema(schema, registry, visited) : undefined

    parameters[parameter.id()] = {
      description: parameter.description(),
      schemaRef: schemaRef && typeof schemaRef === 'object' && '$ref' in schemaRef ? schemaRef.$ref : undefined,
    }
  }

  return parameters
}
