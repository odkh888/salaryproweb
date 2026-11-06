import React from "react";
import { CategoryExpenseBreakdown } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";
import { AlertCircle } from "lucide-react";

interface BudgetProgressListProps {
  categories: CategoryExpenseBreakdown[];
}

export function BudgetProgressList({ categories }: BudgetProgressListProps) {
  const budgeted = categories.filter((c) => c.budget && c.budget > 0);

  if (budgeted.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-400 text-xs">
        Лимиты по категориям ещё не установлены. Вы можете настроить их в разделе «Категории».
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgeted.map((cat) => {
        const percent = Math.min(cat.budgetPercent || 0, 100);
        const isOver = cat.isOverBudget;

        return (
          <div key={cat.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <CategoryIcon name={cat.icon} size={14} />
                </div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {cat.name}
                </span>
                {isOver && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-sm">
                    <AlertCircle size={10} />
                    Превышен
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={`font-semibold ${isOver ? "text-rose-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                  {formatCurrency(cat.total)}
                </span>
                <span className="text-zinc-400"> / {formatCurrency(cat.budget!)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOver ? "bg-rose-500" : percent > 85 ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
