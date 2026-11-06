"use client";

import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CategoryExpenseBreakdown } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { CategoryIcon } from "../CategoryIcon";

interface CategoryPieChartProps {
  data: CategoryExpenseBreakdown[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 flex items-center justify-center text-zinc-400">Загрузка диаграммы...</div>;
  }

  const validData = data.filter((item) => item.total > 0);

  if (validData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-sm">
        <p>Нет расходов за выбранный период</p>
      </div>
    );
  }

  const chartData = validData.map((item) => ({
    name: item.name,
    value: item.total,
    color: item.color,
    icon: item.icon,
    percentage: item.percentage,
  }));

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="w-full md:w-1/2 h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value: any) => [formatCurrency(Number(value) || 0), "Сумма"]}
              contentStyle={{
                backgroundColor: "#18181b",
                borderColor: "#27272a",
                borderRadius: "12px",
                color: "#fafafa",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#fafafa" }}
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="w-full md:w-1/2 space-y-2 max-h-60 overflow-y-auto pr-1">
        {validData.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: item.color }}
              >
                <CategoryIcon name={item.icon} size={15} />
              </div>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(item.total)}
              </span>
              <span className="text-zinc-400 font-medium w-9 text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
