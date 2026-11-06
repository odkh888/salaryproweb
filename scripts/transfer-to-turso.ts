import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// Load .env.local natively (supported in Node 20+)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

async function transfer() {
  const remoteUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!remoteUrl || remoteUrl.startsWith("file:")) {
    console.error("\n❌ Ошибка: В .env.local переменная TURSO_DATABASE_URL должна указывать на адрес Turso Cloud (libsql://...)");
    console.error("Пример строки в .env.local:");
    console.error("  TURSO_DATABASE_URL=libsql://salary-tracker-[username].turso.io");
    console.error("  TURSO_AUTH_TOKEN=your-turso-token\n");
    process.exit(1);
  }

  if (!authToken) {
    console.error("\n❌ Ошибка: В .env.local отсутствует переменная TURSO_AUTH_TOKEN.");
    process.exit(1);
  }

  console.log("🚀 Подключение к локальной базе данных (file:local.db)...");
  const localClient = createClient({
    url: "file:local.db",
  });

  console.log(`🌐 Подключение к облаку Turso (${remoteUrl})...`);
  const remoteClient = createClient({
    url: remoteUrl,
    authToken: authToken,
  });

  // 1. Создание схемы в облачной базе данных
  console.log("📦 Создание таблиц в облачной базе данных...");
  await remoteClient.execute(`
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

  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'card',
      initial_balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL
    );
  `);

  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Чтение данных из local.db
  console.log("📥 Выгрузка данных из local.db...");
  const categoriesRes = await localClient.execute("SELECT * FROM categories;");
  const accountsRes = await localClient.execute("SELECT * FROM accounts;");
  const transactionsRes = await localClient.execute("SELECT * FROM transactions;");

  console.log(`Найдено в local.db: ${categoriesRes.rows.length} категорий, ${accountsRes.rows.length} счетов, ${transactionsRes.rows.length} операций.`);

  // 3. Перенос категорий
  console.log("📤 Перенос категорий в Turso Cloud...");
  for (const cat of categoriesRes.rows) {
    await remoteClient.execute({
      sql: `INSERT OR REPLACE INTO categories (id, name, type, icon, color, monthly_budget, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.monthly_budget, cat.created_at],
    });
  }

  // 4. Перенос счетов
  console.log("📤 Перенос счетов в Turso Cloud...");
  for (const acc of accountsRes.rows) {
    await remoteClient.execute({
      sql: `INSERT OR REPLACE INTO accounts (id, name, type, initial_balance, color, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [acc.id, acc.name, acc.type, acc.initial_balance, acc.color, acc.created_at],
    });
  }

  // 5. Перенос транзакций
  console.log("📤 Перенос операций в Turso Cloud...");
  for (const tx of transactionsRes.rows) {
    await remoteClient.execute({
      sql: `INSERT OR REPLACE INTO transactions (id, type, amount, category_id, account_id, date, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [tx.id, tx.type, tx.amount, tx.category_id, tx.account_id, tx.date, tx.note, tx.created_at],
    });
  }

  // 6. Проверка результата
  const checkRemote = await remoteClient.execute("SELECT count(*) as count FROM transactions;");
  console.log(`\n✅ УСПЕХ! Все данные перенесены в Turso Cloud.`);
  console.log(`Всего операций в удалённой базе: ${checkRemote.rows[0]?.count}`);
  console.log(`Теперь трекер работает с облачной базой Turso! 🎉`);
}

transfer().catch((err) => {
  console.error("\n❌ Ошибка при переносе:", err);
  process.exit(1);
});
