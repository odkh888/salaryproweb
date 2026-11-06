"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Target,
  ArrowDownRight,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { Category } from "@/lib/db/schema";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";

interface CategoriesManagerProps {
  initialCategories: Category[];
}

const AVAILABLE_ICONS = [
  "ShoppingCart", "Utensils", "Home", "Car", "HeartPulse",
  "Gamepad2", "Shirt", "Tv", "Briefcase", "Award",
  "Laptop", "TrendingUp", "Gift", "Coffee", "Plane",
  "BookOpen", "Fuel", "Music", "GraduationCap", "Camera",
  "MoreHorizontal"
];

const AVAILABLE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"
];

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [icon, setIcon] = useState("ShoppingCart");
  const [color, setColor] = useState("#3b82f6");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = (forcedType?: "expense" | "income") => {
    setEditingCategory(null);
    setName("");
    const targetType = forcedType || activeTab;
    setType(targetType);
    setIcon(targetType === "expense" ? "ShoppingCart" : "Briefcase");
    setColor(targetType === "expense" ? "#ef4444" : "#10b981");
    setMonthlyBudget("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type as any);
    setIcon(cat.icon);
    setColor(cat.color);
    setMonthlyBudget(cat.monthlyBudget ? cat.monthlyBudget.toString() : "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Укажите название категории");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const budgetNum = monthlyBudget ? parseFloat(monthlyBudget) : null;

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name,
          icon,
          color,
          monthlyBudget: budgetNum,
        });
      } else {
        await createCategory({
          name,
          type,
          icon,
          color,
          monthlyBudget: budgetNum,
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

  const handleDelete = async (id: string, catName: string) => {
    if (confirm(`Удалить категорию «${catName}»? Все привязанные к ней транзакции также будут удалены.`)) {
      await deleteCategory(id);
      router.refresh();
    }
  };

  const currentList = initialCategories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Управление категориями
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Настройка категорий доходов, расходов и месячных лимитов бюджета
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus size={18} />
          Создать категорию
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("expense")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === "expense"
              ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <ArrowDownRight size={16} />
          Расходы ({initialCategories.filter((c) => c.type === "expense").length})
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === "income"
              ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <ArrowUpRight size={16} />
          Доходы ({initialCategories.filter((c) => c.type === "income").length})
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentList.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: cat.color }}
                >
                  <CategoryIcon name={cat.icon} size={24} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Редактировать"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                {cat.name}
              </h3>

              {cat.type === "expense" && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <Target size={14} className="text-zinc-400" />
                  {cat.monthlyBudget ? (
                    <span>
                      Месячный лимит:{" "}
                      <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">
                        {formatCurrency(cat.monthlyBudget)}
                      </strong>
                    </span>
                  ) : (
                    <span className="italic">Лимит не установлен</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Card placeholder */}
        <button
          onClick={() => openCreateModal()}
          className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 text-zinc-400 hover:text-blue-500 flex flex-col items-center justify-center gap-2 transition cursor-pointer min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Plus size={20} />
          </div>
          <span className="text-xs font-semibold">Добавить категорию</span>
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
                {editingCategory ? "Редактировать категорию" : "Новая категория"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
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

              {/* Type (only when creating) */}
              {!editingCategory && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setType("expense");
                      if (color === "#10b981") setColor("#ef4444");
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition ${
                      type === "expense"
                        ? "bg-rose-500 text-white"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Расход
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType("income");
                      if (color === "#ef4444") setColor("#10b981");
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition ${
                      type === "income"
                        ? "bg-emerald-500 text-white"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Доход
                  </button>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Название
                </label>
                <input
                  type="text"
                  placeholder="Например: Спортивные тренировки"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Monthly Budget for expenses */}
              {type === "expense" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    Месячный лимит (₽, опционально)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Например: 15000"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Цвет
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Иконка
                </label>
                <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-lg flex items-center justify-center transition ${
                        icon === ic
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <CategoryIcon name={ic} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Сохранение..." : editingCategory ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
