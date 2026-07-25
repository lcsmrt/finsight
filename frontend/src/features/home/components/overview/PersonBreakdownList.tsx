import { PersonBreakdown } from "@/api/dtos";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/card/Card";
import { cn } from "@/lib/mergeClasses";
import { formatCurrency } from "@/utils/string/formatters";

type PersonBreakdownListProps = {
  data: PersonBreakdown[];
};

export const PersonBreakdownList = ({ data }: PersonBreakdownListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By Person</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            No transactions for this period.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.map((person) => (
              <div
                key={person.userId}
                className="border-border/50 flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0"
              >
                <p className="font-medium">{person.name}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Income</p>
                    <p className="font-mono font-medium tabular-nums text-green-600">
                      {formatCurrency(person.income, "BRL")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Expense</p>
                    <p className="font-mono font-medium tabular-nums text-red-600">
                      {formatCurrency(person.expense, "BRL")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Net</p>
                    <p
                      className={cn(
                        "font-mono font-medium tabular-nums",
                        person.net >= 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {formatCurrency(person.net, "BRL")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
