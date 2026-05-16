import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { TimeSeriesPoint } from "@/types";

interface Props {
  data: TimeSeriesPoint[];
  timeRange: number;
}

function formatHour(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ProcessingTimeChart({ data, timeRange }: Props) {
  const step = timeRange > 48 ? 12 : timeRange > 12 ? 6 : 2;
  const filtered = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={filtered} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatHour}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatDuration(v as number)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(v) => [formatDuration(v as number), "Avg Time"]}
              labelFormatter={(ts) => new Date(ts as number).toLocaleString()}
            />
            <Bar
              dataKey="avgProcessingTimeMs"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              name="Avg Process Time"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
