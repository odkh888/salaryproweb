"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowRight,
  Calendar,
  Layers,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { DashboardSummary, deleteTransaction } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CategoryPieChart } from "./charts/CategoryPieChart";
import { MonthlyBarChart } from "./charts/MonthlyBarChart";
import { BudgetProgressList } from "./BudgetProgressList";
import { CategoryIcon } from "./CategoryIcon";
import { TransactionModal } from "./TransactionModal";
import { Transaction } from "@/lib/db/schema";

interface DashboardClientProps {
  initialData: DashboardSummary;
  initialPeriod: string;
}

export function DashboardClient({ initialData, initialPeriod }: DashboardClientProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [isPending, startTransition] = useTransition();

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const periods = [
    { id: "current-month", label: "Этот месяц" },
    { id: "last-month", label: "Прошлый месяц" },
    { id: "last-3-months", label: "3 месяца" },
    { id: "current-year", label: "Этот год" },
    { id: "all-time", label: "Всё время" },
  ];

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriod(periodId);
    startTransition(() => {
      router.push(`/?period=${periodId}`);
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту операцию?")) {
      await deleteTransaction(id);
      router.refresh();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome & Period Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Финансовый дашборд
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Сводка доходов, расходов и аналитика бюджета
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-xl overflow-x-auto max-w-full">
          <Calendar size={15} className="text-zinc-400 ml-2 hidden sm:block shrink-0" />
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedPeriod === p.id
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Общий баланс</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(initialData.currentTotalBalance)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Суммарный остаток на всех счетах
          </div>
        </div>

        {/* Period Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Доходы за период</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(initialData.periodIncome)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Все поступившие средства
          </div>
        </div>

        {/* Period Expenses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Расходы за период</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            -{formatCurrency(initialData.periodExpense)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Суммарные траты за период
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Сбережения</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(initialData.periodSavings)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {initialData.savingsRate >= 0 ? (
              <span className="text-emerald-500 font-medium">
                Норма накоплений: {initialData.savingsRate}%
              </span>
            ) : (
              <span className="text-rose-500 font-medium">Расход превысил доход</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown (Donut Chart) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Layers size={17} />
              </div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Расходы по категориям
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              Всего: {formatCurrency(initialData.periodExpense)}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <CategoryPieChart data={initialData.categoryBreakdown} />
          </div>
        </div>

        {/* Monthly Trends (Income vs Expense Bar Chart) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <BarChart3 size={17} />
              </div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Динамика доходов и расходов
              </h2>
            </div>
            <span className="text-xs text-zinc-400">За последние 6 месяцев</span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <MonthlyBarChart data={initialData.monthlyTrends} />
          </div>
        </div>
      </div>

      {/* Two Columns: Budget Progress & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Progress (1 col) */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Бюджеты по категориям
            </h2>
            <Link
              href="/categories"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              Настроить <ArrowRight size={13} />
            </Link>
          </div>

          <BudgetProgressList categories={initialData.categoryBreakdown} />
        </div>

        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Последние операции
            </h2>
            <Link
              href="/transactions"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              Все операции ({initialData.recentTransactions.length}) <ArrowRight size={13} />
            </Link>
          </div>

          {initialData.recentTransactions.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-sm">
              <p>Нет операций за выбранный период.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Добавить первую операцию
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {initialData.recentTransactions.map((tx) => {
                const isExpense = tx.type === "expense";
                const isTransfer = tx.type === "transfer";
                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                          isTransfer ? "bg-indigo-600" : ""
                        }`}
                        style={{ backgroundColor: isTransfer ? "#4f46e5" : tx.categoryColor }}
                      >
                        <CategoryIcon name={isTransfer ? "ArrowLeftRight" : tx.categoryIcon} size={19} />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {isTransfer ? "Перевод между счетами" : tx.categoryName}
                          <span className="text-[11px] text-zinc-400 font-normal">
                            • {isTransfer ? `${tx.accountName} → ${tx.toAccountName || "Счёт"}` : tx.accountName}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          {formatDate(tx.date)}
                          {tx.note && <span className="text-zinc-500"> — {tx.note}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`font-semibold text-sm ${
                          isTransfer
                            ? "text-indigo-600 dark:text-indigo-400"
                            : isExpense
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isTransfer ? "⇄ " : isExpense ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTransaction(tx);
                            setIsModalOpen(true);
                          }}
                          className="text-xs text-zinc-400 hover:text-blue-500 p-1"
                          title="Редактировать"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-xs text-zinc-400 hover:text-rose-500 p-1"
                          title="Удалить"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        initialTransaction={editingTransaction}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
