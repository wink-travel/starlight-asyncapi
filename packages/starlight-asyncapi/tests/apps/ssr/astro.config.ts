import node from '@astrojs/node'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightAsyncAPI, { asyncAPISidebarGroups } from 'starlight-asyncapi'

export default defineConfig({
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    starlight({
      plugins: [
        starlightAsyncAPI([
          {
            base: 'tests/pubsub',
            schema: '../../../../../schemas/v3/simple-pubsub.yaml',
            sidebar: { collapsed: false, label: 'Simple Pub/Sub' },
          },
          {
            base: 'tests/tagged',
            schema: '../../../../../schemas/v3/tagged-operations.yaml',
            sidebar: { collapsed: false, label: 'Tagged Operations' },
          },
        ]),
      ],
      prerender: false,
      sidebar: [
        {
          label: 'Starlight',
          items: [{ label: 'Example', link: 'guides/example' }],
        },
        ...asyncAPISidebarGroups,
      ],
      title: 'Starlight AsyncAPI Tests - SSR',
    }),
  ],
  output: 'server',
})
