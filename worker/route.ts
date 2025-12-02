import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { createRoom, getRoom, getRoomWithUserId, joinRoom } from './rooms.ts'
import { createRoomReq, getRoomWithUserIdReq } from './schemas.ts'
import { z } from 'zod'

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
    const userRoom = await getRoomWithUserId(env, userId)

    if (!userRoom) {
      return notFound()
    }

    return json({ roomId: userRoom.roomId })
  })
  .get(
    '/api/rooms/:roomId/connect',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    zValidator(
      'query',
      z.object({ userId: z.uuidv7(), sessionId: z.string() })
    ),
    async (ctx) => {
      const { env, req, notFound } = ctx

      const { roomId } = req.valid('param')
      const { userId } = req.valid('query')

      const room = await getRoom(env, roomId)

      if (!room) {
        return notFound()
      }

      await joinRoom(env, userId, roomId)
      const doId = env.ROOM_DO.idFromString(room.doId)
      const roomStub = env.ROOM_DO.get(doId)

      return roomStub.fetch(req.raw)
    }
  )
  .notFound((ctx) => {
    return ctx.text('Resource Not Found', 404)
  })

export type AppType = typeof route
