import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'

import { rooms, userRooms } from './db/schema.ts'

export const cleanUpDatabase = async () => {
  const db = drizzle(env.DB)
  await db.delete(userRooms)
  await db.delete(rooms)
}
