import { pgTable, text, jsonb, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const records = pgTable('records', {
  userId: text('user_id').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.userId, table.key] })]);
