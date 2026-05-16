import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { queuesApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Workers() {
  const { data: queues, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
    refetchInterval: 10_000,
  });

  const { data: allWorkers, isLoading: loadingWorkers } = useQuery({
    queryKey: ["workers", queues?.map((q) => q.name)],
    queryFn: async () => {
      if (!queues) return [];
      const results = await Promise.all(
        queues.map(async (q) => {
          const ws = await queuesApi.workers(q.name);
          return (ws as Array<Record<string, unknown>>).map((w) => ({ ...w, queueName: q.name })) as Array<Record<string, unknown> & { queueName: string }>;
        }),
      );
      return results.flat();
    },
    enabled: !!queues && queues.length > 0,
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <Header title="Workers" onRefresh={() => refetch()} isRefreshing={isFetching} />

      {isLoading || loadingWorkers ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !allWorkers || allWorkers.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-12 w-12" />}
          title="No active workers"
          description="No workers are currently connected to any queue."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{allWorkers.length} worker{allWorkers.length !== 1 ? "s" : ""} connected</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allWorkers.map((w, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="active">Active</Badge>
                    <span className="text-xs font-mono text-muted-foreground">{String(w.queueName)}</span>
                  </div>
                  {w["addr"] != null && <p className="text-xs font-mono text-muted-foreground">{String(w["addr"])}</p>}
                  {w["id"] != null && <p className="text-xs text-muted-foreground">ID: {String(w["id"])}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
