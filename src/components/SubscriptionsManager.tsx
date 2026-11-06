"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  CreditCard,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import {
  RecurringPaymentWithDetails,
  createRecurringPayment,
  updateRecurringPayment,
  toggleRecurringPaymentStatus,
  deleteRecurringPayment,
  executeRecurringPayment,
} from "@/lib/actions";
import { Category, Account } from "@/lib/db/schema";
import { formatCurrency, formatDate, getTodayDateString } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";

interface SubscriptionsManagerProps {
  initialSubscriptions: RecurringPaymentWithDetails[];
  categories: Category[];
  accounts: Account[];
}

export function SubscriptionsManager({
  initialSubscriptions,
  categories,
  accounts,
}: SubscriptionsManagerProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<RecurringPaymentWithDetails | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "yearly" | "weekly">("monthly");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KPI Calculations
  const activeSubs = initialSubscriptions.filter((s) => s.status === "active");

  const monthlyCost = activeSubs.reduce((sum, s) => {
    if (s.frequency === "monthly") return sum + s.amount;
    if (s.frequency === "yearly") return sum + s.amount / 12;
    if (s.frequency === "weekly") return sum + s.amount * 4.33;
    return sum + s.amount;
  }, 0);

  const yearlyCost = monthlyCost * 12;

  // Days until next payment helper
  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const upcomingSoon = activeSubs.filter((s) => {
    const days = getDaysUntil(s.nextPaymentDate);
    return days >= 0 && days <= 7;
  }).length;

  const openCreateModal = () => {
    setEditingSub(null);
    setName("");
    setAmount("");
    setFrequency("monthly");
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (accounts.length > 0) setAccountId(accounts[0].id);
    setNextPaymentDate(getTodayDateString());
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sub: RecurringPaymentWithDetails) => {
    setEditingSub(sub);
    setName(sub.name);
    setAmount(sub.amount.toString());
    setFrequency(sub.frequency as any);
    setCategoryId(sub.categoryId);
    setAccountId(sub.accountId);
    setNextPaymentDate(sub.nextPaymentDate);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("Укажите корректную сумму");
      return;
    }
    if (!categoryId) {
      setError("Выберите категорию");
      return;
    }
    if (!accountId) {
      setError("Выберите счёт списания");
      return;
    }
    if (!nextPaymentDate) {
      setError("Укажите дату следующего платежа");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingSub) {
        await updateRecurringPayment(editingSub.id, {
          name,
          amount: num,
          frequency,
          categoryId,
          accountId,
          nextPaymentDate,
        });
      } else {
        await createRecurringPayment({
          name,
          amount: num,
          frequency,
          categoryId,
          accountId,
          nextPaymentDate,
        });
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecute = async (id: string, subName: string, subAmount: number) => {
    if (
      confirm(
        `Подтвердить оплату «${subName}» на сумму ${formatCurrency(
          subAmount
        )}?\n\nОперация запишется в журнал трат, а дата списания сдвинется на следующий период.`
      )
    ) {
      await executeRecurringPayment(id);
      router.refresh();
    }
  };

  const handleToggleStatus = async (id: string) => {
    await toggleRecurringPaymentStatus(id);
    router.refresh();
  };

  const handleDelete = async (id: string, subName: string) => {
    if (confirm(`Удалить регулярный платёж «${subName}»?`)) {
      await deleteRecurringPayment(id);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Регулярные платежи и подписки
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Контроль сервисов, подписок, аренды и регулярных ежемесячных трат
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus size={18} />
          Добавить платёж
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            В месяц на подписки
          </span>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(monthlyCost)}
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">
            {activeSubs.length} активных регулярных списаний
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Прогноз за год
          </span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(yearlyCost)}
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">
            Суммарно за 12 месяцев
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Ближайшие 7 дней
          </span>
          <div className="text-2xl font-bold text-amber-500">
            {upcomingSoon} {upcomingSoon === 1 ? "платёж" : "платежей"}
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">
            Списания на текущей неделе
          </span>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialSubscriptions.map((sub) => {
          const days = getDaysUntil(sub.nextPaymentDate);
          const isPaused = sub.status === "paused";

          let countdownBadge = (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              <Clock size={12} />
              через {days} дн.
            </span>
          );

          if (isPaused) {
            countdownBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md">
                На паузе
              </span>
            );
          } else if (days < 0) {
            countdownBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                <AlertCircle size={12} />
                Просрочено
              </span>
            );
          } else if (days === 0) {
            countdownBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                <Clock size={12} />
                Сегодня
              </span>
            );
          } else if (days <= 3) {
            countdownBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                через {days} дн.
              </span>
            );
          }

          const frequencyLabel =
            sub.frequency === "yearly"
              ? "/ год"
              : sub.frequency === "weekly"
              ? "/ нед."
              : "/ мес.";

          return (
            <div
              key={sub.id}
              className={`p-5 rounded-2xl bg-white dark:bg-zinc-900 border transition flex flex-col justify-between group ${
                isPaused
                  ? "opacity-60 border-zinc-200/60 dark:border-zinc-800/40"
                  : "border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: sub.categoryColor }}
                  >
                    <CategoryIcon name={sub.categoryIcon} size={24} />
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleToggleStatus(sub.id)}
                      className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title={isPaused ? "Возобновить" : "Поставить на паузу"}
                    >
                      {isPaused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button
                      onClick={() => openEditModal(sub)}
                      className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Редактировать"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id, sub.name)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate">
                    {sub.name}
                  </h3>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(sub.amount)}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {frequencyLabel}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Следующее списание:</span>
                    {countdownBadge}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{formatDate(sub.nextPaymentDate)}</span>
                    <span className="text-zinc-400 text-[11px] truncate max-w-[140px]">
                      {sub.accountName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pay Now Action */}
              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  onClick={() => handleExecute(sub.id, sub.name, sub.amount)}
                  disabled={isPaused}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-50 hover:bg-blue-50 dark:bg-zinc-800/50 dark:hover:bg-blue-950/40 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle size={15} className="text-blue-500" />
                  Подтвердить списание (Оплачено)
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Subscription Card */}
        <button
          onClick={openCreateModal}
          className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 text-zinc-400 hover:text-blue-500 flex flex-col items-center justify-center gap-2 transition cursor-pointer min-h-[220px]"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Plus size={20} />
          </div>
          <span className="text-xs font-semibold">Добавить подписку или платёж</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editingSub ? "Редактировать платёж" : "Новый регулярный платёж"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
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

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Название сервиса или платежа
                </label>
                <input
                  type="text"
                  placeholder="Например: Яндекс Плюс, Аренда квартиры, Домашний интернет"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount and Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    Сумма (₽)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="399"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    Периодичность
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Раз в месяц</option>
                    <option value="yearly">Раз в год</option>
                    <option value="weekly">Раз в неделю</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Категория
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {categories
                    .filter((c) => c.type === "expense" && c.id !== "cat-transfer")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Счёт списания
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Next payment date */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Дата следующего списания
                </label>
                <input
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {isSubmitting ? "Сохранение..." : editingSub ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
