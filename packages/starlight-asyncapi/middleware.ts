import { defineRouteMiddleware } from '@astrojs/starlight/route-data'
import projectContext from 'virtual:starlight-asyncapi/context'
import schemas from 'virtual:starlight-asyncapi/schemas'

import type { TranslateFn } from './libs/operation'
import { stripHtmlExtension, stripLeadingAndTrailingSlashes } from './libs/path'
import { getPaginationLinks, getSidebarFromSchemas } from './libs/starlight'

const allSchemas = Object.values(schemas)

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals

  // `Astro.locals.t` is i18next's overloaded `TFunction` (from `@astrojs/starlight`); our own
  // `TranslateFn` is a deliberately narrow single-signature shape (see `operation.ts`) that every
  // lib in this plugin builds display text against. The two are functionally compatible (both
  // support `t(key, params?)`) but not structurally assignable across every overload, hence the
  // explicit cast rather than importing Starlight's internal i18next-typed alias.
  const t = context.locals.t as unknown as TranslateFn

  const sidebar = getSidebarFromSchemas(
    stripLeadingAndTrailingSlashes(stripHtmlExtension(context.url.pathname)),
    starlightRoute.sidebar,
    allSchemas,
    projectContext,
    t,
  )

  starlightRoute.sidebar = sidebar
  starlightRoute.pagination = getPaginationLinks(sidebar, starlightRoute.entry.data, projectContext)
})
