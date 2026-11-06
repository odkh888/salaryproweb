import { Suspense } from "react";
import { connection } from "next/server";
import { getCategories } from "@/lib/actions";
import { CategoriesManager } from "@/components/CategoriesManager";

export const metadata = {
  title: "Категории — MoneyFlow",
  description: "Управление категориями доходов, расходов и лимитами бюджета",
};

async function CategoriesLoader() {
  await connection();
  const categories = await getCategories();
  return <CategoriesManager initialCategories={categories} />;
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400 text-sm">
          Загрузка категорий...
        </div>
      }
    >
      <CategoriesLoader />
    </Suspense>
  );
}
