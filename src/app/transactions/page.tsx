import { Suspense } from "react";
import { connection } from "next/server";
import { getTransactions, getCategories, getAccounts } from "@/lib/actions";
import { TransactionsTable } from "@/components/TransactionsTable";

export const metadata = {
  title: "Журнал операций — MoneyFlow",
  description: "Список всех доходов и расходов с поиском и фильтрами",
};

async function TransactionsLoader() {
  await connection();
  const [transactions, categories, accounts] = await Promise.all([
    getTransactions(),
    getCategories(),
    getAccounts(),
  ]);

  return (
    <TransactionsTable
      initialTransactions={transactions}
      categories={categories}
      accounts={accounts}
    />
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400 text-sm">
          Загрузка операций...
        </div>
      }
    >
      <TransactionsLoader />
    </Suspense>
  );
}
