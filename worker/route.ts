import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { createRoom, getRoomWithUserId, joinRoom } from './rooms.ts'
import { createRoomReq, getRoomWithUserIdReq } from './schemas.ts'

export const app = new Hono<{ Bindings: Env }>()

const route = app
  .post('/api/rooms', zValidator('json', createRoomReq), async (ctx) => {
    const { env, req, json } = ctx
    const { userId, name } = req.valid('json')
    const roomId = (await createRoom(env, name))[0].id

    await joinRoom(env, userId, roomId, true)

    return json({ id: roomId })
  })
  .get('/api/rooms', zValidator('query', getRoomWithUserIdReq), async (ctx) => {
    const { env, req, json, notFound } = ctx

    const { userId } = req.valid('query')
    const roomIds = await getRoomWithUserId(env, userId)

    if (roomIds.length === 0) {
      return notFound()
    }

    return json({ roomId: roomIds[0].roomId })
  })
  .notFound((ctx) => {
    return ctx.text('Resource Not Found', 404)
  })

export type AppType = typeof route
