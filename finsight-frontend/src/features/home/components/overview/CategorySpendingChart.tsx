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
  ChartTooltip,
} from "@/components/chart/Chart";
import { formatCurrency } from "@/utils/string/formatters";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

type Status = "no-limit" | "ok" | "warning" | "over";

type ChartEntry = {
  categoryName: string;
  spent: number;
  limit?: number;
  spentBar: number;
  remainingBar: number;
  status: Status;
};

const WARNING_THRESHOLD = 0.8;

function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
): string {
  return [
    `M ${x + tl},${y}`,
    `H ${x + width - tr}`,
    `Q ${x + width},${y} ${x + width},${y + tr}`,
    `V ${y + height - br}`,
    `Q ${x + width},${y + height} ${x + width - br},${y + height}`,
    `H ${x + bl}`,
    `Q ${x},${y + height} ${x},${y + height - bl}`,
    `V ${y + tl}`,
    `Q ${x},${y} ${x + tl},${y}`,
    `Z`,
  ].join(" ");
}

const STATUS_COLORS: Record<Status, string> = {
  "no-limit": "var(--chart-2)",
  ok: "var(--success)",
  warning: "oklch(0.75 0.18 55)",
  over: "var(--destructive)",
};

function getStatus(spent: number, limit?: number): Status {
  if (limit == null) return "no-limit";
  if (spent > limit) return "over";
  if (spent / limit >= WARNING_THRESHOLD) return "warning";
  return "ok";
}

interface CategorySpendingChartProps {
  data: CategoryBreakdown[];
}

interface BarShapeBaseProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface SpentBarShapeProps extends BarShapeBaseProps {
  payload?: ChartEntry;
}

const SpentBarShape = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
}: SpentBarShapeProps) => {
  if (!payload || width <= 0) return null;

  const fill = STATUS_COLORS[payload.status];
  const isOver = payload.status === "over";
  const hasRemaining = payload.remainingBar > 0;

  const limitMarkerX =
    isOver && payload.limit != null && payload.spent > 0
      ? x + (payload.limit / payload.spent) * width
      : null;

  const pad = 2;
  const r = 4;
  const ry = y + pad;
  const rh = height - pad * 2;
  const d = hasRemaining
    ? roundedRect(x, ry, width, rh, r, 0, 0, r)
    : roundedRect(x, ry, width, rh, r, r, r, r);

  return (
    <g>
      <path d={d} fill={fill} />
      {limitMarkerX != null && (
        <rect
          x={limitMarkerX - 1.5}
          y={y}
          width={3}
          height={height}
          fill="var(--muted-foreground)"
          opacity={0.35}
          rx={1.5}
        />
      )}
    </g>
  );
};

const RemainingBarShape = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
}: BarShapeBaseProps) => {
  if (width <= 0) return null;

  const pad = 2;
  const r = 4;

  return (
    <path
      d={roundedRect(x, y + pad, width, height - pad * 2, 0, r, r, 0)}
      fill="var(--muted-foreground)"
    />
  );
};

type CategoryTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: ChartEntry }>;
};

const CategoryTooltip = ({ active, payload }: CategoryTooltipProps) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="border-border/50 bg-background grid min-w-36 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{entry.categoryName}</p>
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Spent</span>
          <span className="font-mono font-medium tabular-nums">
            {formatCurrency(entry.spent, "BRL")}
          </span>
        </div>
        {entry.limit != null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Limit</span>
            <span className="font-mono font-medium tabular-nums">
              {formatCurrency(entry.limit, "BRL")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const chartConfig: ChartConfig = {
  spentBar: { label: "Spent" },
  remainingBar: { label: "Remaining" },
};

export const CategorySpendingChart = ({ data }: CategorySpendingChartProps) => {
  const chartData = useMemo<ChartEntry[]>(
    () =>
      data.map((entry) => {
        const status = getStatus(entry.spent, entry.limit);
        const spentBar = entry.spent;
        const remainingBar =
          entry.limit != null && status !== "over"
            ? entry.limit - entry.spent
            : 0;
        return { ...entry, spentBar, remainingBar, status };
      }),
    [data],
  );

  const chartHeight = Math.max(280, chartData.length * 48);

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
          <ChartContainer
            config={chartConfig}
            style={{ height: chartHeight }}
            className="w-full"
          >
            <BarChart data={chartData} layout="vertical" barSize={18}>
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  formatCurrency(v, "BRL").replace("R$\u00a0", "R$ ")
                }
              />
              <YAxis
                type="category"
                dataKey="categoryName"
                width={200}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<CategoryTooltip />} />
              <Bar
                dataKey="spentBar"
                stackId="a"
                shape={(props: SpentBarShapeProps) => (
                  <SpentBarShape {...props} />
                )}
              />
              <Bar
                dataKey="remainingBar"
                stackId="a"
                shape={(props: BarShapeBaseProps) => (
                  <RemainingBarShape {...props} />
                )}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
