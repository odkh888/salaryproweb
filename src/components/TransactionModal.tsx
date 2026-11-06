"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { createTransaction, getCategories, getAccounts, updateTransaction } from "@/lib/actions";
import { Category, Account, Transaction } from "@/lib/db/schema";
import { CategoryIcon } from "./CategoryIcon";
import { getTodayDateString } from "@/lib/utils";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTransaction?: Transaction | null;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialTransaction,
}: TransactionModalProps) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    Promise.all([getCategories(), getAccounts()])
      .then(([cats, accs]) => {
        setCategories(cats);
        setAccounts(accs);

        if (initialTransaction) {
          setType(initialTransaction.type as any);
          setAmount(initialTransaction.amount.toString());
          setCategoryId(initialTransaction.categoryId);
          setAccountId(initialTransaction.accountId);
          setToAccountId(initialTransaction.toAccountId || "");
          setDate(initialTransaction.date);
          setNote(initialTransaction.note || "");
        } else {
          // Defaults for new transaction
          const filteredCats = cats.filter((c) => c.type === (type || "expense"));
          if (filteredCats.length > 0) setCategoryId(filteredCats[0].id);
          if (accs.length > 0) {
            setAccountId(accs[0].id);
            if (accs.length > 1) setToAccountId(accs[1].id);
          }
          setDate(getTodayDateString());
          setAmount("");
          setNote("");
        }
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, initialTransaction]);

  // Adjust default category if type toggled
  const handleTypeChange = (newType: "expense" | "income" | "transfer") => {
    setType(newType);
    if (newType === "transfer") {
      const transferCat = categories.find((c) => c.id === "cat-transfer");
      if (transferCat) setCategoryId(transferCat.id);
      if (accounts.length > 1 && (!toAccountId || toAccountId === accountId)) {
        const other = accounts.find((a) => a.id !== accountId);
        if (other) setToAccountId(other.id);
      }
    } else {
      const available = categories.filter((c) => c.type === newType);
      if (available.length > 0 && !available.some((c) => c.id === categoryId)) {
        setCategoryId(available[0].id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Пожалуйста, укажите корректную сумму");
      return;
    }
    if (!accountId) {
      setError("Выберите счёт списания");
      return;
    }
    if (type === "transfer") {
      if (!toAccountId) {
        setError("Выберите счёт зачисления");
        return;
      }
      if (accountId === toAccountId) {
        setError("Счета списания и зачисления должны различаться");
        return;
      }
    } else {
      if (!categoryId) {
        setError("Выберите категорию");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finalCatId = type === "transfer" ? "cat-transfer" : categoryId;

      if (initialTransaction) {
        await updateTransaction(initialTransaction.id, {
          type,
          amount: numAmount,
          categoryId: finalCatId,
          accountId,
          toAccountId: type === "transfer" ? toAccountId : null,
          date,
          note,
        });
      } else {
        await createTransaction({
          type,
          amount: numAmount,
          categoryId: finalCatId,
          accountId,
          toAccountId: type === "transfer" ? toAccountId : null,
          date,
          note,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить операцию");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {initialTransaction ? "Редактировать операцию" : "Новая операция"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Type Toggle: Expense / Income / Transfer */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                type === "expense"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <ArrowDownRight size={16} />
              Расход
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                type === "income"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <ArrowUpRight size={16} />
              Доход
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("transfer")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                type === "transfer"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <ArrowLeftRight size={16} />
              Перевод
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Сумма (₽)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
                className="w-full text-2xl font-bold py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-medium text-zinc-400">
                ₽
              </span>
            </div>
          </div>

          {/* Transfer Accounts or Category Selection */}
          {type === "transfer" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-indigo-950 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                  Счёт списания (Откуда)
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-indigo-950 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                  Счёт зачисления (Куда)
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Категория
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30">
                {currentCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-1 text-white shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={18} />
                      </div>
                      <span className="text-xs font-medium truncate w-full">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account (if not transfer) & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type !== "transfer" && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Счёт / Способ оплаты
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={type === "transfer" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Дата
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Note / Comment */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Заметка / Комментарий (опционально)
            </label>
            <input
              type="text"
              placeholder={type === "transfer" ? "Например: пополнение вклада с карты" : "Например: покупка продуктов в Спаре"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 text-sm placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className={`flex-1 py-3 px-4 rounded-xl text-white font-medium text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                type === "expense"
                  ? "bg-rose-500 hover:bg-rose-600"
                  : type === "income"
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } disabled:opacity-50`}
            >
              {isSubmitting ? "Сохранение..." : initialTransaction ? "Обновить" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
