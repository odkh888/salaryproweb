import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

let isInitialized = false;

export async function ensureDatabaseInitialized() {
  if (isInitialized) return;

  // Create tables if they do not exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Tag',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      monthly_budget REAL,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'card',
      initial_balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      to_account_id TEXT,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  try {
    await client.execute("ALTER TABLE transactions ADD COLUMN to_account_id TEXT;");
  } catch {
    // column already exists
  }

  try {
    const checkTransferCat = await client.execute("SELECT id FROM categories WHERE id = 'cat-transfer';");
    if (checkTransferCat.rows.length === 0) {
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO categories (id, name, type, icon, color, monthly_budget, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: ['cat-transfer', 'Перевод между счетами', 'expense', 'ArrowLeftRight', '#6366f1', null, now],
      });
    }
  } catch {
    // ignore
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS recurring_payments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      next_payment_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `);

  try {
    const existingRec = await client.execute("SELECT count(*) as count FROM recurring_payments;");
    const recCount = Number(existingRec.rows[0]?.count ?? 0);
    if (recCount === 0) {
      const now = new Date();
      const formatFutureDate = (days: number) => {
        const d = new Date();
        d.setDate(now.getDate() + days);
        return d.toISOString().split("T")[0];
      };
      const nowStr = now.toISOString();

      const sampleSubs = [
        { id: "sub-1", name: "Яндекс Плюс", amount: 399, freq: "monthly", cat: "cat-services", acc: "acc-main", nextDate: formatFutureDate(4) },
        { id: "sub-2", name: "Мобильная связь (МТС)", amount: 650, freq: "monthly", cat: "cat-services", acc: "acc-main", nextDate: formatFutureDate(11) },
        { id: "sub-3", name: "Интернет и ТВ", amount: 850, freq: "monthly", cat: "cat-housing", acc: "acc-main", nextDate: formatFutureDate(19) },
      ];

      for (const s of sampleSubs) {
        await client.execute({
          sql: `INSERT INTO recurring_payments (id, name, amount, frequency, category_id, account_id, next_payment_date, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
          args: [s.id, s.name, s.amount, s.freq, s.cat, s.acc, s.nextDate, nowStr],
        });
      }
    }
  } catch {
    // ignore
  }

  // Check if categories are already seeded
  const existingCategories = await client.execute("SELECT count(*) as count FROM categories;");
  const count = Number(existingCategories.rows[0]?.count ?? 0);

  if (count === 0) {
    const defaultCategories = [
      // Расходы
      { id: "cat-groceries", name: "Продукты", type: "expense", icon: "ShoppingCart", color: "#10b981", monthly_budget: 35000 },
      { id: "cat-cafe", name: "Кафе и рестораны", type: "expense", icon: "Utensils", color: "#f59e0b", monthly_budget: 15000 },
      { id: "cat-housing", name: "Жильё и ЖКХ", type: "expense", icon: "Home", color: "#3b82f6", monthly_budget: 30000 },
      { id: "cat-transport", name: "Транспорт и авто", type: "expense", icon: "Car", color: "#6366f1", monthly_budget: 12000 },
      { id: "cat-health", name: "Здоровье и аптеки", type: "expense", icon: "HeartPulse", color: "#ec4899", monthly_budget: 8000 },
      { id: "cat-fun", name: "Развлечения и отдых", type: "expense", icon: "Gamepad2", color: "#8b5cf6", monthly_budget: 10000 },
      { id: "cat-clothes", name: "Одежда и покупки", type: "expense", icon: "Shirt", color: "#06b6d4", monthly_budget: 15000 },
      { id: "cat-services", name: "Подписки и связь", type: "expense", icon: "Tv", color: "#64748b", monthly_budget: 3500 },
      { id: "cat-other-exp", name: "Прочие расходы", type: "expense", icon: "MoreHorizontal", color: "#94a3b8", monthly_budget: 5000 },

      // Доходы
      { id: "cat-salary", name: "Зарплата", type: "income", icon: "Briefcase", color: "#10b981", monthly_budget: null },
      { id: "cat-bonus", name: "Премии и бонусы", type: "income", icon: "Award", color: "#3b82f6", monthly_budget: null },
      { id: "cat-freelance", name: "Подработка / Фриланс", type: "income", icon: "Laptop", color: "#8b5cf6", monthly_budget: null },
      { id: "cat-invest", name: "Инвестиции / Дивиденды", type: "income", icon: "TrendingUp", color: "#f59e0b", monthly_budget: null },
      { id: "cat-gift", name: "Подарки", type: "income", icon: "Gift", color: "#ec4899", monthly_budget: null },
      { id: "cat-other-inc", name: "Прочий доход", type: "income", icon: "PlusCircle", color: "#64748b", monthly_budget: null },
    ];

    const now = new Date().toISOString();
    for (const cat of defaultCategories) {
      await client.execute({
        sql: `INSERT INTO categories (id, name, type, icon, color, monthly_budget, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.monthly_budget, now],
      });
    }

    // Default accounts
    const defaultAccounts = [
      { id: "acc-main", name: "Основная карта", type: "card", initial_balance: 0, color: "#3b82f6" },
      { id: "acc-cash", name: "Наличные", type: "cash", initial_balance: 0, color: "#10b981" },
      { id: "acc-savings", name: "Накопительный счет", type: "savings", initial_balance: 0, color: "#8b5cf6" },
    ];

    for (const acc of defaultAccounts) {
      await client.execute({
        sql: `INSERT INTO accounts (id, name, type, initial_balance, color, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [acc.id, acc.name, acc.type, acc.initial_balance, acc.color, now],
      });
    }

    // Seed some initial demonstration transactions so dashboards have immediate rich visuals!
    const today = new Date();
    const formatDate = (offsetDays: number) => {
      const d = new Date();
      d.setDate(today.getDate() - offsetDays);
      return d.toISOString().split("T")[0];
    };

    const initialTx = [
      { id: "tx-1", type: "income", amount: 120000, cat: "cat-salary", acc: "acc-main", date: formatDate(25), note: "Зарплата за прошлый период" },
      { id: "tx-2", type: "income", amount: 25000, cat: "cat-freelance", acc: "acc-main", date: formatDate(18), note: "Разработка лендинга" },
      { id: "tx-3", type: "expense", amount: 28500, cat: "cat-housing", acc: "acc-main", date: formatDate(24), note: "Аренда квартиры и коммуналка" },
      { id: "tx-4", type: "expense", amount: 4800, cat: "cat-groceries", acc: "acc-main", date: formatDate(20), note: "Супермаркет на неделю" },
      { id: "tx-5", type: "expense", amount: 2300, cat: "cat-cafe", acc: "acc-main", date: formatDate(16), note: "Ужин с друзьями" },
      { id: "tx-6", type: "expense", amount: 3200, cat: "cat-transport", acc: "acc-main", date: formatDate(14), note: "Заправка автомобиля" },
      { id: "tx-7", type: "expense", amount: 1200, cat: "cat-services", acc: "acc-main", date: formatDate(12), note: "Яндекс Плюс и мобильная связь" },
      { id: "tx-8", type: "expense", amount: 6500, cat: "cat-clothes", acc: "acc-main", date: formatDate(8), note: "Кроссовки" },
      { id: "tx-9", type: "expense", amount: 5300, cat: "cat-groceries", acc: "acc-main", date: formatDate(5), note: "Продукты и бытовая химия" },
      { id: "tx-10", type: "expense", amount: 1800, cat: "cat-health", acc: "acc-main", date: formatDate(3), note: "Витамины в аптеке" },
      { id: "tx-11", type: "expense", amount: 3100, cat: "cat-cafe", acc: "acc-main", date: formatDate(1), note: "Кофейня и обеды" },
      { id: "tx-12", type: "expense", amount: 2500, cat: "cat-fun", acc: "acc-cash", date: formatDate(0), note: "Билеты в кино" },
    ];

    for (const tx of initialTx) {
      await client.execute({
        sql: `INSERT INTO transactions (id, type, amount, category_id, account_id, date, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [tx.id, tx.type, tx.amount, tx.cat, tx.acc, tx.date, tx.note, now],
      });
    }
  }

  isInitialized = true;
}
