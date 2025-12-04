import { drizzle } from 'drizzle-orm/d1'

import * as schema from '../db/schema'
import { RoomRepository } from '../repositories/room.repository'

export class RoomService {
  private readonly repository: RoomRepository
  private readonly env: Env

  constructor(env: Env) {
    this.env = env
    const db = drizzle(env.DB, { schema })
    this.repository = new RoomRepository(db)
  }

  async createRoom(name: string, userId: string) {
    const doId = this.env.ROOM_DO.idFromName(name)
    const doIdString = doId.toString()

    return this.repository.createRoom(name, userId, doIdString)
  }

  async getRoom(roomId: string) {
    return this.repository.findRoomById(roomId)
  }

  async getRoomsByUserId(userId: string, onlyOpenRooms = false) {
    const rooms = await this.repository.findRoomsByUserId(userId)

    if (onlyOpenRooms) {
      return rooms.filter((room) => room.isOpen)
    }

    return rooms
  }

  async joinRoom(userId: string, roomId: string) {
    // Check if user already in room
    const existingUserRoom = await this.repository.findUserRoom(userId, roomId)

    if (existingUserRoom) {
      return { roomId: existingUserRoom.roomId }
    }

    // Check if room exists
    const room = await this.repository.findRoomById(roomId)
    if (!room) {
      throw new Error('Room not found')
    }

    // Check if user is already in another open room
    const userRooms = await this.repository.findRoomsByUserId(userId)
    const openUserRooms = userRooms.filter((ur) => ur.isOpen)

    if (openUserRooms.length > 0 && openUserRooms[0].roomId !== roomId) {
      throw new Error(
        `User already joined another open room with roomId: ${openUserRooms[0].roomId}`
      )
    }

    // Check if room is closed and user is not already a member
    const isExistingMember = userRooms.some((ur) => ur.roomId === roomId)
    if (!room.isOpen && !isExistingMember) {
      throw new Error('Room has been closed')
    }

    // Join the room
    const result = await this.repository.createUserRoom(userId, roomId)
    return Array.isArray(result) ? result[0] : result
  }

  async leaveRoom(userId: string, roomId: string) {
    // Check if room exists
    const room = await this.repository.findRoomById(roomId)
    if (!room) {
      throw new Error('Room not found')
    }

    return this.repository.deleteUserRoom(userId, roomId)
  }

  async closeRoom(userId: string, roomId: string) {
    // Check if room exists
    const room = await this.repository.findRoomById(roomId)
    if (!room) {
      throw new Error('Room not found')
    }

    // Check if user is the host
    if (room.hostId !== userId) {
      throw new Error('Only host can close room')
    }

    // Update room status
    await this.repository.updateRoomStatus(roomId, false)

    // Note: Broadcasting to Durable Object is handled at the route layer
    // to properly use ExecutionContext.waitUntil
    return room
  }
}
