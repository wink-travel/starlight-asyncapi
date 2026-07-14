---
'starlight-asyncapi': minor
---

Initial release of `starlight-asyncapi`, a Starlight plugin that generates documentation from AsyncAPI 3.x
specifications.

Given one or more AsyncAPI documents, the plugin renders a schema overview (info, servers, security schemes),
channels with their address parameters, operations (`send`/`receive`) with tag grouping, messages (payload,
headers, correlation ID), protocol bindings (Kafka, MQTT, AMQP, WebSockets, and more), and request/reply
operations targeting either a channel or an address. Sidebar placement is configurable through the
`asyncAPISidebarGroups` export or targeted per-schema with `createAsyncAPISidebarGroup()`.

Only AsyncAPI 3.x documents are supported; AsyncAPI 2.x support is not yet implemented.
