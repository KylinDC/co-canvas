import { Hono } from 'hono'

import { roomRoutes } from './routes/room.routes'

export const app = new Hono<{ Bindings: Env }>()
  .route('/', roomRoutes)
  .notFound((ctx) => {
    return ctx.text('Resource Not Found', 404)
  })

export type AppType = typeof app
