import { z } from 'zod'

export const createRoomReq = z.object({
  userId: z.uuidv7(),
  name: z.string(),
})

export const getRoomWithUserIdReq = z.object({
  userId: z.uuidv7(),
})

export const joinRoomReq = z.object({
  userId: z.uuidv7(),
})
