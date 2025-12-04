import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { createRoomReq, getRoomWithUserIdReq, joinRoomReq } from '../schemas'
import { RoomService } from '../services/room.service'

export const roomRoutes = new Hono<{ Bindings: Env }>()
  .post('/api/rooms', zValidator('json', createRoomReq), async (ctx) => {
    const { env, req, json } = ctx
    const { userId, name } = req.valid('json')

    try {
      const roomService = new RoomService(env)

      // Check if user is already in another open room
      const currentUserRooms = await roomService.getRoomsByUserId(userId, true)
      if (currentUserRooms.length > 0) {
        return json(
          {
            errorMessage: `User already joined another open room with roomId: ${currentUserRooms[0].roomId}`,
          },
          400
        )
      }

      // Create room and join as host
      const result = await roomService.createRoom(name, userId)
      const roomId = result[0].id
      await roomService.joinRoom(userId, roomId)

      return json({ id: roomId })
    } catch (error) {
      console.error('Error creating room:', error)
      return json({ errorMessage: 'Failed to create room' }, 500)
    }
  })
  .get('/api/rooms', zValidator('query', getRoomWithUserIdReq), async (ctx) => {
    const { env, req, json, notFound } = ctx
    const { userId } = req.valid('query')

    try {
      const roomService = new RoomService(env)
      const userRooms = await roomService.getRoomsByUserId(userId)

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
    } catch (error) {
      console.error('Error getting rooms:', error)
      return json({ errorMessage: 'Failed to get rooms' }, 500)
    }
  })
  .post(
    '/api/rooms/:roomId/join',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    zValidator('json', joinRoomReq),
    async (ctx) => {
      const { env, req, json, notFound } = ctx
      const { roomId } = req.valid('param')
      const { userId } = req.valid('json')

      try {
        const roomService = new RoomService(env)
        const result = await roomService.joinRoom(userId, roomId)

        return json({ roomId: result.roomId })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'

        if (message === 'Room not found') {
          return notFound()
        }

        if (message.includes('already joined another open room')) {
          const roomIdMatch = /roomId:\s*([a-zA-Z0-9-]+)/.exec(message)
          return json(
            {
              errorMessage: message,
              existingRoomId: roomIdMatch ? roomIdMatch[1] : undefined,
            },
            400
          )
        }

        if (message === 'Room has been closed') {
          return json({ errorMessage: message }, 400)
        }

        console.error('Error joining room:', error)
        return json({ errorMessage: 'Failed to join room' }, 500)
      }
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

      try {
        const roomService = new RoomService(env)
        await roomService.leaveRoom(userId, roomId)

        return body(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'

        if (message === 'Room not found') {
          return notFound()
        }

        console.error('Error leaving room:', error)
        return body('Failed to leave room', 500)
      }
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

      try {
        const roomService = new RoomService(env)
        const room = await roomService.closeRoom(userId, roomId)

        // Broadcast to Durable Object in background (if execution context available)
        const broadcastPromise = (async () => {
          try {
            const doId = env.ROOM_DO.idFromString(room.doId)
            const roomStub = env.ROOM_DO.get(doId)
            await roomStub.fetch(
              new Request(`${req.url.split('/close')[0]}/broadcast-close`, {
                method: 'POST',
              })
            )
          } catch (error) {
            console.error('Failed to broadcast room close:', error)
          }
        })()

        // Use waitUntil if available (production), otherwise just fire-and-forget (tests)
        try {
          ctx.executionCtx.waitUntil(broadcastPromise)
        } catch {
          // ExecutionContext not available in test environment - broadcast will still run
        }

        return body(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'

        if (message === 'Room not found') {
          return notFound()
        }

        if (message === 'Only host can close room') {
          return json({ errorMessage: message }, 400)
        }

        console.error('Error closing room:', error)
        return body('Failed to close room', 500)
      }
    }
  )
  .get(
    '/api/rooms/:roomId',
    zValidator('param', z.object({ roomId: z.uuidv7() })),
    async (ctx) => {
      const { env, req, notFound, json } = ctx
      const { roomId } = req.valid('param')

      try {
        const roomService = new RoomService(env)
        const room = await roomService.getRoom(roomId)

        if (!room) {
          return notFound()
        }

        return json({ id: room.id, name: room.name })
      } catch (error) {
        console.error('Error getting room:', error)
        return json({ errorMessage: 'Failed to get room' }, 500)
      }
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
      const { env, req, json } = ctx
      const { roomId } = req.valid('param')
      const { userId } = req.valid('query')

      try {
        const roomService = new RoomService(env)
        const room = await roomService.getRoom(roomId)

        if (!room) {
          return json({ errorMessage: 'Room not found' }, 404)
        }

        await roomService.joinRoom(userId, roomId)

        // Forward to Durable Object
        const doId = env.ROOM_DO.idFromString(room.doId)
        const roomStub = env.ROOM_DO.get(doId)

        return roomStub.fetch(req.raw)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'

        if (message.includes('already joined another open room')) {
          const roomIdMatch = /roomId:\s*([a-zA-Z0-9-]+)/.exec(message)
          return json(
            {
              errorMessage: message,
              existingRoomId: roomIdMatch ? roomIdMatch[1] : undefined,
            },
            400
          )
        }

        console.error('Error connecting to room:', error)
        return json({ errorMessage: 'Failed to connect to room' }, 500)
      }
    }
  )
