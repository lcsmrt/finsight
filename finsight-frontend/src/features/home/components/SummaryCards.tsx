import { DashboardSummaryResponse } from "@/api/dtos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card/Card";
import { cn } from "@/lib/mergeClasses";
import { formatCurrency } from "@/utils/string/formatters";

type SummaryCardsProps = {
  data: DashboardSummaryResponse;
};

export const SummaryCards = ({ data }: SummaryCardsProps) => {
  const { totalIncome, totalExpenses, netBalance } = data;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">Income</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome, "BRL")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, "BRL")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-2xl font-bold", netBalance >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(netBalance, "BRL")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
