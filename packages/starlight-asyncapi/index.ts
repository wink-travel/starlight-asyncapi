import { randomBytes } from 'node:crypto'

import type { StarlightPlugin } from '@astrojs/starlight/types'

import { starlightAsyncAPIIntegration } from './libs/integration'
import { parseSchema } from './libs/parser'
import { validateConfig, type StarlightAsyncAPIUserConfig } from './libs/schemas/config'
import { getSidebarGroupPlaceholder, getSidebarGroupsPlaceholder } from './libs/starlight'
import enTranslations from './translations/en.json'

export const asyncAPISidebarGroups = getSidebarGroupsPlaceholder()

export default function starlightAsyncAPIPlugin(userConfig: StarlightAsyncAPIUserConfig): StarlightPlugin {
  return {
    name: 'starlight-asyncapi-plugin',
    hooks: {
      // Not `async` — `injectTranslations` is synchronous, and the hook only requires *returning*
      // a promise (see the Starlight plugin schema), not awaiting anything internally.
      'i18n:setup': ({ injectTranslations }) => {
        injectTranslations({ en: enTranslations })
        return Promise.resolve()
      },
      'config:setup': async ({
        addIntegration,
        addRouteMiddleware,
        astroConfig,
        command,
        config: starlightConfig,
        logger,
        updateConfig,
      }) => {
        if (command !== 'build' && command !== 'dev') {
          return
        }

        const config = validateConfig(userConfig)
        const schemas = await Promise.all(
          config.map((schemaConfig) => parseSchema(logger, astroConfig.root, schemaConfig)),
        )

        addRouteMiddleware({ entrypoint: 'starlight-asyncapi/middleware', order: 'post' })
        addIntegration(starlightAsyncAPIIntegration(starlightConfig, schemas))

        const updatedConfig: Parameters<typeof updateConfig>[0] = {
          customCss: [...(starlightConfig.customCss ?? []), 'starlight-asyncapi/styles'],
        }

        if (updatedConfig.expressiveCode !== false) {
          updatedConfig.expressiveCode =
            updatedConfig.expressiveCode === true || updatedConfig.expressiveCode === undefined
              ? {}
              : updatedConfig.expressiveCode
          updatedConfig.expressiveCode.removeUnusedThemes = false
        }

        updateConfig(updatedConfig)
      },
    },
  }
}

export function createAsyncAPISidebarGroup() {
  return getSidebarGroupPlaceholder(Symbol(randomBytes(24).toString('base64url')))
}
