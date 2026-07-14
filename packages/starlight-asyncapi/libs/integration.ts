import type { StarlightUserConfig } from '@astrojs/starlight/types'
import type { AstroIntegration } from 'astro'

import { getSchemaBasePath, stripLeadingAndTrailingSlashes } from './path'
import type { Schema } from './schemas/schema'
import { vitePluginStarlightAsyncAPI } from './vite'

export function starlightAsyncAPIIntegration(
  starlightConfig: Pick<StarlightUserConfig, 'pagination' | 'prerender'>,
  schemas: Schema[],
): AstroIntegration {
  const starlightAsyncAPI: AstroIntegration = {
    name: 'starlight-asyncapi',
    hooks: {
      'astro:config:setup': ({ config, injectRoute, updateConfig }) => {
        const prerender = starlightConfig.prerender ?? true

        if (prerender) {
          injectRoute({
            entrypoint: 'starlight-asyncapi/routes/static',
            pattern: `[...asyncAPISlug]`,
            prerender: true,
          })
        } else {
          for (const schema of schemas) {
            injectRoute({
              entrypoint: 'starlight-asyncapi/routes/ssr',
              pattern: `${stripLeadingAndTrailingSlashes(getSchemaBasePath(schema.config))}/[...asyncAPISlug]`,
              prerender: false,
            })
          }
        }

        updateConfig({
          vite: {
            plugins: [
              vitePluginStarlightAsyncAPI(schemas, {
                pagination: starlightConfig.pagination ?? true,
                trailingSlash: config.trailingSlash,
                build: { format: config.build.format },
              }),
            ],
          },
        })
      },
    },
  }

  return starlightAsyncAPI
}
