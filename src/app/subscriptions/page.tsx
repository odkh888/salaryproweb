import { Suspense } from "react";
import { connection } from "next/server";
import { getRecurringPayments, getCategories, getAccounts } from "@/lib/actions";
import { SubscriptionsManager } from "@/components/SubscriptionsManager";

export const metadata = {
  title: "Подписки и регулярные платежи — MoneyFlow",
  description: "Учёт регулярных ежемесячных трат, сервисов, подписок и планирование расходов",
};

async function SubscriptionsLoader() {
  await connection();
  const [subscriptions, categories, accounts] = await Promise.all([
    getRecurringPayments(),
    getCategories(),
    getAccounts(),
  ]);

  return (
    <SubscriptionsManager
      initialSubscriptions={subscriptions}
      categories={categories}
      accounts={accounts}
    />
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400 text-sm">
          Загрузка подписок...
        </div>
      }
    >
      <SubscriptionsLoader />
    </Suspense>
  );
}
