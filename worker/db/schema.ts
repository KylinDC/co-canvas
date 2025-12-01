import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name'),
  doId: text('do_id'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
})

export const userRooms = sqliteTable(
  'user_rooms',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().unique(),
    roomId: text('room_id').notNull(),
    isHost: integer('is_host', { mode: 'boolean' }).default(false).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('idx_user_room_id').on(table.roomId),
    index('idx_user_updated_at').on(table.updatedAt),
  ]
)

export type rRoom = typeof rooms.$inferSelect
export type InsertRoom = typeof rooms.$inferInsert

export type UserRoom = typeof userRooms.$inferSelect
export type InsertUserRoom = typeof userRooms.$inferInsert
