import { Parser } from '@asyncapi/parser'
import { expect, test } from '@playwright/test'

import { normalizeDocument } from '../libs/normalize'

/**
 * No `schemas/v3/` fixture is dedicated to security (the plan's fixture list covers pub/sub,
 * bindings, request/reply, traits/correlation, recursion, and multi-server), so this parses a
 * small inline AsyncAPI document directly through the real `Parser` + `normalizeDocument()` —
 * still real production code, not a mock, just without a file on disk.
 */
// See `libs/parser.ts` for why this compares against the raw numeric value instead of the
// `DiagnosticSeverity` enum (a `@stoplight/types` version mismatch across the dependency tree).
const diagnosticSeverityError = 0

async function normalizeInlineSchema(source: string) {
  const parser = new Parser()
  const { document, diagnostics } = await parser.parse(source)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- see `libs/parser.ts`'s `diagnosticSeverity`
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === diagnosticSeverityError)

  if (!document) throw new Error(`Failed to parse inline test schema: ${JSON.stringify(errors)}`)

  return normalizeDocument(document)
}

const securitySource = `
asyncapi: 3.0.0
info:
  title: Security Test
  version: 1.0.0
servers:
  kafka:
    host: kafka.example.com:9092
    protocol: kafka
    security:
      - $ref: '#/components/securitySchemes/apiKey'
channels:
  foo:
    address: foo
    messages:
      fooMsg:
        payload:
          type: object
operations:
  sendFoo:
    action: send
    channel:
      $ref: '#/channels/foo'
    security:
      - $ref: '#/components/securitySchemes/apiKey'
      - $ref: '#/components/securitySchemes/oauth'
components:
  securitySchemes:
    apiKey:
      type: httpApiKey
      name: X-Api-Key
      in: header
    oauth:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: https://example.com/token
          availableScopes:
            read: Read access
            write: Write access
`

test('normalizes broker-auth alongside OpenAPI-familiar security scheme types', async () => {
  const document = await normalizeInlineSchema(securitySource)

  expect(document.components.securitySchemes['apiKey']?.type).toBe('httpApiKey')
  expect(document.components.securitySchemes['apiKey']?.name).toBe('X-Api-Key')
  expect(document.components.securitySchemes['apiKey']?.in).toBe('header')

  expect(document.components.securitySchemes['oauth']?.type).toBe('oauth2')
  expect(document.components.securitySchemes['oauth']?.flows?.clientCredentials?.tokenUrl).toBe(
    'https://example.com/token',
  )
  expect(document.components.securitySchemes['oauth']?.flows?.clientCredentials?.scopes).toEqual({
    read: 'Read access',
    write: 'Write access',
  })
})

test('resolves operation-level security requirements back to their scheme id', async () => {
  const document = await normalizeInlineSchema(securitySource)
  const operation = document.operations.find((entry) => entry.id === 'sendFoo')

  expect(operation?.security).toEqual([
    { schemeId: 'apiKey', scopes: [], requirementSetIndex: 0 },
    { schemeId: 'oauth', scopes: [], requirementSetIndex: 1 },
  ])
})

test('resolves server-level security requirements back to their scheme id', async () => {
  const document = await normalizeInlineSchema(securitySource)
  const server = document.servers.find((entry) => entry.id === 'kafka')

  expect(server?.security).toEqual([{ schemeId: 'apiKey', scopes: [], requirementSetIndex: 0 }])
})
