import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightAsyncAPI, { asyncAPISidebarGroups } from 'starlight-asyncapi'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Starlight AsyncAPI',
      plugins: [
        starlightAsyncAPI([
          {
            base: 'events/pubsub',
            schema: '../schemas/v3/simple-pubsub.yaml',
            sidebar: { collapsed: false, label: 'Simple Pub/Sub' },
          },
          {
            base: 'events/kafka',
            schema: '../schemas/v3/kafka-bindings.yaml',
            sidebar: { collapsed: false, label: 'Kafka Bindings' },
          },
          {
            base: 'events/mqtt',
            schema: '../schemas/v3/mqtt-qos.yaml',
            sidebar: { collapsed: false, label: 'MQTT QoS' },
          },
          {
            base: 'events/multi-server',
            schema: '../schemas/v3/multi-server.yaml',
            sidebar: { collapsed: false, label: 'Multi Server' },
          },
          {
            base: 'events/request-reply',
            schema: '../schemas/v3/request-reply.yaml',
            sidebar: { collapsed: false, label: 'Request Reply' },
          },
          {
            base: 'events/traits',
            schema: '../schemas/v3/traits-correlation.yaml',
            sidebar: { collapsed: false, label: 'Traits Correlation' },
          },
          {
            base: 'events/recursive',
            schema: '../schemas/v3/recursive-payload.yaml',
            sidebar: { collapsed: false, label: 'Recursive Payload' },
          },
          {
            base: 'events/tagged',
            schema: '../schemas/v3/tagged-operations.yaml',
            sidebar: { collapsed: false, label: 'Tagged Operations' },
          },
          {
            base: 'events/security',
            schema: '../schemas/v3/security.yaml',
            sidebar: { collapsed: false, label: 'Security' },
          },
          {
            base: 'events/reply-address',
            schema: '../schemas/v3/reply-address.yaml',
            sidebar: { collapsed: false, label: 'Reply Address' },
          },
          {
            base: 'events/reply-collision',
            schema: '../schemas/v3/reply-collision.yaml',
            sidebar: { collapsed: false, label: 'Reply Collision' },
          },
        ]),
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [{ label: 'Getting Started', link: '/' }],
        },
        {
          label: 'Schemas',
          items: asyncAPISidebarGroups,
        },
      ],
      social: [{ href: 'https://github.com/bharvold/starlight-asyncapi', icon: 'github', label: 'GitHub' }],
    }),
  ],
})
