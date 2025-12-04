import { and, eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'

import type * as schema from '../db/schema'
import { rooms, userRooms } from '../db/schema'

type Database = DrizzleD1Database<typeof schema>

export class RoomRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  async createRoom(name: string, userId: string, doId: string) {
    const newRoomId = uuidv7()

    return this.db
      .insert(rooms)
      .values({
        id: newRoomId,
        name,
        hostId: userId,
        doId,
      })
      .returning({ id: rooms.id })
  }

  async findRoomById(id: string) {
    return this.db.query.rooms.findFirst({
      where: eq(rooms.id, id),
    })
  }

  async updateRoomStatus(roomId: string, isOpen: boolean) {
    return this.db.update(rooms).set({ isOpen }).where(eq(rooms.id, roomId))
  }

  async findUserRoom(userId: string, roomId: string) {
    return this.db.query.userRooms.findFirst({
      where: and(eq(userRooms.roomId, roomId), eq(userRooms.userId, userId)),
    })
  }

  async createUserRoom(userId: string, roomId: string) {
    return this.db
      .insert(userRooms)
      .values({
        id: uuidv7(),
        userId,
        roomId,
      })
      .returning({ roomId: userRooms.roomId })
  }

  async findRoomsByUserId(userId: string) {
    return this.db
      .select({
        roomId: rooms.id,
        roomName: rooms.name,
        hostId: rooms.hostId,
        isOpen: rooms.isOpen,
      })
      .from(userRooms)
      .leftJoin(rooms, eq(userRooms.roomId, rooms.id))
      .where(eq(userRooms.userId, userId))
  }

  async deleteUserRoom(userId: string, roomId: string) {
    return this.db
      .delete(userRooms)
      .where(and(eq(userRooms.roomId, roomId), eq(userRooms.userId, userId)))
  }
}
