import { Suspense } from "react";
import { connection } from "next/server";
import { getAccountsWithBalances } from "@/lib/actions";
import { AccountsManager } from "@/components/AccountsManager";

export const metadata = {
  title: "Счета и кошельки — MoneyFlow",
  description: "Управление банковскими счетами, картами, наличными и переводами",
};

async function AccountsLoader() {
  await connection();
  const accounts = await getAccountsWithBalances();
  return <AccountsManager initialAccounts={accounts} />;
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400 text-sm">
          Загрузка счетов...
        </div>
      }
    >
      <AccountsLoader />
    </Suspense>
  );
}
