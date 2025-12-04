import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'
import { beforeEach, describe, expect, it } from 'vitest'

import { rooms, userRooms } from './db/schema.ts'
import { app } from './route.ts'
import { cleanUpDatabase } from './test-helpers.ts'

describe('route', () => {
  beforeEach(cleanUpDatabase)

  describe('POST /api/rooms', () => {
    it('should create a new room and join user as host', async () => {
      const userId = uuidv7()
      const roomName = 'Test Room'

      const response = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            name: roomName,
          }),
        },
        env
      )

      expect(response.status).toBe(200)

      const json = await response.json<{ id: string }>()
      expect(json.id).toBeDefined()
      expect(typeof json.id).toBe('string')

      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms)
      expect(createdRooms).toHaveLength(1)
      expect(createdRooms[0].id).toBe(json.id)
      expect(createdRooms[0].name).toBe(roomName)

      const joinedRooms = await db.select().from(userRooms)
      expect(joinedRooms).toHaveLength(1)
      expect(joinedRooms[0].userId).toBe(userId)
      expect(joinedRooms[0].roomId).toBe(json.id)
    })

    it('should reject request with invalid userId', async () => {
      const response = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'not-a-uuid',
            name: 'Test Room',
          }),
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with missing userId', async () => {
      const response = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Room',
          }),
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with missing name', async () => {
      const response = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: uuidv7(),
          }),
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with invalid JSON', async () => {
      const response = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should create different rooms for different requests', async () => {
      const userId1 = uuidv7()
      const userId2 = uuidv7()

      const response1 = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId1,
            name: 'Room 1',
          }),
        },
        env
      )

      const response2 = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId2,
            name: 'Room 2',
          }),
        },
        env
      )

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const json1 = await response1.json<{ id: string }>()
      const json2 = await response2.json<{ id: string }>()

      expect(json1.id).not.toBe(json2.id)

      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms)
      expect(createdRooms).toHaveLength(2)
    })
  })

  describe('POST /api/rooms/:roomId/join', () => {
    it('should allow user to join an existing room', async () => {
      const hostUserId = uuidv7()
      const guestUserId = uuidv7()

      const createResponse = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
            name: 'Test Room',
          }),
        },
        env
      )

      const { id: roomId } = await createResponse.json<{ id: string }>()

      const joinResponse = await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: guestUserId,
          }),
        },
        env
      )

      expect(joinResponse.status).toBe(200)

      const json = await joinResponse.json<{ roomId: string }>()
      expect(json.roomId).toBe(roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms)
      expect(joinedRooms).toHaveLength(2)
      expect(joinedRooms.some((ur) => ur.userId === guestUserId)).toBe(true)
      expect(joinedRooms.some((ur) => ur.userId === hostUserId)).toBe(true)
    })

    it('should return 404 when room does not exist', async () => {
      const userId = uuidv7()
      const nonExistentRoomId = uuidv7()

      const response = await app.request(
        `/api/rooms/${nonExistentRoomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
          }),
        },
        env
      )

      expect(response.status).toBe(404)
    })

    it('should return 400 when user already joined another room', async () => {
      const userId = uuidv7()

      const createResponse1 = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            name: 'Room 1',
          }),
        },
        env
      )

      const { id: roomId1 } = await createResponse1.json<{ id: string }>()

      const hostUserId2 = uuidv7()
      const createResponse2 = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId2,
            name: 'Room 2',
          }),
        },
        env
      )

      const { id: roomId2 } = await createResponse2.json<{ id: string }>()

      const joinResponse = await app.request(
        `/api/rooms/${roomId2}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
          }),
        },
        env
      )

      expect(joinResponse.status).toBe(400)

      const json = await joinResponse.json<{ errorMessage: string }>()
      expect(json.errorMessage).toBe(
        `User already joined another open room with roomId: ${roomId1}`
      )
    })

    it('should allow user to rejoin the same room', async () => {
      const userId = uuidv7()

      const createResponse = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            name: 'Test Room',
          }),
        },
        env
      )

      const { id: roomId } = await createResponse.json<{ id: string }>()

      const rejoinResponse = await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
          }),
        },
        env
      )

      expect(rejoinResponse.status).toBe(200)

      const json = await rejoinResponse.json<{ roomId: string }>()
      expect(json.roomId).toBe(roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms)
      expect(joinedRooms).toHaveLength(1)
    })

    it('should reject request with invalid roomId', async () => {
      const userId = uuidv7()

      const response = await app.request(
        '/api/rooms/invalid-room-id/join',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
          }),
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with invalid userId', async () => {
      const hostUserId = uuidv7()

      const createResponse = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
            name: 'Test Room',
          }),
        },
        env
      )

      const { id: roomId } = await createResponse.json<{ id: string }>()

      const response = await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'invalid-user-id',
          }),
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with missing userId', async () => {
      const hostUserId = uuidv7()

      const createResponse = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
            name: 'Test Room',
          }),
        },
        env
      )

      const { id: roomId } = await createResponse.json<{ id: string }>()

      const response = await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject new user trying to join a closed room', async () => {
      const hostUserId = uuidv7()
      const newUserId = uuidv7()

      // Create a room
      const createResponse = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
            name: 'Test Room',
          }),
        },
        env
      )

      const { id: roomId } = await createResponse.json<{ id: string }>()

      // Close the room
      await app.request(
        `/api/rooms/${roomId}/close`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
          }),
        },
        env
      )

      // Try to join as new user
      const joinResponse = await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: newUserId,
          }),
        },
        env
      )

      expect(joinResponse.status).toBe(400)

      const json = await joinResponse.json<{ errorMessage: string }>()
      expect(json.errorMessage).toBe('Room has been closed')
    })

    it('should allow existing member to rejoin a closed room', async () => {
      const hostUserId = uuidv7()
      const memberUserId = uuidv7()

      // Create a room
      const createResponse = await app.request(
        '/api/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
            name: 'Test Room',
          }),
        },
        env
      )

      const { id: roomId } = await createResponse.json<{ id: string }>()

      // Member joins the room
      await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: memberUserId,
          }),
        },
        env
      )

      // Close the room
      await app.request(
        `/api/rooms/${roomId}/close`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: hostUserId,
          }),
        },
        env
      )

      // Member should be able to rejoin
      const rejoinResponse = await app.request(
        `/api/rooms/${roomId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: memberUserId,
          }),
        },
        env
      )

      expect(rejoinResponse.status).toBe(200)

      const json = await rejoinResponse.json<{ roomId: string }>()
      expect(json.roomId).toBe(roomId)
    })
  })
})
