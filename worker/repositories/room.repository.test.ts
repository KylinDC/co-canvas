import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'
import { beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../db/schema'
import { rooms, userRooms } from '../db/schema'
import { cleanUpDatabase } from '../test-helpers'
import { RoomRepository } from './room.repository'

describe('RoomRepository', () => {
  let repository: RoomRepository

  beforeEach(async () => {
    await cleanUpDatabase()
    const db = drizzle(env.DB, { schema })
    repository = new RoomRepository(db)
  })

  describe('createRoom', () => {
    it('should create a new room with valid name', async () => {
      const roomName = 'Test Room'
      const userId = uuidv7()
      const doId = 'test-do-id'

      const result = await repository.createRoom(roomName, userId, doId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBeDefined()
      expect(typeof result[0].id).toBe('string')

      const db = drizzle(env.DB)
      const createdRooms = await db.select().from(rooms).all()
      expect(createdRooms).toHaveLength(1)
      expect(createdRooms[0].name).toBe(roomName)
      expect(createdRooms[0].hostId).toBe(userId)
      expect(createdRooms[0].doId).toBe(doId)
    })

    it('should create unique IDs for different rooms', async () => {
      const userId1 = uuidv7()
      const userId2 = uuidv7()
      const room1 = await repository.createRoom('Room 1', userId1, 'do-1')
      const room2 = await repository.createRoom('Room 2', userId2, 'do-2')

      expect(room1[0].id).not.toBe(room2[0].id)
    })
  })

  describe('findRoomById', () => {
    it('should find a room by ID', async () => {
      const roomName = 'Test Room'
      const userId = uuidv7()
      const doId = 'test-do-id'

      const created = await repository.createRoom(roomName, userId, doId)
      const roomId = created[0].id

      const room = await repository.findRoomById(roomId)

      expect(room).toBeDefined()
      expect(room?.id).toBe(roomId)
      expect(room?.name).toBe(roomName)
      expect(room?.hostId).toBe(userId)
    })

    it('should return undefined for non-existent room', async () => {
      const nonExistentId = uuidv7()
      const room = await repository.findRoomById(nonExistentId)

      expect(room).toBeUndefined()
    })
  })

  describe('createUserRoom', () => {
    it('should add user to room', async () => {
      const hostId = uuidv7()
      const room = await repository.createRoom('Test Room', hostId, 'do-id')
      const roomId = room[0].id
      const userId = uuidv7()

      const result = await repository.createUserRoom(userId, roomId)

      expect(result).toHaveLength(1)
      expect(result[0].roomId).toBe(roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()
      expect(joinedRooms).toHaveLength(1)
      expect(joinedRooms[0].userId).toBe(userId)
      expect(joinedRooms[0].roomId).toBe(roomId)
    })

    it('should allow multiple users to join the same room', async () => {
      const hostId = uuidv7()
      const room = await repository.createRoom('Test Room', hostId, 'do-id')
      const roomId = room[0].id
      const userId1 = uuidv7()
      const userId2 = uuidv7()

      await repository.createUserRoom(userId1, roomId)
      await repository.createUserRoom(userId2, roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()

      expect(joinedRooms).toHaveLength(2)
      expect(joinedRooms[0].id).not.toBe(joinedRooms[1].id)
    })
  })

  describe('findUserRoom', () => {
    it('should find existing user-room association', async () => {
      const hostId = uuidv7()
      const room = await repository.createRoom('Test Room', hostId, 'do-id')
      const roomId = room[0].id
      const userId = uuidv7()

      await repository.createUserRoom(userId, roomId)
      const userRoom = await repository.findUserRoom(userId, roomId)

      expect(userRoom).toBeDefined()
      expect(userRoom?.userId).toBe(userId)
      expect(userRoom?.roomId).toBe(roomId)
    })

    it('should return undefined for non-existent association', async () => {
      const userId = uuidv7()
      const roomId = uuidv7()

      const userRoom = await repository.findUserRoom(userId, roomId)

      expect(userRoom).toBeUndefined()
    })
  })

  describe('findRoomsByUserId', () => {
    it('should find all rooms for a user', async () => {
      const userId = uuidv7()
      const room1 = await repository.createRoom('Room 1', userId, 'do-1')
      const room2 = await repository.createRoom('Room 2', userId, 'do-2')

      await repository.createUserRoom(userId, room1[0].id)
      await repository.createUserRoom(userId, room2[0].id)

      const rooms = await repository.findRoomsByUserId(userId)

      expect(rooms).toHaveLength(2)
      expect(rooms.map((r) => r.roomId)).toContain(room1[0].id)
      expect(rooms.map((r) => r.roomId)).toContain(room2[0].id)
    })

    it('should return empty array for user with no rooms', async () => {
      const userId = uuidv7()
      const rooms = await repository.findRoomsByUserId(userId)

      expect(rooms).toHaveLength(0)
    })
  })

  describe('updateRoomStatus', () => {
    it('should update room status to closed', async () => {
      const userId = uuidv7()
      const room = await repository.createRoom('Test Room', userId, 'do-id')
      const roomId = room[0].id

      await repository.updateRoomStatus(roomId, false)

      const updatedRoom = await repository.findRoomById(roomId)
      expect(updatedRoom?.isOpen).toBe(false)
    })

    it('should update room status to open', async () => {
      const userId = uuidv7()
      const room = await repository.createRoom('Test Room', userId, 'do-id')
      const roomId = room[0].id

      await repository.updateRoomStatus(roomId, false)
      await repository.updateRoomStatus(roomId, true)

      const updatedRoom = await repository.findRoomById(roomId)
      expect(updatedRoom?.isOpen).toBe(true)
    })
  })

  describe('deleteUserRoom', () => {
    it('should delete user-room association', async () => {
      const hostId = uuidv7()
      const room = await repository.createRoom('Test Room', hostId, 'do-id')
      const roomId = room[0].id
      const userId = uuidv7()

      await repository.createUserRoom(userId, roomId)
      await repository.deleteUserRoom(userId, roomId)

      const db = drizzle(env.DB)
      const joinedRooms = await db.select().from(userRooms).all()
      expect(joinedRooms).toHaveLength(0)
    })
  })
})
