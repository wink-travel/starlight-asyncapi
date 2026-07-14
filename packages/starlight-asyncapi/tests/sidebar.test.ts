import type { SidebarItemGroup } from './fixtures/SidebarPage'
import { expect, test } from './test'

test('groups untagged operations under the translated default tag group', async ({ sidebarPage }) => {
  await sidebarPage.goto()

  const items = await sidebarPage.getSidebarGroupItems('Simple Pub/Sub')

  expect(items).toMatchObject([
    { name: 'Overview' },
    {
      collapsed: false,
      label: 'Operations',
      items: [{ name: 'Receive light measurement events.' }, { name: 'Send a command to turn on a light.' }],
    },
  ])
})

test('creates an operation-tag-overview page for tags with a description', async ({ sidebarPage }) => {
  await sidebarPage.goto()

  const items = await sidebarPage.getSidebarGroupItems('Tagged Operations')

  expect(items).toMatchObject([
    { name: 'Overview' },
    {
      collapsed: false,
      label: 'Devices',
      items: [
        { name: 'Overview' },
        { name: 'Receive device online events.' },
        { name: 'Receive device offline events.' },
      ],
    },
  ])
})

test('does not create an operation-tag-overview page for the untagged fallback group', async ({ sidebarPage }) => {
  await sidebarPage.goto()

  const items = await sidebarPage.getSidebarGroupItems('Kafka Bindings')

  // The fallback tag has no `description`, so `isMinimalOperationTag` suppresses the extra
  // "Overview" link that non-minimal tags (see the "Devices" group above) get prepended with.
  expect(items).toMatchObject([
    { name: 'Overview' },
    {
      collapsed: false,
      label: 'Operations',
      items: [{ name: 'Consume user sign-up events.' }],
    },
  ])
})

test('lists every generated schema sidebar group', async ({ sidebarPage }) => {
  await sidebarPage.goto()

  const items = await sidebarPage.getSidebarGroupItems('Schemas')

  expect(items).toHaveLength(11)
  expect(isSidebarItemGroup(items[0]) && items[0].label).toBe('Simple Pub/Sub')
  expect(isSidebarItemGroup(items[1]) && items[1].label).toBe('Kafka Bindings')
  expect(isSidebarItemGroup(items[2]) && items[2].label).toBe('MQTT QoS')
  expect(isSidebarItemGroup(items[3]) && items[3].label).toBe('Multi Server')
  expect(isSidebarItemGroup(items[4]) && items[4].label).toBe('Request Reply')
  expect(isSidebarItemGroup(items[5]) && items[5].label).toBe('Traits Correlation')
  expect(isSidebarItemGroup(items[6]) && items[6].label).toBe('Recursive Payload')
  expect(isSidebarItemGroup(items[7]) && items[7].label).toBe('Tagged Operations')
  expect(isSidebarItemGroup(items[8]) && items[8].label).toBe('Security')
  expect(isSidebarItemGroup(items[9]) && items[9].label).toBe('Reply Address')
  expect(isSidebarItemGroup(items[10]) && items[10].label).toBe('Reply Collision')
})

function isSidebarItemGroup(item: unknown): item is SidebarItemGroup {
  return typeof item === 'object' && item !== null && 'label' in item
}
