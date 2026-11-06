"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import { TransactionWithDetails, deleteTransaction } from "@/lib/actions";
import { Category, Account, Transaction } from "@/lib/db/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";
import { TransactionModal } from "./TransactionModal";

interface TransactionsTableProps {
  initialTransactions: TransactionWithDetails[];
  categories: Category[];
  accounts: Account[];
}

export function TransactionsTable({
  initialTransactions,
  categories,
  accounts,
}: TransactionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtered transactions
  const filtered = useMemo(() => {
    return initialTransactions.filter((tx) => {
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      if (selectedCategory !== "all" && tx.categoryId !== selectedCategory) return false;
      if (selectedAccount !== "all") {
        if (tx.accountId !== selectedAccount && tx.toAccountId !== selectedAccount) return false;
      }
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      if (search.trim()) {
        const s = search.toLowerCase();
        const matchNote = tx.note?.toLowerCase().includes(s);
        const matchCat = tx.categoryName.toLowerCase().includes(s);
        const matchAcc = tx.accountName.toLowerCase().includes(s);
        const matchToAcc = tx.toAccountName?.toLowerCase().includes(s);
        const matchAmount = tx.amount.toString().includes(s);
        if (!matchNote && !matchCat && !matchAcc && !matchToAcc && !matchAmount) return false;
      }

      return true;
    });
  }, [initialTransactions, search, selectedType, selectedCategory, selectedAccount, startDate, endDate]);

  // Aggregate stats for filtered data
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;
    for (const tx of filtered) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
      else if (tx.type === "transfer") transfer += tx.amount;
    }
    return {
      income,
      expense,
      transfer,
      net: income - expense,
      count: filtered.length,
    };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (confirm("Вы точно хотите удалить эту операцию?")) {
      await deleteTransaction(id);
      router.refresh();
    }
  };

  // CSV Export function
  const handleExportCSV = () => {
    const headers = ["ID", "Дата", "Тип", "Категория", "Счет списания", "Счет зачисления", "Сумма (RUB)", "Заметка"];
    const rows = filtered.map((tx) => [
      tx.id,
      tx.date,
      tx.type === "income" ? "Доход" : tx.type === "expense" ? "Расход" : "Перевод",
      `"${tx.categoryName.replace(/"/g, '""')}"`,
      `"${tx.accountName.replace(/"/g, '""')}"`,
      tx.toAccountName ? `"${tx.toAccountName.replace(/"/g, '""')}"` : '""',
      tx.amount,
      `"${(tx.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `operations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Журнал операций
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Все доходы, расходы и переводы между счетами с фильтрацией и экспортом
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition cursor-pointer"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Экспорт в CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingTx(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus size={18} />
            Добавить
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div className="flex items-center justify-between p-2">
          <span className="text-xs text-zinc-500">Найдено операций:</span>
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {summary.count}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 sm:border-x border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">Доходы / Расходы:</span>
          <span className="font-semibold text-sm">
            <span className="text-emerald-500">+{formatCurrency(summary.income)}</span> /{" "}
            <span className="text-rose-500">-{formatCurrency(summary.expense)}</span>
          </span>
        </div>
        <div className="flex items-center justify-between p-2">
          <span className="text-xs text-zinc-500">Итог (разница):</span>
          <span
            className={`font-semibold text-sm ${
              summary.net >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {summary.net >= 0 ? "+" : ""}
            {formatCurrency(summary.net)}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Поиск по заметке, сумме, счёту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все типы</option>
              <option value="expense">Только расходы</option>
              <option value="income">Только доходы</option>
              <option value="transfer">Только переводы</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id === "cat-transfer" ? "⇄ " : c.type === "expense" ? "🔴 " : "🟢 "}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все счета</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500">
          <span className="flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-400">
            <Filter size={14} /> Период:
          </span>
          <div className="flex items-center gap-2">
            <span>с</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs"
            />
            <span>по</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs"
            />
          </div>

          {(startDate || endDate || search || selectedType !== "all" || selectedCategory !== "all" || selectedAccount !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedType("all");
                setSelectedCategory("all");
                setSelectedAccount("all");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto cursor-pointer"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      </div>

      {/* Transactions List / Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">
            <p>Операций не найдено по заданным параметрам.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Категория / Тип</th>
                  <th className="py-3.5 px-4">Счет</th>
                  <th className="py-3.5 px-4">Дата</th>
                  <th className="py-3.5 px-4">Заметка</th>
                  <th className="py-3.5 px-4 text-right">Сумма</th>
                  <th className="py-3.5 px-4 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filtered.map((tx) => {
                  const isExpense = tx.type === "expense";
                  const isTransfer = tx.type === "transfer";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition group"
                    >
                      {/* Category */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                              isTransfer ? "bg-indigo-600" : ""
                            }`}
                            style={{ backgroundColor: isTransfer ? "#4f46e5" : tx.categoryColor }}
                          >
                            {isTransfer ? (
                              <ArrowLeftRight size={17} />
                            ) : (
                              <CategoryIcon name={tx.categoryIcon} size={17} />
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
                              {isTransfer ? "Перевод между счетами" : tx.categoryName}
                            </span>
                            {isTransfer && (
                              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold uppercase">
                                Внутренний перевод
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 text-xs">
                        {isTransfer ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-zinc-700 dark:text-zinc-200">{tx.accountName}</span>
                            <span className="text-indigo-500">→</span>
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {tx.toAccountName || "Счёт"}
                            </span>
                          </div>
                        ) : (
                          tx.accountName
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>

                      {/* Note */}
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 max-w-xs truncate text-xs">
                        {tx.note || <span className="text-zinc-400 italic">—</span>}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                        <span
                          className={
                            isTransfer
                              ? "text-indigo-600 dark:text-indigo-400"
                              : isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {isTransfer ? "⇄ " : isExpense ? "-" : "+"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="Редактировать"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="Удалить"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        initialTransaction={editingTx}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
