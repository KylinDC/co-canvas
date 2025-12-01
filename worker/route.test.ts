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

      // Verify room was created in database
      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms)
      expect(createdRooms).toHaveLength(1)
      expect(createdRooms[0].id).toBe(json.id)
      expect(createdRooms[0].name).toBe(roomName)

      // Verify user joined as host
      const joinedRooms = await db.select().from(userRooms)
      expect(joinedRooms).toHaveLength(1)
      expect(joinedRooms[0].userId).toBe(userId)
      expect(joinedRooms[0].roomId).toBe(json.id)
      expect(joinedRooms[0].isHost).toBe(true)
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

      // Verify both rooms exist in database
      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms)
      expect(createdRooms).toHaveLength(2)
    })
  })
})
