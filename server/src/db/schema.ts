
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: transactionTypeEnum('type').notNull(),
  color: text('color'), // Nullable for optional color coding
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(), // IDR amounts with precision
  description: text('description').notNull(),
  transaction_date: timestamp('transaction_date').notNull(),
  type: transactionTypeEnum('type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  categories: many(categoriesTable),
  transactions: many(transactionsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [categoriesTable.user_id],
    references: [usersTable.id]
  }),
  transactions: many(transactionsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  category: one(categoriesTable, {
    fields: [transactionsTable.category_id],
    references: [categoriesTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  transactions: transactionsTable
};
