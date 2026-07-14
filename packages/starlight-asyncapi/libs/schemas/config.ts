import { AstroError } from 'astro/errors'
import { z } from 'astro/zod'

import { SchemaConfigSchema } from './schema'

const configSchema = z.array(SchemaConfigSchema).min(1)

export function validateConfig(userConfig: unknown): StarlightAsyncAPIConfig {
  const config = configSchema.safeParse(userConfig)

  if (!config.success) {
    throw new AstroError(
      `Invalid starlight-asyncapi configuration:

${z.prettifyError(config.error)}
`,
      `See the error report above for more informations.\n\nIf you believe this is a bug, please file an issue at https://github.com/bharvold/starlight-asyncapi/issues/new/choose`,
    )
  }

  return config.data
}

export type StarlightAsyncAPIUserConfig = z.input<typeof configSchema>
export type StarlightAsyncAPIConfig = z.output<typeof configSchema>
