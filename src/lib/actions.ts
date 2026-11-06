"use server";

import { revalidatePath } from "next/cache";
import { db, ensureDatabaseInitialized, client } from "./db";
import { transactions, categories, accounts, recurringPayments, Category, Account, Transaction, RecurringPayment } from "./db/schema";
import { eq, desc, and, gte, lte, or, sql } from "drizzle-orm";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback outside Next.js request context
  }
}

export type TransactionWithDetails = Transaction & {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName: string;
  accountColor: string;
  toAccountName?: string | null;
  toAccountColor?: string | null;
};

// ----------------- TRANSACTIONS -----------------

export async function getTransactions(filters?: {
  type?: "expense" | "income" | "transfer" | "all";
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<TransactionWithDetails[]> {
  await ensureDatabaseInitialized();

  // Query all accounts map for quick lookup of destination accounts (for transfers)
  const allAccountsList = await db.select().from(accounts);
  const accountMap = new Map(allAccountsList.map((a) => [a.id, a]));

  let query = db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      accountId: transactions.accountId,
      toAccountId: transactions.toAccountId,
      date: transactions.date,
      note: transactions.note,
      createdAt: transactions.createdAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      accountName: accounts.name,
      accountColor: accounts.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const conditions = [];

  if (filters?.type && filters.type !== "all") {
    conditions.push(eq(transactions.type, filters.type));
  }
  if (filters?.categoryId && filters.categoryId !== "all") {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters?.accountId && filters.accountId !== "all") {
    conditions.push(
      or(
        eq(transactions.accountId, filters.accountId),
        eq(transactions.toAccountId, filters.accountId)
      )
    );
  }
  if (filters?.startDate) {
    conditions.push(gte(transactions.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(transactions.date, filters.endDate));
  }

  const rawResults = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  // Enrich with toAccountName & toAccountColor
  const results: TransactionWithDetails[] = rawResults.map((tx) => {
    const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
    return {
      ...tx,
      toAccountName: toAcc?.name || null,
      toAccountColor: toAcc?.color || null,
    };
  });

  if (filters?.search && filters.search.trim()) {
    const s = filters.search.toLowerCase().trim();
    return results.filter(
      (tx) =>
        tx.note?.toLowerCase().includes(s) ||
        tx.categoryName.toLowerCase().includes(s) ||
        tx.accountName.toLowerCase().includes(s) ||
        (tx.toAccountName && tx.toAccountName.toLowerCase().includes(s)) ||
        tx.amount.toString().includes(s)
    );
  }

  return results;
}

export async function createTransaction(data: {
  type: "expense" | "income" | "transfer";
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string | null;
  date: string;
  note?: string;
}) {
  await ensureDatabaseInitialized();

  const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await db.insert(transactions).values({
    id,
    type: data.type,
    amount: Math.abs(Number(data.amount)),
    categoryId: data.categoryId,
    accountId: data.accountId,
    toAccountId: data.toAccountId || null,
    date: data.date,
    note: data.note?.trim() || null,
    createdAt: now,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/transactions");
  safeRevalidatePath("/accounts");
  return { success: true, id };
}

export async function updateTransaction(
  id: string,
  data: {
    type: "expense" | "income" | "transfer";
    amount: number;
    categoryId: string;
    accountId: string;
    toAccountId?: string | null;
    date: string;
    note?: string;
  }
) {
  await ensureDatabaseInitialized();

  await db
    .update(transactions)
    .set({
      type: data.type,
      amount: Math.abs(Number(data.amount)),
      categoryId: data.categoryId,
      accountId: data.accountId,
      toAccountId: data.toAccountId || null,
      date: data.date,
      note: data.note?.trim() || null,
    })
    .where(eq(transactions.id, id));

  safeRevalidatePath("/");
  safeRevalidatePath("/transactions");
  safeRevalidatePath("/accounts");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  await ensureDatabaseInitialized();

  await db.delete(transactions).where(eq(transactions.id, id));

  safeRevalidatePath("/");
  safeRevalidatePath("/transactions");
  safeRevalidatePath("/accounts");
  return { success: true };
}

// ----------------- CATEGORIES -----------------

export async function getCategories(type?: "expense" | "income"): Promise<Category[]> {
  await ensureDatabaseInitialized();

  if (type) {
    return await db.select().from(categories).where(eq(categories.type, type)).orderBy(categories.name);
  }
  return await db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(data: {
  name: string;
  type: "expense" | "income";
  icon?: string;
  color?: string;
  monthlyBudget?: number | null;
}) {
  await ensureDatabaseInitialized();

  const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await db.insert(categories).values({
    id,
    name: data.name.trim(),
    type: data.type,
    icon: data.icon || (data.type === "expense" ? "ShoppingCart" : "Briefcase"),
    color: data.color || (data.type === "expense" ? "#ef4444" : "#10b981"),
    monthlyBudget: data.monthlyBudget ? Number(data.monthlyBudget) : null,
    createdAt: now,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/categories");
  return { success: true, id };
}

export async function updateCategory(
  id: string,
  data: {
    name: string;
    icon?: string;
    color?: string;
    monthlyBudget?: number | null;
  }
) {
  await ensureDatabaseInitialized();

  await db
    .update(categories)
    .set({
      name: data.name.trim(),
      icon: data.icon,
      color: data.color,
      monthlyBudget: data.monthlyBudget ? Number(data.monthlyBudget) : null,
    })
    .where(eq(categories.id, id));

  safeRevalidatePath("/");
  safeRevalidatePath("/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  await ensureDatabaseInitialized();

  await db.delete(categories).where(eq(categories.id, id));

  safeRevalidatePath("/");
  safeRevalidatePath("/categories");
  return { success: true };
}

// ----------------- ACCOUNTS -----------------

export async function getAccounts(): Promise<Account[]> {
  await ensureDatabaseInitialized();
  return await db.select().from(accounts).orderBy(accounts.name);
}

export type AccountWithBalance = Account & {
  currentBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  transactionsCount: number;
};

export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  await ensureDatabaseInitialized();
  const allAccounts = await db.select().from(accounts).orderBy(accounts.name);
  const allTx = await db.select().from(transactions);

  return allAccounts.map((acc) => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let count = 0;

    for (const tx of allTx) {
      if (tx.accountId === acc.id) {
        count++;
        if (tx.type === "income") incomeTotal += tx.amount;
        if (tx.type === "expense") expenseTotal += tx.amount;
        if (tx.type === "transfer") expenseTotal += tx.amount; // списание со счёта
      }
      if (tx.type === "transfer" && tx.toAccountId === acc.id) {
        count++;
        incomeTotal += tx.amount; // поступление на счёт
      }
    }

    const currentBalance = acc.initialBalance + incomeTotal - expenseTotal;
    return {
      ...acc,
      currentBalance,
      incomeTotal,
      expenseTotal,
      transactionsCount: count,
    };
  });
}

export async function createAccount(data: {
  name: string;
  type: "card" | "cash" | "bank" | "savings";
  initialBalance?: number;
  color?: string;
}) {
  await ensureDatabaseInitialized();

  const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await db.insert(accounts).values({
    id,
    name: data.name.trim(),
    type: data.type,
    initialBalance: data.initialBalance ? Number(data.initialBalance) : 0,
    color: data.color || "#6366f1",
    createdAt: now,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/accounts");
  return { success: true, id };
}

export async function updateAccount(
  id: string,
  data: {
    name: string;
    type: "card" | "cash" | "bank" | "savings";
    initialBalance?: number;
    color?: string;
  }
) {
  await ensureDatabaseInitialized();

  await db
    .update(accounts)
    .set({
      name: data.name.trim(),
      type: data.type,
      initialBalance: data.initialBalance !== undefined ? Number(data.initialBalance) : 0,
      color: data.color || "#6366f1",
    })
    .where(eq(accounts.id, id));

  safeRevalidatePath("/");
  safeRevalidatePath("/accounts");
  safeRevalidatePath("/transactions");
  return { success: true };
}

export async function deleteAccount(id: string) {
  await ensureDatabaseInitialized();

  await db.delete(accounts).where(eq(accounts.id, id));

  safeRevalidatePath("/");
  safeRevalidatePath("/accounts");
  safeRevalidatePath("/transactions");
  return { success: true };
}

export async function createTransfer(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note?: string;
}) {
  return createTransaction({
    type: "transfer",
    amount: data.amount,
    categoryId: "cat-transfer",
    accountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    date: data.date,
    note: data.note,
  });
}

// ----------------- ANALYTICS & DASHBOARD -----------------

export type CategoryExpenseBreakdown = {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
  budget: number | null;
  budgetPercent: number | null;
  isOverBudget: boolean;
};

export type MonthlyTrend = {
  key: string;      // YYYY-MM
  label: string;    // e.g. "Май 2026"
  income: number;
  expense: number;
  savings: number;
};

export type DashboardSummary = {
  currentTotalBalance: number;
  periodIncome: number;
  periodExpense: number;
  periodSavings: number;
  savingsRate: number;
  categoryBreakdown: CategoryExpenseBreakdown[];
  monthlyTrends: MonthlyTrend[];
  recentTransactions: TransactionWithDetails[];
};

export async function getDashboardData(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<DashboardSummary> {
  await ensureDatabaseInitialized();

  // 1. Calculate overall total balance across all time
  const accountsWithBal = await getAccountsWithBalances();
  const currentTotalBalance = accountsWithBal.reduce((sum, a) => sum + a.currentBalance, 0);

  // 2. Filter transactions for the requested period
  let { startDate, endDate } = options || {};
  if (!startDate || !endDate) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startDate = firstDay.toISOString().split("T")[0];
    endDate = lastDay.toISOString().split("T")[0];
  }

  const periodTx = await getTransactions({ startDate, endDate });

  let periodIncome = 0;
  let periodExpense = 0;

  for (const tx of periodTx) {
    // Transfers are excluded from income and expenses!
    if (tx.type === "income") {
      periodIncome += tx.amount;
    } else if (tx.type === "expense") {
      periodExpense += tx.amount;
    }
  }

  const periodSavings = periodIncome - periodExpense;
  const savingsRate = periodIncome > 0 ? Math.round((periodSavings / periodIncome) * 100) : 0;

  // 3. Category Breakdown for Expenses in this period
  const allCats = await db.select().from(categories);
  const expenseMap = new Map<string, number>();

  for (const tx of periodTx) {
    if (tx.type === "expense") {
      const current = expenseMap.get(tx.categoryId) || 0;
      expenseMap.set(tx.categoryId, current + tx.amount);
    }
  }

  const categoryBreakdown: CategoryExpenseBreakdown[] = allCats
    .filter((c) => c.type === "expense" && c.id !== "cat-transfer")
    .map((c) => {
      const total = expenseMap.get(c.id) || 0;
      const percentage = periodExpense > 0 ? Math.round((total / periodExpense) * 100) : 0;
      const budget = c.monthlyBudget || null;
      const budgetPercent = budget ? Math.round((total / budget) * 100) : null;
      const isOverBudget = budget ? total > budget : false;

      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        total,
        percentage,
        budget,
        budgetPercent,
        isOverBudget,
      };
    })
    .filter((item) => item.total > 0 || (item.budget !== null && item.budget > 0))
    .sort((a, b) => b.total - a.total);

  // 4. Monthly Trends (last 6 months)
  const monthNames = [
    "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
  ];

  const trendsMap = new Map<string, { income: number; expense: number }>();

  // Determine last 6 months keys
  const monthsList: { key: string; label: string }[] = [];
  const currentDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;
    const label = `${monthNames[d.getMonth()]} ${y}`;
    monthsList.push({ key, label });
    trendsMap.set(key, { income: 0, expense: 0 });
  }

  const allTx = await db.select().from(transactions);
  for (const tx of allTx) {
    const txMonth = tx.date.substring(0, 7);
    if (trendsMap.has(txMonth)) {
      const current = trendsMap.get(txMonth)!;
      if (tx.type === "income") {
        current.income += tx.amount;
      } else if (tx.type === "expense") {
        current.expense += tx.amount;
      }
    }
  }

  const monthlyTrends: MonthlyTrend[] = monthsList.map((m) => {
    const data = trendsMap.get(m.key) || { income: 0, expense: 0 };
    return {
      key: m.key,
      label: m.label,
      income: data.income,
      expense: data.expense,
      savings: data.income - data.expense,
    };
  });

  // 5. Recent transactions
  const recentTransactions = periodTx.slice(0, 10);

  return {
    currentTotalBalance,
    periodIncome,
    periodExpense,
    periodSavings,
    savingsRate,
    categoryBreakdown,
    monthlyTrends,
    recentTransactions,
  };
}

// ----------------- RECURRING PAYMENTS & SUBSCRIPTIONS -----------------

export type RecurringPaymentWithDetails = RecurringPayment & {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName: string;
  accountColor: string;
};

export async function getRecurringPayments(): Promise<RecurringPaymentWithDetails[]> {
  await ensureDatabaseInitialized();

  return await db
    .select({
      id: recurringPayments.id,
      name: recurringPayments.name,
      amount: recurringPayments.amount,
      frequency: recurringPayments.frequency,
      categoryId: recurringPayments.categoryId,
      accountId: recurringPayments.accountId,
      nextPaymentDate: recurringPayments.nextPaymentDate,
      status: recurringPayments.status,
      createdAt: recurringPayments.createdAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      accountName: accounts.name,
      accountColor: accounts.color,
    })
    .from(recurringPayments)
    .innerJoin(categories, eq(recurringPayments.categoryId, categories.id))
    .innerJoin(accounts, eq(recurringPayments.accountId, accounts.id))
    .orderBy(recurringPayments.nextPaymentDate);
}

export async function createRecurringPayment(data: {
  name: string;
  amount: number;
  frequency?: "monthly" | "yearly" | "weekly";
  categoryId: string;
  accountId: string;
  nextPaymentDate: string;
}) {
  await ensureDatabaseInitialized();

  const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await db.insert(recurringPayments).values({
    id,
    name: data.name.trim(),
    amount: Math.abs(Number(data.amount)),
    frequency: data.frequency || "monthly",
    categoryId: data.categoryId,
    accountId: data.accountId,
    nextPaymentDate: data.nextPaymentDate,
    status: "active",
    createdAt: now,
  });

  safeRevalidatePath("/subscriptions");
  safeRevalidatePath("/");
  return { success: true, id };
}

export async function updateRecurringPayment(
  id: string,
  data: {
    name: string;
    amount: number;
    frequency?: "monthly" | "yearly" | "weekly";
    categoryId: string;
    accountId: string;
    nextPaymentDate: string;
    status?: "active" | "paused";
  }
) {
  await ensureDatabaseInitialized();

  await db
    .update(recurringPayments)
    .set({
      name: data.name.trim(),
      amount: Math.abs(Number(data.amount)),
      frequency: data.frequency || "monthly",
      categoryId: data.categoryId,
      accountId: data.accountId,
      nextPaymentDate: data.nextPaymentDate,
      status: data.status,
    })
    .where(eq(recurringPayments.id, id));

  safeRevalidatePath("/subscriptions");
  safeRevalidatePath("/");
  return { success: true };
}

export async function toggleRecurringPaymentStatus(id: string) {
  await ensureDatabaseInitialized();

  const [item] = await db.select().from(recurringPayments).where(eq(recurringPayments.id, id));
  if (!item) return { success: false };

  const newStatus = item.status === "active" ? "paused" : "active";
  await db
    .update(recurringPayments)
    .set({ status: newStatus })
    .where(eq(recurringPayments.id, id));

  safeRevalidatePath("/subscriptions");
  return { success: true, newStatus };
}

export async function deleteRecurringPayment(id: string) {
  await ensureDatabaseInitialized();

  await db.delete(recurringPayments).where(eq(recurringPayments.id, id));

  safeRevalidatePath("/subscriptions");
  safeRevalidatePath("/");
  return { success: true };
}

export async function executeRecurringPayment(id: string) {
  await ensureDatabaseInitialized();

  const [item] = await db.select().from(recurringPayments).where(eq(recurringPayments.id, id));
  if (!item) throw new Error("Подписка не найдена");

  const today = new Date().toISOString().split("T")[0];

  // 1. Создаем транзакцию расхода
  await createTransaction({
    type: "expense",
    amount: item.amount,
    categoryId: item.categoryId,
    accountId: item.accountId,
    date: today,
    note: `Оплата подписки: ${item.name}`,
  });

  // 2. Рассчитываем следующую дату платежа
  const [year, month, day] = item.nextPaymentDate.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day);

  if (item.frequency === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (item.frequency === "yearly") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    // monthly
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  const nextDateStr = nextDate.toISOString().split("T")[0];

  // 3. Обновляем дату следующего платежа
  await db
    .update(recurringPayments)
    .set({ nextPaymentDate: nextDateStr })
    .where(eq(recurringPayments.id, id));

  safeRevalidatePath("/subscriptions");
  safeRevalidatePath("/");
  safeRevalidatePath("/transactions");
  safeRevalidatePath("/accounts");

  return { success: true, nextPaymentDate: nextDateStr };
}

