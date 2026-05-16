import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Layers } from "lucide-react";
import { overviewApi, queuesApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { MetricCardsGrid } from "@/components/overview/MetricCardsGrid";
import { ThroughputChart } from "@/components/overview/ThroughputChart";
import { ProcessingTimeChart } from "@/components/overview/ProcessingTimeChart";
import { SlowestJobsTable } from "@/components/overview/SlowestJobsTable";
import { FailingJobTypesTable } from "@/components/overview/FailingJobTypesTable";
import { RedisInfoCard } from "@/components/overview/RedisInfoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TIME_RANGES = [
  { value: "1", label: "Last 1h" },
  { value: "6", label: "Last 6h" },
  { value: "24", label: "Last 24h" },
  { value: "72", label: "Last 3d" },
  { value: "168", label: "Last 7d" },
];

const ALL = "__all__";

export default function Overview() {
  const [queueName, setQueueName] = useState("");
  const [timeRange, setTimeRange] = useState(24);

  const { data: queues, isLoading: loadingQueues } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
    refetchInterval: 15_000,
  });

  const {
    data: metrics,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["overview", queueName, timeRange],
    queryFn: () => overviewApi.metrics({ queueName: queueName || undefined, timeRangeHours: timeRange }),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <Header
        title="Overview"
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      >
        <Select
          value={queueName || ALL}
          onValueChange={(v) => setQueueName(v === ALL ? "" : v)}
          disabled={loadingQueues}
        >
          <SelectTrigger className="w-44">
            <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All queues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All queues</SelectItem>
            {queues?.map((q) => (
              <SelectItem key={q.name} value={q.name}>{q.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(timeRange)} onValueChange={(v) => setTimeRange(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Header>
      <RedisInfoCard />
      {isLoading ? (
        <OverviewSkeleton />
      ) : queues?.length === 0 ? (
        <EmptyState
          icon={<Database className="h-12 w-12" />}
          title="No queues found"
          description="No BullMQ queues were found in Redis. Create a queue in your application to get started."
        />
      ) : metrics ? (
        <div className="space-y-6">
          <MetricCardsGrid summary={metrics.summary} timeRange={timeRange} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ThroughputChart data={metrics.timeSeries} timeRange={timeRange} />
            <ProcessingTimeChart data={metrics.timeSeries} timeRange={timeRange} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SlowestJobsTable jobs={metrics.slowestJobs} />
            <FailingJobTypesTable jobTypes={metrics.failingJobTypes} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
