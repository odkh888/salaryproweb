"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MonthlyTrend } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";

interface MonthlyBarChartProps {
  data: MonthlyTrend[];
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 flex items-center justify-center text-zinc-400">Загрузка графиков...</div>;
  }

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-sm">
        <p>Нет данных за последние месяцы</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a22" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${Math.round(val / 1000)}k`}
          />
          <Tooltip
            formatter={(val: any, name: any) => [
              formatCurrency(Number(val) || 0),
              name === "income" ? "Доход" : "Расход",
            ]}
            contentStyle={{
              backgroundColor: "#18181b",
              borderColor: "#27272a",
              borderRadius: "12px",
              color: "#fafafa",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs text-zinc-600 dark:text-zinc-400 ml-1">
                {value === "income" ? "Доходы" : "Расходы"}
              </span>
            )}
          />
          <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
          <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
