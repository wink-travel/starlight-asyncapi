import type { BindingsInterface } from '@asyncapi/parser'

/**
 * A normalized, per-protocol view of an AsyncAPI `bindings` object, suitable for rendering as a
 * key/value table. Applies uniformly to server/channel/operation/message level bindings — the
 * `BindingsInterface` collection shape (`.all()` returning `{ protocol(), value() }` entries) is
 * consistent across all four levels, so a single function covers all of them.
 *
 * The KV entries are raw protocol-spec data (e.g. Kafka's `groupId`, MQTT's `qos`) authored by the
 * AsyncAPI document itself, not app-authored UI copy, so no i18n concern applies here (same
 * reasoning the reference OpenAPI plugin applies to parameter names).
 */
export interface NormalizedBindingGroup {
  protocol: string
  entries: [key: string, value: unknown][]
}

export function getBindings(bindings: BindingsInterface | undefined): NormalizedBindingGroup[] {
  if (!bindings) return []

  return bindings.all().map((binding) => ({
    protocol: binding.protocol(),
    entries: Object.entries(binding.value()),
  }))
}
