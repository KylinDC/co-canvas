import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import {
  closeRoom,
  createRoom,
  getRoom,
  getRoomWithUserId,
  joinRoom,
  leaveRoom,
} from './rooms.ts'
import { createRoomReq, getRoomWithUserIdReq, joinRoomReq } from './schemas.ts'

export const app = new Hono<{ Bindings: Env }>()
  .post('/api/rooms', zValidator('json', createRoomReq), async (ctx) => {
    const { env, req, json } = ctx
    const { userId, name } = req.valid('json')

    const currentUserRoom = await getRoomWithUserId(env, userId, true)
    if (currentUserRoom.length > 0) {
      return json(
        {
          errorMessage: `User already joined another open room with roomId: ${currentUserRoom[0].roomId}`,
        },
        400
      )
    }

    const roomId = (await createRoom(env, name, userId))[0].id

    await joinRoom(env, userId, roomId)

    return json({ id: roomId })
  })
  .get('/api/rooms', zValidator('query', getRoomWithUserIdReq), async (ctx) => {
    const { env, req, json, notFound } = ctx

    const { userId } = req.valid('query')
    const userRooms = await getRoomWithUserId(env, userId)

    if (userRooms.length === 0) {
      return notFound()
    }

    return json(
      userRooms.map((room) => ({
        roomId: room.roomId,
        roomName: room.roomName,
        isOpen: room.isOpen,
        isCurrentUserHost: room.hostId === userId,
      }))
    )
  })
  .post(
    '/api/rooms/:roomId/join',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    zValidator('json', joinRoomReq),
    async (ctx) => {
      const { env, req, json, notFound } = ctx

      const { roomId } = req.valid('param')
      const { userId } = req.valid('json')

      const room = await getRoom(env, roomId)

      if (!room) {
        return notFound()
      }

      const currentUserRoom = await getRoomWithUserId(env, userId, false)
      if (currentUserRoom.some((ur) => ur.roomId === roomId)) {
        return json({ roomId })
      }

      const openUserRoom = currentUserRoom.filter((ur) => ur.isOpen)
      if (openUserRoom.length > 0 && currentUserRoom[0].roomId !== roomId) {
        return json(
          {
            errorMessage: `User already joined another open room with roomId: ${currentUserRoom[0].roomId}`,
            existingRoomId: currentUserRoom[0].roomId,
          },
          400
        )
      }

      if (!room.isOpen && currentUserRoom.length) {
        return json({ errorMessage: `Room has been closed` }, 400)
      }

      return json({ roomId })
    }
  )
  .post(
    '/api/rooms/:roomId/leave',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    zValidator('json', z.object({ userId: z.uuidv7() })),
    async (ctx) => {
      const { env, req, body, notFound } = ctx

      const { roomId } = req.valid('param')
      const { userId } = req.valid('json')

      const room = await getRoom(env, roomId)

      if (!room) {
        return notFound()
      }

      await leaveRoom(env, userId, roomId)

      return body(null)
    }
  )
  .post(
    '/api/rooms/:roomId/close',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    zValidator('json', z.object({ userId: z.uuidv7() })),
    async (ctx) => {
      const { env, req, body, notFound, json } = ctx

      const { roomId } = req.valid('param')
      const { userId } = req.valid('json')

      const room = await getRoom(env, roomId)

      if (!room) {
        return notFound()
      }

      if (room.hostId !== userId) {
        json({ errorMessage: 'Only host can close room' }, 400)
      }

      await closeRoom(env, roomId)

      const doId = env.ROOM_DO.idFromString(room.doId)
      const roomStub = env.ROOM_DO.get(doId)
      await roomStub.fetch(
        new Request(`${req.url.split('/close')[0]}/broadcast-close`, {
          method: 'POST',
        })
      )

      return body(null)
    }
  )
  .get(
    '/api/rooms/:roomId',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    async (ctx) => {
      const { env, req, notFound, json } = ctx

      const { roomId } = req.valid('param')

      const room = await getRoom(env, roomId)

      if (!room) {
        return notFound()
      }

      return json({ id: room.id, name: room.name })
    }
  )
  .get(
    '/api/rooms/:roomId/connect',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    zValidator(
      'query',
      z.object({ userId: z.uuidv7(), sessionId: z.string() })
    ),
    async (ctx) => {
      const { env, req, notFound, json } = ctx

      const { roomId } = req.valid('param')
      const { userId } = req.valid('query')

      const room = await getRoom(env, roomId)

      if (!room) {
        return notFound()
      }

      const currentUserRoom = await getRoomWithUserId(env, userId, false)
      if (currentUserRoom.some((ur) => ur.roomId === roomId)) {
        await joinRoom(env, userId, roomId)
        const doId = env.ROOM_DO.idFromString(room.doId)
        const roomStub = env.ROOM_DO.get(doId)

        return roomStub.fetch(req.raw)
      }

      const openUserRoom = currentUserRoom.filter((ur) => ur.isOpen)
      if (openUserRoom.length > 0 && currentUserRoom[0].roomId !== roomId) {
        return json(
          {
            errorMessage: `User already joined another open room with roomId: ${currentUserRoom[0].roomId}`,
            existingRoomId: currentUserRoom[0].roomId,
          },
          400
        )
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

export type AppType = typeof app
