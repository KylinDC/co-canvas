import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'
import { beforeEach, describe, expect, it } from 'vitest'

import { rooms, userRooms } from './db/schema.ts'
import { app } from './route.ts'

describe('WebSocket Endpoint', () => {
  beforeEach(async () => {
    const db = drizzle(env.DB)
    await db.delete(userRooms)
    await db.delete(rooms)
  })

  describe('GET /api/rooms/:roomId/connect', () => {
    it('should reject request with invalid roomId format', async () => {
      const userId = uuidv7()
      const sessionId = uuidv7()

      const response = await app.request(
        `/api/rooms/invalid-uuid/connect?userId=${userId}&sessionId=${sessionId}`,
        {},
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with missing userId', async () => {
      const roomId = uuidv7()
      const sessionId = uuidv7()

      const response = await app.request(
        `/api/rooms/${roomId}/connect?sessionId=${sessionId}`,
        {},
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with invalid userId format', async () => {
      const roomId = uuidv7()
      const sessionId = uuidv7()

      const response = await app.request(
        `/api/rooms/${roomId}/connect?userId=invalid-uuid&sessionId=${sessionId}`,
        {},
        env
      )

      expect(response.status).toBe(400)
    })

    it('should reject request with missing sessionId', async () => {
      const roomId = uuidv7()
      const userId = uuidv7()

      const response = await app.request(
        `/api/rooms/${roomId}/connect?userId=${userId}`,
        {},
        env
      )

      expect(response.status).toBe(400)
    })

    it('should return 404 when room does not exist', async () => {
      const roomId = uuidv7()
      const userId = uuidv7()
      const sessionId = uuidv7()

      const response = await app.request(
        `/api/rooms/${roomId}/connect?userId=${userId}&sessionId=${sessionId}`,
        {
          headers: {
            Upgrade: 'websocket',
            Connection: 'Upgrade',
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
            'Sec-WebSocket-Version': '13',
          },
        },
        env
      )

      expect(response.status).toBe(404)
    })
  })
})
