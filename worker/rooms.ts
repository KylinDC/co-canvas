import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'
import * as schema from './db/schema'

import { rooms, userRooms } from './db/schema.ts'
import { and, eq } from 'drizzle-orm'

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
  const userRoom = await getDB(env).query.userRooms.findFirst({
    where: and(eq(userRooms.userId, userId), eq(userRooms.roomId, roomId)),
  })
  if (userRoom) {
    return [{ id: userRoom.roomId }]
  }

  return getDB(env)
    .insert(userRooms)
    .values({
      id: uuidv7(),
      userId,
      roomId,
      isHost: asHost,
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
