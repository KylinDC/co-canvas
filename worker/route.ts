import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { createRoom, joinRoom } from './rooms.ts'
import { createRoomReq } from './schemas.ts'

export const app = new Hono<{ Bindings: Env }>()

const route = app.post(
  '/api/rooms',
  zValidator('json', createRoomReq),
  async ({ env, req, json }) => {
    const { userId, name } = req.valid('json')
    const roomId = (await createRoom(env, name))[0].id

    await joinRoom(env, userId, roomId, true)

    return json({ id: roomId })
  }
)

export type AppType = typeof route
