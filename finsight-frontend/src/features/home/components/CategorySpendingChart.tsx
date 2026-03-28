import { CategoryBreakdown } from "@/api/dtos";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/card/Card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/chart/Chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

type CategorySpendingChartProps = {
  data: CategoryBreakdown[];
};

type SpentBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  limit?: number;
};

const SpentBar = ({ x = 0, y = 0, width = 0, height = 0, value = 0, limit }: SpentBarShapeProps) => {
  const limitX = limit != null && value > 0 ? x + (limit / value) * width : null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="var(--color-spent)" rx={4} ry={4} />
      {limitX != null && (
        <rect
          x={limitX - 1.5}
          y={y - 4}
          width={3}
          height={height + 8}
          fill="var(--color-limit)"
          rx={1}
        />
      )}
    </g>
  );
};

type CategoryTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: CategoryBreakdown }>;
};

const CategoryTooltip = ({ active, payload }: CategoryTooltipProps) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{entry.categoryName}</p>
      <div className="grid gap-1.5">
        <div className="flex w-full items-center gap-2">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: "var(--color-spent)" }}
          />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-mono font-medium tabular-nums">
              {entry.spent.toLocaleString()}
            </span>
          </div>
        </div>
        {entry.limit != null && (
          <div className="flex w-full items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: "var(--color-limit)" }}
            />
            <div className="flex flex-1 items-center justify-between">
              <span className="text-muted-foreground">Limit</span>
              <span className="font-mono font-medium tabular-nums">
                {entry.limit.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const chartConfig: ChartConfig = {
  spent: { label: "Spent", color: "var(--chart-1)" },
  limit: { label: "Limit", color: "var(--chart-2)" },
};

export const CategorySpendingChart = ({ data }: CategorySpendingChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            No categorized expenses for this period.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-75 w-full">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="categoryName"
                width={120}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<CategoryTooltip />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="spent"
                shape={(props: SpentBarShapeProps) => <SpentBar {...props} />}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
