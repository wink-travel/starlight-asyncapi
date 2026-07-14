/**
 * A per-protocol color hue (HSL degrees) for the small protocol `Tag`s shown next to an
 * operation's action badge (`OperationAction.astro`) and in the overview navigation link list.
 * Purely presentational — protocol names themselves are raw AsyncAPI spec identifiers (like
 * `binding.ts`'s KV entries), not app-authored UI copy, so this is not an i18n concern. Unknown
 * protocols fall back to the `Tag` primitive's default neutral-gray styling (`hue: undefined`).
 */
const protocolHues: Record<string, number> = {
  amqp: 16,
  amqp1: 16,
  anypointmq: 32,
  googlepubsub: 4,
  http: 204,
  https: 204,
  ibmmq: 210,
  jms: 45,
  kafka: 261,
  'kafka-secure': 261,
  mercure: 280,
  mqtt: 199,
  mqtt5: 199,
  nats: 130,
  pulsar: 340,
  redis: 356,
  sns: 32,
  solace: 24,
  sqs: 32,
  stomp: 60,
  ws: 291,
  wss: 291,
}

export function getProtocolHue(protocol: string): number | undefined {
  return protocolHues[protocol.toLowerCase()]
}
