export type CategoryBreakdown = {
  categoryName: string;
  spent: number;
  limit?: number;
};

export type MonthlyTrend = {
  year: number;
  month: number;
  income: number;
  expenses: number;
};

export type DashboardSummaryResponse = {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
};

export type DashboardFilter = {
  startDate: string;
  endDate: string;
};
