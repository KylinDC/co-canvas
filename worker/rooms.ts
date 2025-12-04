import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'

import * as schema from './db/schema'
import { rooms, userRooms } from './db/schema.ts'

const getDB = (env: Env) => drizzle(env.DB, { schema })

export const createRoom = async (env: Env, name: string, userId: string) => {
  const newRoomId = uuidv7()
  const doId = env.ROOM_DO.idFromName(newRoomId)
  const doIdString = doId.toString()

  return getDB(env)
    .insert(rooms)
    .values({
      id: newRoomId,
      name,
      hostId: userId,
      doId: doIdString,
    })
    .returning({ id: rooms.id })
}

export const joinRoom = async (env: Env, userId: string, roomId: string) => {
  const existed = await getDB(env).query.userRooms.findFirst({
    where: and(eq(userRooms.roomId, roomId), eq(userRooms.userId, userId)),
  })

  if (existed) {
    return { roomId: existed.roomId }
  }

  return getDB(env)
    .insert(userRooms)
    .values({
      id: uuidv7(),
      userId,
      roomId,
    })
    .returning({ roomId: userRooms.roomId })
}

export const getRoomWithUserId = async (
  env: Env,
  userId: string,
  onlyOpenRoom = false
) => {
  const data = await getDB(env)
    .select({
      roomId: rooms.id,
      roomName: rooms.name,
      hostId: rooms.hostId,
      isOpen: rooms.isOpen,
    })
    .from(userRooms)
    .leftJoin(rooms, eq(userRooms.roomId, rooms.id))
    .where(eq(userRooms.userId, userId))

  return onlyOpenRoom ? data.filter((room) => room.isOpen) : data
}

export const getRoom = async (env: Env, id: string) => {
  return getDB(env).query.rooms.findFirst({
    where: eq(rooms.id, id),
  })
}

export const leaveRoom = async (env: Env, userId: string, roomId: string) => {
  return getDB(env)
    .delete(userRooms)
    .where(and(eq(userRooms.roomId, roomId), eq(userRooms.userId, userId)))
}

export const closeRoom = async (env: Env, roomId: string) => {
  return getDB(env)
    .update(rooms)
    .set({
      isOpen: false,
    })
    .where(eq(rooms.id, roomId))
}
