import { CheckCircle2, XCircle, Zap, Clock } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { formatDuration } from "@/lib/utils";
import type { OverviewMetrics } from "@/types";

interface Props {
  summary: OverviewMetrics["summary"];
  timeRange: number;
}

export function MetricCardsGrid({ summary, timeRange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Completed"
        value={summary.totalCompleted.toLocaleString()}
        sub={`Last ${timeRange}h`}
        icon={CheckCircle2}
        colorClass="text-green-400"
      />
      <MetricCard
        title="Failed"
        value={summary.totalFailed.toLocaleString()}
        sub={`${summary.failureRate.toFixed(1)}% failure rate`}
        icon={XCircle}
        colorClass={summary.totalFailed > 0 ? "text-red-400" : "text-muted-foreground"}
      />
      <MetricCard
        title="Throughput"
        value={summary.avgThroughputPerHour.toFixed(1)}
        sub="jobs / hour avg"
        icon={Zap}
        colorClass="text-blue-400"
      />
      <MetricCard
        title="Avg Process Time"
        value={formatDuration(summary.avgProcessingTimeMs)}
        sub="per job"
        icon={Clock}
        colorClass="text-purple-400"
      />
    </div>
  );
}
