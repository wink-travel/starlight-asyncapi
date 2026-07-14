import type { AstroConfig, ViteUserConfig } from 'astro'

import type { Schema } from './schemas/schema'

export function vitePluginStarlightAsyncAPI(schemas: Schema[], context: StarlightAsyncAPIContext): VitePlugin {
  const modules = {
    'virtual:starlight-asyncapi/schemas': `export default ${JSON.stringify(
      Object.fromEntries(schemas.map((schema) => [schema.config.base, schema])),
    )}`,
    'virtual:starlight-asyncapi/context': `export default ${JSON.stringify(context)}`,
  }

  const moduleResolutionMap = Object.fromEntries(
    (Object.keys(modules) as (keyof typeof modules)[]).map((key) => [resolveVirtualModuleId(key), key]),
  )

  return {
    name: 'vite-plugin-starlight-asyncapi',
    load(id) {
      const moduleId = moduleResolutionMap[id]
      return moduleId ? modules[moduleId] : undefined
    },
    resolveId(id) {
      return id in modules ? resolveVirtualModuleId(id) : undefined
    },
  }
}

function resolveVirtualModuleId<TModuleId extends string>(id: TModuleId): `\0${TModuleId}` {
  return `\0${id}`
}

export interface StarlightAsyncAPIContext {
  pagination: boolean
  trailingSlash: AstroConfig['trailingSlash']
  build: {
    format: AstroConfig['build']['format']
  }
}

type VitePlugin = NonNullable<ViteUserConfig['plugins']>[number]
