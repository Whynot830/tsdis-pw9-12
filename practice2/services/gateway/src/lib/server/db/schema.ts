import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 50 }),
    color: varchar('color', { length: 50 }).notNull(), // CSS color (e.g. #ef4444)
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('categories_user_id_idx').on(table.userId)]
);

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .references(() => categories.id, { onDelete: 'restrict' })
      .notNull(),
    amount: integer('amount').notNull(), // kopecks
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_category_id_idx').on(table.categoryId),
    index('transactions_created_at_idx').on(table.createdAt)
  ]
);

/** Настройки уведомлений (Telegram chat id). */
export const userNotificationSettings = pgTable('user_notification_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  telegramChatId: varchar('telegram_chat_id', { length: 32 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/** Лимит расходов за календарный месяц по категории (копейки). */
export const budgetLimits = pgTable(
  'budget_limits',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    yearMonth: varchar('year_month', { length: 7 }).notNull(),
    amountLimitKopecks: integer('amount_limit_kopecks').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('budget_limits_user_ym_idx').on(table.userId, table.yearMonth),
    uniqueIndex('budget_limits_user_ym_category_uidx').on(table.userId, table.yearMonth, table.categoryId)
  ]
);

/** Журнал отправленных алертов (идемпотентность). */
export const budgetAlertLog = pgTable(
  'budget_alert_log',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    yearMonth: varchar('year_month', { length: 7 }).notNull(),
    alertType: varchar('alert_type', { length: 32 }).notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('budget_alert_log_dedup_uidx').on(
      table.userId,
      table.categoryId,
      table.yearMonth,
      table.alertType
    )
  ]
);
