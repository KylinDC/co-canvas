import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hostId: text('host_id').notNull(),
  doId: text('do_id').notNull(),
  isOpen: integer('is_open', { mode: 'boolean' }).default(true),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(new Date())
    .$onUpdate(() => new Date()),
})

export const userRooms = sqliteTable(
  'user_rooms',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    roomId: text('room_id').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(new Date())
      .$onUpdate(() => new Date()),
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
