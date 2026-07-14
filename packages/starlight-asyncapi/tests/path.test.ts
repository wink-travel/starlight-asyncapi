import { expect, test } from '@playwright/test'

import {
  getSchemaBasePath,
  getSlugFromPathname,
  getURLWithPath,
  slug,
  stripHtmlExtension,
  stripLeadingAndTrailingSlashes,
  stripTrailingSlash,
} from '../libs/path'
import type { StarlightAsyncAPISchemaConfig } from '../libs/schemas/schema'

function makeConfig(base: string): StarlightAsyncAPISchemaConfig {
  return {
    base,
    schema: 'v3/simple-pubsub.yaml',
    sidebar: {
      collapsed: true,
      operations: { badges: false, labels: 'summary', sort: 'document' },
      tags: { sort: 'document' },
    },
  }
}

test('slug() slugifies a label the same way github-slugger does', () => {
  expect(slug('Light Measured')).toBe('light-measured')
})

test('stripLeadingAndTrailingSlashes() strips both ends only', () => {
  expect(stripLeadingAndTrailingSlashes('/events/orders/')).toBe('events/orders')
  expect(stripLeadingAndTrailingSlashes('events/orders')).toBe('events/orders')
})

test('stripTrailingSlash() only strips a trailing slash', () => {
  expect(stripTrailingSlash('events/')).toBe('events')
  expect(stripTrailingSlash('events')).toBe('events')
})

test('stripHtmlExtension() strips a trailing .html, tolerating a trailing slash', () => {
  expect(stripHtmlExtension('/events/orders.html')).toBe('/events/orders')
  expect(stripHtmlExtension('/events/orders.html/')).toBe('/events/orders')
  expect(stripHtmlExtension('/events/orders')).toBe('/events/orders')
})

test('getURLWithPath() joins a base URL and a path segment', () => {
  expect(getURLWithPath('https://example.com', 'events')).toBe('https://example.com/events')
  expect(getURLWithPath('https://example.com/', '/events')).toBe('https://example.com/events')
  expect(getURLWithPath('https://example.com', '')).toBe('https://example.com')
})

test('getSchemaBasePath() slugifies every path segment of the configured base', () => {
  expect(getSchemaBasePath(makeConfig('Events/Order Updates'))).toBe('/events/order-updates/')
})

test('getSlugFromPathname() strips index.html and .html, ignoring the Astro base', () => {
  expect(getSlugFromPathname('/events/orders/index.html')).toBe('events/orders')
  expect(getSlugFromPathname('/events/orders.html')).toBe('events/orders')
  expect(getSlugFromPathname('/')).toBeUndefined()
})
