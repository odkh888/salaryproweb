import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["expense", "income"] }).notNull(),
  icon: text("icon").notNull().default("Tag"),
  color: text("color").notNull().default("#3b82f6"),
  monthlyBudget: real("monthly_budget"),
  createdAt: text("created_at").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["card", "cash", "bank", "savings"] }).notNull().default("card"),
  initialBalance: real("initial_balance").notNull().default(0),
  color: text("color").notNull().default("#6366f1"),
  createdAt: text("created_at").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["expense", "income", "transfer"] }).notNull(),
  amount: real("amount").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: text("to_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const recurringPayments = sqliteTable("recurring_payments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  frequency: text("frequency", { enum: ["monthly", "yearly", "weekly"] }).notNull().default("monthly"),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  nextPaymentDate: text("next_payment_date").notNull(), // Format: YYYY-MM-DD
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type RecurringPayment = typeof recurringPayments.$inferSelect;
export type NewRecurringPayment = typeof recurringPayments.$inferInsert;
