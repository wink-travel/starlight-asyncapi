import type {
  AsyncAPIDocumentInterface,
  OAuthFlowInterface,
  OAuthFlowsInterface,
  SecurityRequirementsInterface,
  SecuritySchemeInterface,
} from '@asyncapi/parser'

/**
 * AsyncAPI 3's `securityScheme.type` enum, which extends OpenAPI-familiar `apiKey`/`http`/`oauth2`/
 * `openIdConnect` with broker-auth types (SASL variants, X.509, symmetric/asymmetric encryption).
 */
export type NormalizedSecuritySchemeType =
  | 'apiKey'
  | 'asymmetricEncryption'
  | 'gssapi'
  | 'http'
  | 'httpApiKey'
  | 'oauth2'
  | 'openIdConnect'
  | 'plain'
  | 'scramSha256'
  | 'scramSha512'
  | 'symmetricEncryption'
  | 'userPassword'
  | 'X509'

export interface NormalizedOAuthFlow {
  authorizationUrl: string | undefined
  tokenUrl: string | undefined
  refreshUrl: string | undefined
  scopes: Record<string, string>
}

export interface NormalizedOAuthFlows {
  implicit: NormalizedOAuthFlow | undefined
  password: NormalizedOAuthFlow | undefined
  clientCredentials: NormalizedOAuthFlow | undefined
  authorizationCode: NormalizedOAuthFlow | undefined
}

export interface NormalizedSecurityScheme {
  id: string
  type: string
  description: string | undefined
  name: string | undefined
  in: string | undefined
  scheme: string | undefined
  bearerFormat: string | undefined
  openIdConnectUrl: string | undefined
  flows: NormalizedOAuthFlows | undefined
}

/**
 * A single security scheme reference with its required OAuth2/OpenID Connect scopes (if any).
 * `requirementSetIndex` groups requirements that must ALL be satisfied together (an AND-set, from
 * a single entry in the raw `security` array) — different indices are alternative (OR) options.
 */
export interface NormalizedSecurityRequirement {
  schemeId: string
  scopes: string[]
  requirementSetIndex: number
}

export interface NormalizedSecuritySchemes {
  schemes: Record<string, NormalizedSecurityScheme>
  /**
   * Maps a security scheme's raw underlying JSON node (`scheme.json()`) back to its registry id.
   *
   * Necessary because `SecuritySchemeInterface.id()` is only populated when the scheme is accessed
   * from its defining location (`document.securitySchemes()`); a scheme reached through an
   * operation's or server's `security()` requirement is a fresh wrapper around the SAME underlying
   * JSON node but reports an empty `id()` (verified empirically against the installed parser
   * version). The raw JSON node identity, unlike the wrapper identity, IS stable across access
   * paths, so it is used here as the correlation key — the same technique `schemaBundle.ts` uses
   * for payload/header schema cycle-safety.
   */
  idsByNode: WeakMap<object, string>
}

export interface GroupedSecurityRequirement {
  schemeId: string
  scopes: string[]
}

/**
 * Groups a flat `NormalizedSecurityRequirement[]` (see `normalizeSecurityRequirements`) back into
 * its original OR-of-AND-groups shape for rendering: each outer array entry is an alternative
 * (OR) security option, and each inner entry is a scheme that MUST be satisfied together (AND)
 * for that option.
 *
 * NOTE: unlike OpenAPI's Security Requirement Object (a map, where an empty `{}` entry means
 * "no auth required" and a multi-key entry means "these schemes together"), AsyncAPI v3's
 * `security` array entries are always a `$ref` to exactly ONE security scheme each — there is no
 * spec-representable empty/"None" requirement, and no way to author an AND-group of multiple
 * schemes within a single array entry. Don't add OpenAPI-style empty-map ("no auth") handling
 * here later; it has no AsyncAPI v3 equivalent to represent.
 */
export function groupSecurityRequirements(
  requirements: NormalizedSecurityRequirement[],
): GroupedSecurityRequirement[][] {
  const groups = new Map<number, GroupedSecurityRequirement[]>()

  for (const requirement of requirements) {
    const group = groups.get(requirement.requirementSetIndex) ?? []
    group.push({ schemeId: requirement.schemeId, scopes: requirement.scopes })
    groups.set(requirement.requirementSetIndex, group)
  }

  return [...groups.entries()].toSorted(([a], [b]) => a - b).map(([, group]) => group)
}

export function normalizeSecuritySchemes(document: AsyncAPIDocumentInterface): NormalizedSecuritySchemes {
  const schemes: Record<string, NormalizedSecurityScheme> = {}
  const idsByNode = new WeakMap<object, string>()

  for (const scheme of document.securitySchemes().all()) {
    schemes[scheme.id()] = normalizeSecurityScheme(scheme)
    idsByNode.set(scheme.json(), scheme.id())
  }

  return { schemes, idsByNode }
}

function normalizeSecurityScheme(scheme: SecuritySchemeInterface): NormalizedSecurityScheme {
  const flows = scheme.flows()

  return {
    id: scheme.id(),
    type: scheme.type(),
    description: scheme.description(),
    name: scheme.name(),
    in: scheme.in(),
    scheme: scheme.scheme(),
    bearerFormat: scheme.bearerFormat(),
    openIdConnectUrl: scheme.openIdConnectUrl(),
    flows: flows ? normalizeOAuthFlows(flows) : undefined,
  }
}

function normalizeOAuthFlows(flows: OAuthFlowsInterface): NormalizedOAuthFlows {
  const implicit = flows.implicit()
  const password = flows.password()
  const clientCredentials = flows.clientCredentials()
  const authorizationCode = flows.authorizationCode()

  return {
    implicit: implicit ? normalizeOAuthFlow(implicit) : undefined,
    password: password ? normalizeOAuthFlow(password) : undefined,
    clientCredentials: clientCredentials ? normalizeOAuthFlow(clientCredentials) : undefined,
    authorizationCode: authorizationCode ? normalizeOAuthFlow(authorizationCode) : undefined,
  }
}

function normalizeOAuthFlow(flow: OAuthFlowInterface): NormalizedOAuthFlow {
  return {
    authorizationUrl: flow.authorizationUrl(),
    tokenUrl: flow.tokenUrl(),
    refreshUrl: flow.refreshUrl(),
    scopes: flow.scopes() ?? {},
  }
}

/**
 * Normalizes an operation's or server's `security()` result — an array of AND-grouped requirement
 * sets — into a flat list of `{ schemeId, scopes, requirementSetIndex }` entries.
 */
export function normalizeSecurityRequirements(
  requirementSets: SecurityRequirementsInterface[],
  idsByNode: WeakMap<object, string>,
): NormalizedSecurityRequirement[] {
  const requirements: NormalizedSecurityRequirement[] = []

  for (const [requirementSetIndex, requirementSet] of requirementSets.entries()) {
    for (const requirement of requirementSet) {
      const scheme = requirement.scheme()

      requirements.push({
        schemeId: idsByNode.get(scheme.json()) ?? scheme.id(),
        scopes: requirement.scopes(),
        requirementSetIndex,
      })
    }
  }

  return requirements
}
