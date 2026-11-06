"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Wallet,
  PiggyBank,
  Landmark,
  Plus,
  ArrowLeftRight,
  Edit2,
  Trash2,
  X,
  Check,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AccountWithBalance, createAccount, updateAccount, deleteAccount } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { TransactionModal } from "./TransactionModal";

interface AccountsManagerProps {
  initialAccounts: AccountWithBalance[];
}

const ACCOUNT_TYPE_CONFIG = {
  card: { label: "Банковская карта", icon: CreditCard, defaultColor: "#3b82f6" },
  cash: { label: "Наличные", icon: Wallet, defaultColor: "#10b981" },
  savings: { label: "Накопительный счёт", icon: PiggyBank, defaultColor: "#8b5cf6" },
  bank: { label: "Банковский счёт", icon: Landmark, defaultColor: "#f59e0b" },
};

const PALETTE = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#64748b"
];

export function AccountsManager({ initialAccounts }: AccountsManagerProps) {
  const router = useRouter();

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithBalance | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [type, setType] = useState<"card" | "cash" | "bank" | "savings">("card");
  const [initialBalance, setInitialBalance] = useState("0");
  const [color, setColor] = useState("#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const totalBalance = initialAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const liquidFunds = initialAccounts
    .filter((a) => a.type === "card" || a.type === "cash")
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const savingsFunds = initialAccounts
    .filter((a) => a.type === "savings" || a.type === "bank")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName("");
    setType("card");
    setInitialBalance("0");
    setColor("#3b82f6");
    setError(null);
    setIsAccountModalOpen(true);
  };

  const openEditModal = (acc: AccountWithBalance) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type as any);
    setInitialBalance(acc.initialBalance.toString());
    setColor(acc.color);
    setError(null);
    setIsAccountModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Укажите название счёта");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const initBal = parseFloat(initialBalance) || 0;

      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name,
          type,
          initialBalance: initBal,
          color,
        });
      } else {
        await createAccount({
          name,
          type,
          initialBalance: initBal,
          color,
        });
      }

      setIsAccountModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, accName: string) => {
    if (confirm(`Удалить счёт «${accName}»? Все операции, привязанные к этому счёту, также будут удалены.`)) {
      await deleteAccount(id);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Счета и кошельки
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Управление банковскими картами, наличными и переводами между ними
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-sm font-medium transition cursor-pointer"
          >
            <ArrowLeftRight size={16} />
            Перевод
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus size={18} />
            Новый счёт
          </button>
        </div>
      </div>

      {/* KPI Cards: Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Общий капитал
          </span>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalBalance)}
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">
            Сумма по всем {initialAccounts.length} счетам
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Доступные средства
          </span>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(liquidFunds)}
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">
            Карты и наличные для ежедневных трат
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Накопления и вклады
          </span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(savingsFunds)}
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">
            Накопительные счета и сбережения
          </span>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialAccounts.map((acc) => {
          const config = ACCOUNT_TYPE_CONFIG[acc.type as keyof typeof ACCOUNT_TYPE_CONFIG] || ACCOUNT_TYPE_CONFIG.card;
          const Icon = config.icon;

          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: acc.color }}
                  >
                    <Icon size={24} />
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>
                    {initialAccounts.length > 1 && (
                      <button
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  {acc.name}
                </h3>
                <span className="text-xs text-zinc-400 font-medium">
                  {config.label}
                </span>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">Текущий баланс:</span>
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(acc.currentBalance)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Начальный: {formatCurrency(acc.initialBalance)}</span>
                <span>Операций: {acc.transactionsCount}</span>
              </div>
            </div>
          );
        })}

        {/* Add Account Card */}
        <button
          onClick={openCreateModal}
          className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 text-zinc-400 hover:text-blue-500 flex flex-col items-center justify-center gap-2 transition cursor-pointer min-h-[160px]"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Plus size={20} />
          </div>
          <span className="text-xs font-semibold">Создать счёт / кошелёк</span>
        </button>
      </div>

      {/* Account Modal (Create / Edit) */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editingAccount ? "Редактировать счёт" : "Новый счёт"}
              </h2>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-sm rounded-lg bg-red-50 text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              {/* Account Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Название счёта
                </label>
                <input
                  type="text"
                  placeholder="Например: Зарплатная карта Т-Банк"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Тип счёта
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setType(newType);
                    setColor(ACCOUNT_TYPE_CONFIG[newType as keyof typeof ACCOUNT_TYPE_CONFIG].defaultColor);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="card">💳 Банковская карта</option>
                  <option value="cash">💵 Наличные</option>
                  <option value="savings">🐖 Накопительный счёт / Вклад</option>
                  <option value="bank">🏛️ Банковский расчётный счёт</option>
                </select>
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Начальный остаток (₽)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Цвет карточки
                </label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                        color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Сохранение..." : editingAccount ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransactionModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
