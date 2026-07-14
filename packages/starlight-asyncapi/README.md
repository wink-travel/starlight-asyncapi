<div align="center">
  <h1>starlight-asyncapi 🧭</h1>
  <p>Starlight plugin to generate documentation from AsyncAPI specifications.</p>
</div>

## Getting Started

`starlight-asyncapi` is the AsyncAPI analog of [`starlight-openapi`](https://github.com/HiDeoo/starlight-openapi):
give it one or more [AsyncAPI 3.x](https://www.asyncapi.com/docs/reference/specification/v3.0.0) documents and it
generates a full set of documentation pages — channels, operations, messages, servers, and security schemes — inside
your [Starlight](https://starlight.astro.build) site.

## Features

- Renders a schema overview page from the AsyncAPI document `info`, `servers`, and security schemes.
- Renders channels, including their address and address parameters.
- Renders operations (`send`/`receive`), grouped and sorted per the sidebar configuration, with support for tags.
- Renders messages, including their payload, headers, and correlation ID.
- Renders protocol bindings (Kafka, MQTT, AMQP, WebSockets, and more) attached to channels, operations, and messages.
- Renders request/reply operations, whether the reply targets a channel or an address.
- Renders servers and security schemes (API key, HTTP, OAuth2, OpenID Connect, and more).
- Support for local and remote schemas.
- Configurable sidebar label, sidebar group collapsing, and operation/tag sorting.

## Supported AsyncAPI versions

Only [AsyncAPI 3.x](https://www.asyncapi.com/docs/reference/specification/v3.0.0) documents are supported. AsyncAPI
2.x is not supported yet.

## Installation

```shell
# npm
npm install starlight-asyncapi

# pnpm
pnpm add starlight-asyncapi

# yarn
yarn add starlight-asyncapi
```

`starlight-asyncapi` is a Starlight plugin and requires both `@astrojs/starlight` (`>=0.41.0`) and `astro`
(`>=7.0.2`) to be installed in your project.

## Usage

Add the plugin to your Starlight `plugins` config in `astro.config.mjs`, providing an array with one entry per
AsyncAPI document you want to render. Then, add the generated `asyncAPISidebarGroups` to your Starlight `sidebar`
config so the generated pages get linked somewhere.

```js
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightAsyncAPI, { asyncAPISidebarGroups } from 'starlight-asyncapi'

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Docs',
      plugins: [
        starlightAsyncAPI([
          {
            base: 'events/orders',
            schema: '../schemas/orders.yaml',
            sidebar: { label: 'Orders API' },
          },
        ]),
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [{ label: 'Getting Started', link: '/' }],
        },
        {
          label: 'Events',
          items: asyncAPISidebarGroups,
        },
      ],
    }),
  ],
})
```

With the configuration above, visiting `/events/orders/` will render the schema overview page for the
`../schemas/orders.yaml` AsyncAPI document, generated from a schema local to the project. A schema can also be
referenced using a URL to a remote schema, e.g. `https://example.com/schemas/orders.yaml`.

### Targeted sidebar placement

Instead of using the `asyncAPISidebarGroups` export — which replaces every occurrence of a single implicit
placeholder group anywhere in the sidebar — `createAsyncAPISidebarGroup()` can be used to create additional,
independently targeted placeholder groups. This is useful when documentation for multiple AsyncAPI documents should
be placed in different parts of the sidebar rather than all being grouped together.

```js
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightAsyncAPI, { createAsyncAPISidebarGroup } from 'starlight-asyncapi'

const ordersSidebarGroup = createAsyncAPISidebarGroup()
const paymentsSidebarGroup = createAsyncAPISidebarGroup()

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Docs',
      plugins: [
        starlightAsyncAPI([
          {
            base: 'events/orders',
            schema: '../schemas/orders.yaml',
            sidebar: { label: 'Orders API', group: ordersSidebarGroup },
          },
          {
            base: 'events/payments',
            schema: '../schemas/payments.yaml',
            sidebar: { label: 'Payments API', group: paymentsSidebarGroup },
          },
        ]),
      ],
      sidebar: [
        {
          label: 'Orders',
          items: [ordersSidebarGroup],
        },
        {
          label: 'Payments',
          items: [paymentsSidebarGroup],
        },
      ],
    }),
  ],
})
```

## Configuration

The `starlightAsyncAPIPlugin` default export takes an array of schema configuration objects, one per AsyncAPI
document to render.

### `base`

**Type:** `string`

The AsyncAPI route base path containing the generated documentation, e.g. `'events/orders'`.

### `schema`

**Type:** `string`

The AsyncAPI schema path or URL, e.g. `'../schemas/orders.yaml'` or `'https://example.com/schemas/orders.yaml'`.

### `sidebar`

**Type:** `object`

The generated sidebar group configuration.

| Option              | Type                                      | Default                 | Description                                                                                                                   |
| :------------------ | :---------------------------------------- | :---------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `collapsed`         | `boolean`                                 | `true`                  | Whether the generated documentation sidebar group should be collapsed by default.                                             |
| `label`             | `string`                                  | AsyncAPI document title | The generated documentation sidebar group label.                                                                              |
| `group`             | `StarlightAsyncAPISidebarGroup`           | `undefined`             | The sidebar group created by `createAsyncAPISidebarGroup()` that will contain the generated documentation pages.              |
| `operations.badges` | `boolean`                                 | `false`                 | Whether the sidebar should display badges next to operation links with the associated action (`send`/`receive`) and protocol. |
| `operations.labels` | `'operationId' \| 'channel' \| 'summary'` | `'summary'`             | Whether the operation sidebar link labels should use the operation ID, channel address, or summary.                           |
| `operations.sort`   | `'alphabetical' \| 'document'`            | `'document'`            | The sorting method for the operation sidebar links.                                                                           |
| `tags.sort`         | `'alphabetical' \| 'document'`            | `'document'`            | The sorting method for the tag sidebar groups.                                                                                |

## License

Licensed under the MIT License.

See [LICENSE](https://github.com/bharvold/starlight-asyncapi/blob/main/LICENSE) for more information.
