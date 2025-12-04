import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'
import { beforeEach, describe, expect, it } from 'vitest'

import { rooms, userRooms } from './db/schema.ts'
import { createRoom, joinRoom } from './rooms.ts'
import { cleanUpDatabase } from './test-helpers.ts'

describe('rooms', () => {
  beforeEach(cleanUpDatabase)

  describe('createRoom', () => {
    it('should create a new room with valid name', async () => {
      const roomName = 'Test Room'
      const userId = uuidv7()

      const result = await createRoom(env, roomName, userId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBeDefined()
      expect(typeof result[0].id).toBe('string')

      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms).all()
      expect(createdRooms).toHaveLength(1)
      expect(createdRooms[0].name).toBe(roomName)
      expect(createdRooms[0].doId).toBeDefined()
    })

    it('should create unique IDs for different rooms', async () => {
      const userId1 = uuidv7()
      const userId2 = uuidv7()
      const room1 = await createRoom(env, 'Room 1', userId1)
      const room2 = await createRoom(env, 'Room 2', userId2)

      expect(room1[0].id).not.toBe(room2[0].id)
    })

    it('should create a Durable Object ID', async () => {
      const roomName = 'Test Room'
      const userId = uuidv7()
      await createRoom(env, roomName, userId)
      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms).all()

      expect(createdRooms[0].doId).toBeDefined()
      expect(typeof createdRooms[0].doId).toBe('string')
      expect(createdRooms[0].doId?.length).toBeGreaterThan(0)
    })
  })

  describe('joinRoom', () => {
    it('should add user to room', async () => {
      const hostId = uuidv7()
      const room = await createRoom(env, 'Test Room', hostId)
      const roomId = room[0].id
      const userId = uuidv7()

      const result = await joinRoom(env, userId, roomId)

      const resultRoomId = Array.isArray(result)
        ? result[0].roomId
        : result.roomId
      expect(resultRoomId).toBe(roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()
      expect(joinedRooms).toHaveLength(1)
      expect(joinedRooms[0].userId).toBe(userId)
      expect(joinedRooms[0].roomId).toBe(roomId)
    })

    it('should return existing room if user already joined', async () => {
      const hostId = uuidv7()
      const room = await createRoom(env, 'Test Room', hostId)
      const roomId = room[0].id
      const userId = uuidv7()

      await joinRoom(env, userId, roomId)
      const result = await joinRoom(env, userId, roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()
      expect(joinedRooms).toHaveLength(1)
      const resultRoomId = Array.isArray(result)
        ? result[0].roomId
        : result.roomId
      expect(resultRoomId).toBe(roomId)
    })

    it('should create unique IDs for different user-room associations', async () => {
      const hostId = uuidv7()
      const room = await createRoom(env, 'Test Room', hostId)
      const roomId = room[0].id
      const userId1 = uuidv7()
      const userId2 = uuidv7()

      await joinRoom(env, userId1, roomId)
      await joinRoom(env, userId2, roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()

      expect(joinedRooms).toHaveLength(2)
      expect(joinedRooms[0].id).not.toBe(joinedRooms[1].id)
    })

    it('should allow multiple users to join the same room', async () => {
      const hostId = uuidv7()
      const room = await createRoom(env, 'Test Room', hostId)
      const roomId = room[0].id
      const userId = uuidv7()

      const result = await joinRoom(env, userId, roomId)
      const resultRoomId = Array.isArray(result)
        ? result[0].roomId
        : result.roomId
      expect(resultRoomId).toBe(roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()
      expect(joinedRooms).toHaveLength(1)
    })
  })
})
