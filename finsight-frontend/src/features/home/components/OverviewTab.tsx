import { useGetDashboardSummary } from "@/api/services/useDashboardService";
import { Button } from "@/components/button/Button";
import { DateRangePicker } from "@/components/input/DatePicker";
import { Skeleton } from "@/components/skeleton/Skeleton";
import { cn } from "@/lib/mergeClasses";
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CategorySpendingChart } from "./CategorySpendingChart";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { SummaryCards } from "./SummaryCards";

type Period = "this-month" | "last-3m" | "last-6m" | "this-year";

const PERIOD_LABELS: Record<Period, string> = {
  "this-month": "This month",
  "last-3m": "Last 3M",
  "last-6m": "Last 6M",
  "this-year": "This year",
};

const getPeriodDates = (period: Period) => {
  const now = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (period) {
    case "this-month":
      return {
        startDate: fmt(startOfMonth(now)),
        endDate: fmt(endOfMonth(now)),
      };
    case "last-3m":
      return {
        startDate: fmt(startOfMonth(subMonths(now, 2))),
        endDate: fmt(endOfMonth(now)),
      };
    case "last-6m":
      return {
        startDate: fmt(startOfMonth(subMonths(now, 5))),
        endDate: fmt(endOfMonth(now)),
      };
    case "this-year":
      return { startDate: fmt(startOfYear(now)), endDate: fmt(endOfYear(now)) };
  }
};

export const OverviewTab = () => {
  const [period, setPeriod] = useState<Period>("this-month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const isCustomActive = !!(customRange?.from && customRange?.to);

  const filter = useMemo(() => {
    if (isCustomActive) {
      return {
        startDate: format(customRange!.from!, "yyyy-MM-dd"),
        endDate: format(customRange!.to!, "yyyy-MM-dd"),
      };
    }
    return getPeriodDates(period);
  }, [period, isCustomActive, customRange]);

  const { data, isLoading } = useGetDashboardSummary(filter);

  const handlePeriodClick = (p: Period) => {
    setPeriod(p);
    setCustomRange(undefined);
  };

  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p && !isCustomActive ? "default" : "outline"}
            onClick={() => handlePeriodClick(p)}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
        <DateRangePicker
          value={customRange}
          onChange={setCustomRange}
          placeholder="Custom period"
          className={cn(isCustomActive && "border-pink-400")}
        />
      </div>

      {isLoading || !data ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      ) : (
        <>
          <SummaryCards data={data} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CategorySpendingChart data={data.categoryBreakdown} />
            <MonthlyTrendChart data={data.monthlyTrend} />
          </div>
        </>
      )}
    </div>
  );
};
