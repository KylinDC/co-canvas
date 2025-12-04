import { env } from 'cloudflare:test'
import { v7 as uuidv7 } from 'uuid'
import { beforeEach, describe, expect, it } from 'vitest'

import { cleanUpDatabase } from '../test-helpers'
import { RoomService } from './room.service'

describe('RoomService', () => {
  let service: RoomService

  beforeEach(async () => {
    await cleanUpDatabase()
    service = new RoomService(env)
  })

  describe('createRoom', () => {
    it('should create a new room', async () => {
      const roomName = 'Test Room'
      const userId = uuidv7()

      const result = await service.createRoom(roomName, userId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBeDefined()
      expect(typeof result[0].id).toBe('string')
    })
  })

  describe('getRoom', () => {
    it('should get a room by ID', async () => {
      const roomName = 'Test Room'
      const userId = uuidv7()
      const created = await service.createRoom(roomName, userId)
      const roomId = created[0].id

      const room = await service.getRoom(roomId)

      expect(room).toBeDefined()
      expect(room?.id).toBe(roomId)
      expect(room?.name).toBe(roomName)
    })

    it('should return undefined for non-existent room', async () => {
      const nonExistentId = uuidv7()
      const room = await service.getRoom(nonExistentId)

      expect(room).toBeUndefined()
    })
  })

  describe('getRoomsByUserId', () => {
    it('should get all rooms for a user', async () => {
      const userId = uuidv7()
      const room1 = await service.createRoom('Room 1', userId)
      const room2 = await service.createRoom('Room 2', userId)

      await service.joinRoom(userId, room1[0].id)
      await service.closeRoom(userId, room1[0].id)
      await service.joinRoom(userId, room2[0].id)

      const rooms = await service.getRoomsByUserId(userId)

      expect(rooms).toHaveLength(2)
    })

    it('should filter only open rooms when requested', async () => {
      const userId = uuidv7()
      const room1 = await service.createRoom('Room 1', userId)
      const room2 = await service.createRoom('Room 2', userId)

      await service.joinRoom(userId, room1[0].id)
      await service.closeRoom(userId, room1[0].id)
      await service.joinRoom(userId, room2[0].id)

      const openRooms = await service.getRoomsByUserId(userId, true)

      expect(openRooms).toHaveLength(1)
      expect(openRooms[0].roomId).toBe(room2[0].id)
    })
  })

  describe('joinRoom', () => {
    it('should allow user to join an existing room', async () => {
      const hostId = uuidv7()
      const guestId = uuidv7()
      const room = await service.createRoom('Test Room', hostId)
      const roomId = room[0].id

      const result = await service.joinRoom(guestId, roomId)

      expect(result.roomId).toBe(roomId)
    })

    it('should return existing room if user already joined', async () => {
      const userId = uuidv7()
      const room = await service.createRoom('Test Room', userId)
      const roomId = room[0].id

      await service.joinRoom(userId, roomId)
      const result = await service.joinRoom(userId, roomId)

      expect(result.roomId).toBe(roomId)
    })

    it('should throw error if room does not exist', async () => {
      const userId = uuidv7()
      const nonExistentRoomId = uuidv7()

      await expect(service.joinRoom(userId, nonExistentRoomId)).rejects.toThrow(
        'Room not found'
      )
    })

    it('should throw error if user already in another open room', async () => {
      const userId = uuidv7()
      const hostId = uuidv7()
      const room1 = await service.createRoom('Room 1', userId)
      const room2 = await service.createRoom('Room 2', hostId)

      await service.joinRoom(userId, room1[0].id)

      await expect(service.joinRoom(userId, room2[0].id)).rejects.toThrow(
        'User already joined another open room'
      )
    })

    it('should throw error if room is closed and user is not a member', async () => {
      const hostId = uuidv7()
      const guestId = uuidv7()
      const room = await service.createRoom('Test Room', hostId)
      const roomId = room[0].id

      await service.joinRoom(hostId, roomId)
      await service.closeRoom(hostId, roomId)

      await expect(service.joinRoom(guestId, roomId)).rejects.toThrow(
        'Room has been closed'
      )
    })

    it('should allow existing member to rejoin a closed room', async () => {
      const hostId = uuidv7()
      const memberId = uuidv7()
      const room = await service.createRoom('Test Room', hostId)
      const roomId = room[0].id

      await service.joinRoom(hostId, roomId)
      await service.joinRoom(memberId, roomId)
      await service.closeRoom(hostId, roomId)

      const result = await service.joinRoom(memberId, roomId)

      expect(result.roomId).toBe(roomId)
    })
  })

  describe('leaveRoom', () => {
    it('should allow user to leave a room', async () => {
      const hostId = uuidv7()
      const guestId = uuidv7()
      const room = await service.createRoom('Test Room', hostId)
      const roomId = room[0].id

      await service.joinRoom(guestId, roomId)
      await service.leaveRoom(guestId, roomId)

      const rooms = await service.getRoomsByUserId(guestId)
      expect(rooms).toHaveLength(0)
    })

    it('should throw error if room does not exist', async () => {
      const userId = uuidv7()
      const nonExistentRoomId = uuidv7()

      await expect(
        service.leaveRoom(userId, nonExistentRoomId)
      ).rejects.toThrow('Room not found')
    })
  })

  describe('closeRoom', () => {
    it('should allow host to close a room', async () => {
      const hostId = uuidv7()
      const room = await service.createRoom('Test Room', hostId)
      const roomId = room[0].id

      await service.joinRoom(hostId, roomId)
      await service.closeRoom(hostId, roomId)

      const closedRoom = await service.getRoom(roomId)
      expect(closedRoom?.isOpen).toBe(false)
    })

    it('should throw error if room does not exist', async () => {
      const userId = uuidv7()
      const nonExistentRoomId = uuidv7()

      await expect(
        service.closeRoom(userId, nonExistentRoomId)
      ).rejects.toThrow('Room not found')
    })

    it('should throw error if user is not the host', async () => {
      const hostId = uuidv7()
      const guestId = uuidv7()
      const room = await service.createRoom('Test Room', hostId)
      const roomId = room[0].id

      await service.joinRoom(hostId, roomId)
      await service.joinRoom(guestId, roomId)

      await expect(service.closeRoom(guestId, roomId)).rejects.toThrow(
        'Only host can close room'
      )
    })
  })
})
