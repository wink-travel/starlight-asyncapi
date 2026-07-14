import type { ServerInterface } from '@asyncapi/parser'

import { getBindings, type NormalizedBindingGroup } from './binding'
import type { NormalizedAsyncAPIDocument } from './normalize'
import { normalizeSecurityRequirements, type NormalizedSecurityRequirement } from './security'

export interface NormalizedServerVariable {
  default: string | undefined
  enum: string[] | undefined
  description: string | undefined
}

export interface NormalizedServer {
  id: string
  host: string
  protocol: string
  protocolVersion: string | undefined
  pathname: string | undefined
  // Added in Phase 4 (rendering), see the matching note on `NormalizedOperation.externalDocs` in
  // `normalize.ts` — the parser's `ServerInterface` also carries a plain `description` (via
  // `DescriptionMixinInterface`) that Phase 2's field list omitted.
  description: string | undefined
  variables: Record<string, NormalizedServerVariable>
  bindings: NormalizedBindingGroup[]
  security: NormalizedSecurityRequirement[]
}

export function normalizeServer(
  server: ServerInterface,
  securitySchemeIdsByNode: WeakMap<object, string>,
): NormalizedServer {
  return {
    id: server.id(),
    host: server.host(),
    protocol: server.protocol(),
    protocolVersion: server.protocolVersion(),
    pathname: server.pathname(),
    description: server.description(),
    variables: normalizeServerVariables(server),
    bindings: getBindings(server.bindings()),
    security: normalizeSecurityRequirements(server.security(), securitySchemeIdsByNode),
  }
}

/** Resolves channel-referenced server ids (e.g. `channel.serverIds`) to their `NormalizedServer`s. */
export function getServers(document: Pick<NormalizedAsyncAPIDocument, 'servers'>, ids: string[]): NormalizedServer[] {
  return ids
    .map((id) => document.servers.find((server) => server.id === id))
    .filter((server): server is NormalizedServer => server !== undefined)
}

function normalizeServerVariables(server: ServerInterface): Record<string, NormalizedServerVariable> {
  const variables: Record<string, NormalizedServerVariable> = {}

  for (const variable of server.variables().all()) {
    const allowedValues = variable.allowedValues()

    variables[variable.id()] = {
      default: variable.defaultValue(),
      enum: allowedValues.length > 0 ? allowedValues : undefined,
      description: variable.description(),
    }
  }

  return variables
}
