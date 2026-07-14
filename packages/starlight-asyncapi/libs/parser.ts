import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { Parser, type Diagnostic } from '@asyncapi/parser'
import type { AstroConfig, AstroIntegrationLogger } from 'astro'
import { AstroError } from 'astro/errors'

import { normalizeDocument } from './normalize'
import type { Schema, StarlightAsyncAPISchemaConfig } from './schemas/schema'

const parser = new Parser()

const issuesUrl = 'https://github.com/bharvold/starlight-asyncapi/issues/new/choose'

/**
 * `@stoplight/spectral-core`'s `ISpectralDiagnostic.severity` (what `Diagnostic` resolves to) and
 * `@asyncapi/parser`'s re-exported `DiagnosticSeverity` enum are typed against two different
 * `@stoplight/types` package instances in this dependency tree (three separate versions are
 * present, see the resolved lockfile), so TypeScript treats them as structurally distinct enum
 * types. Every comparison below is against the documented numeric values (`DiagnosticSeverity.
 * Error = 0`, `.Warning = 1`) with a targeted lint disable, rather than importing the (real, but
 * version-mismatched) enum.
 */
const diagnosticSeverity = { error: 0, warning: 1 } as const

/**
 * Parses and validates an AsyncAPI schema, returning a `Schema` whose `document` is ALWAYS the
 * normalized, plain-JSON, `JSON.stringify`-safe shape produced by `normalizeDocument()` — no raw
 * `@asyncapi/parser` model instance (not JSON-serializable, and potentially containing genuine
 * object-graph cycles) ever escapes this function.
 */
export async function parseSchema(
  logger: AstroIntegrationLogger,
  root: AstroConfig['root'],
  config: StarlightAsyncAPISchemaConfig,
): Promise<Schema> {
  const schemaLocation = getSchemaLocation(root, config.schema)

  try {
    logger.info(`Parsing AsyncAPI schema at '${config.schema}'.`)

    const source = await readSchemaSource(schemaLocation)
    const { document, diagnostics } = await parser.parse(source, { source: schemaLocation })

    logDiagnostics(logger, diagnostics)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- see `diagnosticSeverity` above
    const errorDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === diagnosticSeverity.error)

    if (!document || errorDiagnostics.length > 0) {
      throw new AstroError(formatDiagnosticsMessage(config.schema, errorDiagnostics), getIssueMessage())
    }

    return { config, document: normalizeDocument(document) }
  } catch (error) {
    if (error instanceof AstroError) throw error

    const message = error instanceof Error ? error.message : String(error)
    logger.error(message)

    throw new AstroError(`Failed to parse the AsyncAPI schema at '${config.schema}': ${message}`, getIssueMessage())
  }
}

function getSchemaLocation(root: AstroConfig['root'], schemaPath: string): string {
  if (isSchemaUrl(schemaPath)) return schemaPath

  return pathToFileURL(path.isAbsolute(schemaPath) ? schemaPath : path.resolve(fileURLToPath(root), schemaPath)).href
}

function isSchemaUrl(schemaPath: string): boolean {
  try {
    const url = new URL(schemaPath)
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'file:'
  } catch {
    return false
  }
}

/**
 * Unlike `@readme/openapi-parser`'s `bundle(path)`, `@asyncapi/parser`'s `Parser#parse()` only
 * accepts raw schema content (a string, a parsed object, or an already-parsed
 * `AsyncAPIDocumentInterface`) — not a file path or URL. We read the file/URL ourselves and hand
 * the raw text to the parser.
 */
async function readSchemaSource(schemaLocation: string): Promise<string> {
  const url = new URL(schemaLocation)

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch the AsyncAPI schema at '${schemaLocation}': ${response.status} ${response.statusText}`,
      )
    }

    return await response.text()
  }

  return readFile(fileURLToPath(url), 'utf8')
}

function logDiagnostics(logger: AstroIntegrationLogger, diagnostics: Diagnostic[]): void {
  for (const diagnostic of diagnostics) {
    const message = formatDiagnosticMessage(diagnostic)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- see `diagnosticSeverity` above
    if (diagnostic.severity === diagnosticSeverity.error) logger.error(message)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- see `diagnosticSeverity` above
    else if (diagnostic.severity === diagnosticSeverity.warning) logger.warn(message)
    else logger.info(message)
  }
}

function formatDiagnosticMessage(diagnostic: Diagnostic): string {
  const location = diagnostic.path.length > 0 ? diagnostic.path.join('.') : undefined
  return location ? `${diagnostic.message} (${location})` : diagnostic.message
}

function formatDiagnosticsMessage(schemaPath: string, errorDiagnostics: Diagnostic[]): string {
  const details = errorDiagnostics.map((diagnostic) => `- ${formatDiagnosticMessage(diagnostic)}`).join('\n')

  return `Invalid AsyncAPI schema at '${schemaPath}':\n\n${details}\n`
}

function getIssueMessage(): string {
  return `See the error report above for more informations.\n\nIf you believe this is a bug, please file an issue at ${issuesUrl}`
}
