import { z } from 'zod'

export const createRoomReq = z.object({
  userId: z.uuidv7(),
  name: z.string(),
})
export type CreateRoomReq = z.input<typeof createRoomReq>

export const getRoomWithUserIdReq = z.object({
  userId: z.uuidv7(),
})
