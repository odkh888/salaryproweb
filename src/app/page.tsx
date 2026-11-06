import { Suspense } from "react";
import { connection } from "next/server";
import { getDashboardData } from "@/lib/actions";
import { DashboardClient } from "@/components/DashboardClient";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

async function DashboardLoader({ searchParams }: PageProps) {
  await connection();
  const resolvedParams = await searchParams;
  const period = resolvedParams.period || "current-month";

  const now = new Date();
  let startDate: string | undefined;
  let endDate: string | undefined;

  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (period === "current-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startDate = formatDateStr(start);
    endDate = formatDateStr(end);
  } else if (period === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate = formatDateStr(start);
    endDate = formatDateStr(end);
  } else if (period === "last-3-months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    startDate = formatDateStr(start);
    endDate = formatDateStr(now);
  } else if (period === "current-year") {
    startDate = `${now.getFullYear()}-01-01`;
    endDate = `${now.getFullYear()}-12-31`;
  } else if (period === "all-time") {
    startDate = "2000-01-01";
    endDate = "2099-12-31";
  }

  const dashboardData = await getDashboardData({ startDate, endDate });

  return <DashboardClient initialData={dashboardData} initialPeriod={period} />;
}

export default function HomePage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400 text-sm">
          Загрузка дашборда...
        </div>
      }
    >
      <DashboardLoader searchParams={searchParams} />
    </Suspense>
  );
}
