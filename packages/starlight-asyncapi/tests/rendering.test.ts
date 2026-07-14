import { expect, test } from './test'

test.describe('operation rendering', () => {
  test('renders the action badge, channel address, payload properties, and a bindings table', async ({ docPage, page }) => {
    await docPage.goto('/events/kafka/operations/receiveusersignedup/')

    await expect(docPage.getByText('Receive', { exact: true })).toBeVisible()
    await expect(docPage.getContent().getByText('user.signedup')).toBeVisible()

    // Payload property row (from the message schema's `userId` property).
    await expect(docPage.getContent().getByText('userId', { exact: true })).toBeVisible()

    // Operation-level Kafka binding: a "kafka" sub-heading (matched by its un-prefixed id, since
    // channel/message/server-level "kafka" bindings on this same page share the same heading text
    // but get disambiguating id prefixes — see `Servers.astro`/`Channel.astro`/`Message.astro`) and
    // its key/value table.
    await expect(page.locator('#kafka')).toBeVisible()
    await expect(docPage.getContent().getByText('groupId', { exact: true })).toBeVisible()
    await expect(docPage.getContent().getByText('clientId', { exact: true })).toBeVisible()
  })

  test('renders an MQTT operation binding table with qos and retain', async ({ docPage, page }) => {
    await docPage.goto('/events/mqtt/operations/senddevicestatus/')

    await expect(docPage.getByText('Send', { exact: true })).toBeVisible()
    // See the "kafka" id-vs-text note above: the un-prefixed "mqtt" heading is the operation-level
    // binding; the server's own "mqtt" heading is disambiguated with a "server-" id prefix.
    await expect(page.locator('#mqtt')).toBeVisible()
    await expect(docPage.getContent().getByText('qos', { exact: true })).toBeVisible()
    await expect(docPage.getContent().getByText('retain', { exact: true })).toBeVisible()
  })

  test('renders message headers and a correlationId location', async ({ docPage }) => {
    await docPage.goto('/events/traits/operations/receiveordercreated/')

    // Message trait-merged content: contentType, headers property, and correlationId.
    await expect(docPage.getContent().getByText('application/json')).toBeVisible()
    await expect(docPage.getContent().getByText('correlationId', { exact: true })).toBeVisible()
    await expect(docPage.getContent().getByText('$message.header#/correlationId')).toBeVisible()

    // The operation-trait-provided description merged onto the operation itself.
    await expect(
      docPage.getContent().getByText('A trait-provided description shared across operations that receive domain events.'),
    ).toBeVisible()
  })

  test('renders the reply block with its channel and message', async ({ docPage }) => {
    await docPage.goto('/events/request-reply/operations/getuser/')

    await expect(docPage.getSectionHeading('Reply', 2)).toBeVisible()
    await expect(docPage.getContent().getByText('user/get/reply')).toBeVisible()
    await expect(docPage.getSectionHeading('getUserReply', 4)).toBeVisible()
    await expect(docPage.getContent().getByText('name', { exact: true })).toBeVisible()
  })

  test('renders the reply address (location + description) when a reply has no channel', async ({ docPage }) => {
    await docPage.goto('/events/reply-address/operations/ping/')

    await expect(docPage.getSectionHeading('Reply', 2)).toBeVisible()
    await expect(docPage.getContent().getByText('Address', { exact: true })).toBeVisible()
    await expect(docPage.getContent().getByText('$message.header#/replyTo')).toBeVisible()
    // Markdown rendering smart-quotes the apostrophe in "message's", so match the stable prefix.
    await expect(
      docPage.getContent().getByText('The dynamic reply destination carried in the request message', { exact: false }),
    ).toBeVisible()
  })

  test('gives the reply its own unique section ids when it reuses the operation channel/message, avoiding anchor collisions', async ({
    docPage,
    page,
  }) => {
    await docPage.goto('/events/reply-collision/operations/sendecho/')

    // The operation's own channel-level Kafka... (ws) binding heading, at its default (un-prefixed
    // beyond `channel-<id>`) id.
    await expect(page.locator('#channel-echochannel-ws')).toHaveCount(1)
    // The reply's Channel render of the SAME underlying channel gets a distinct `reply-channel-`
    // prefix, so its own binding heading does not collide with the one above.
    await expect(page.locator('#reply-channel-echochannel-ws')).toHaveCount(1)

    // The operation's own message section (un-prefixed).
    await expect(page.locator('#echomessage')).toHaveCount(1)
    // The reply's Message render of the SAME underlying message gets a `reply-` prefix, so its own
    // section id does not collide with the one above.
    await expect(page.locator('#reply-echomessage')).toHaveCount(1)
  })

  test('renders servers scoped to the operation channel', async ({ docPage }) => {
    await docPage.goto('/events/multi-server/operations/sendnotificationkafka/')

    await expect(docPage.getSectionHeading('Servers', 2)).toBeVisible()
    await expect(docPage.getSectionHeading('kafka', 3)).toBeVisible()
    await expect(docPage.getContent().getByText('kafka.example.com:9092')).toBeVisible()
    // The MQTT-only server is not scoped to this Kafka-only channel.
    await expect(docPage.getContent().getByText('broker.example.com:1883')).toHaveCount(0)
  })

  test('renders operation-level authorizations linking to the security scheme', async ({ docPage, page }) => {
    await docPage.goto('/events/security/operations/sendorderplaced/')

    // The operation-level "Authorizations" heading is un-prefixed; the kafka server's own nested
    // "Authorizations" heading (server-level security) gets a "server-kafka-" id prefix.
    await expect(page.locator('#authorizations')).toBeVisible()
    // Both the operation AND its kafka server require apiKey (see `security.yaml`), so two
    // identical "apiKey" links legitimately render on this page — one per `Security` instance.
    // Neither requirement lists scopes in this fixture (see `tests/security.test.ts`), so no
    // scope `Tag` renders here — the oauth scheme's *available* scopes (`read`/`write`) only show
    // up in `SecurityDefinitions` on the schema overview page (see the overview test below).
    await expect(docPage.getContent().getByRole('link', { name: 'apiKey', exact: true }).first()).toBeVisible()
    await expect(docPage.getContent().getByRole('link', { name: 'oauth', exact: true })).toBeVisible()
  })

  test('renders a recursive payload schema without error', async ({ docPage, page }) => {
    const response = await docPage.goto('/events/recursive/operations/receivetreeupdated/')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(docPage.getContent().getByText('children', { exact: true })).toBeVisible()
    await expect(docPage.getContent().getByText('recursive').first()).toBeVisible()
  })
})

test.describe('overview rendering', () => {
  test('shows info, servers, and security definitions', async ({ docPage }) => {
    await docPage.goto('/events/security/')

    await expect(docPage.getSectionHeading('Security Example (1.0.0)', 2)).toBeVisible()
    await expect(
      docPage.getContent().getByText('Exercises AsyncAPI security schemes, including broker-auth types'),
    ).toBeVisible()

    await expect(docPage.getSectionHeading('Servers', 2)).toBeVisible()
    await expect(docPage.getContent().getByText('kafka.example.com:9092')).toBeVisible()

    await expect(docPage.getSectionHeading('Authentication', 2)).toBeVisible()
    await expect(docPage.getSectionHeading('apiKey', 3)).toBeVisible()
    await expect(docPage.getContent().getByText('X-Api-Key')).toBeVisible()

    // The oauth scheme's clientCredentials flow and its available scopes.
    await expect(docPage.getSectionHeading('oauth', 3)).toBeVisible()
    await expect(docPage.getContent().getByText('https://example.com/token')).toBeVisible()
    await expect(docPage.getContent().getByText('Read access')).toBeVisible()
  })

  test('lists operation navigation links with their action badge', async ({ docPage }) => {
    await docPage.goto('/events/pubsub/')

    await expect(docPage.getSectionHeading('Operations', 2)).toBeVisible()
    await expect(
      docPage.getContent().getByRole('link', { name: 'Receive light measurement events.', exact: true }),
    ).toBeVisible()
    await expect(
      docPage.getContent().getByRole('link', { name: 'Send a command to turn on a light.', exact: true }),
    ).toBeVisible()
  })
})
