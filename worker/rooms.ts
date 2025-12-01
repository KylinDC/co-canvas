import { drizzle } from 'drizzle-orm/d1'
import { v7 as uuidv7 } from 'uuid'

import { rooms, userRooms } from './db/schema.ts'

const getDB = (env: Env) => drizzle(env.DB)

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
    .returning({ id: userRooms.roomId })
}
