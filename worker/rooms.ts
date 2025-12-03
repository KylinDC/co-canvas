import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'

import * as schema from './db/schema'
import { rooms, userRooms } from './db/schema.ts'

const getDB = (env: Env) => drizzle(env.DB, { schema })

export const createRoom = async (env: Env, name: string) => {
  const newRoomId = uuidv7()
  const doId = env.ROOM_DO.idFromName(newRoomId)
  const doIdString = doId.toString()

  return getDB(env)
    .insert(rooms)
    .values({
      id: newRoomId,
      name,
      doId: doIdString,
    })
    .returning({ id: rooms.id })
}

export const joinRoom = async (
  env: Env,
  userId: string,
  roomId: string,
  asHost = false
) => {
  return getDB(env)
    .insert(userRooms)
    .values({
      id: uuidv7(),
      userId,
      roomId,
      isHost: asHost,
    })
    .onConflictDoUpdate({
      target: userRooms.userId,
      set: { updatedAt: sql.raw(`CURRENT_TIMESTAMP`) },
    })
    .returning({ id: userRooms.roomId })
}

export const getRoomWithUserId = async (env: Env, userId: string) => {
  return getDB(env).query.userRooms.findFirst({
    columns: {
      roomId: true,
    },
    where: eq(userRooms.userId, userId),
  })
}

export const getRoom = async (env: Env, id: string) => {
  return getDB(env).query.rooms.findFirst({
    where: eq(rooms.id, id),
  })
}
