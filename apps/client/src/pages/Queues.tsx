import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { queuesApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { QueueCard } from "@/components/queues/QueueCard";
import { AddJobDialog } from "@/components/jobs/AddJobDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export default function Queues() {
  const [search, setSearch] = useState("");

  const { data: queues, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
    refetchInterval: 15_000,
  });

  const filtered = queues?.filter((q) =>
    q.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <Header title="Queues" onRefresh={() => refetch()} isRefreshing={isFetching}>
        <AddJobDialog />
      </Header>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter queues…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title={search ? "No matching queues" : "No queues found"}
          description={
            search
              ? `No queues match "${search}"`
              : "No BullMQ queues detected in Redis."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered?.map((q) => <QueueCard key={q.name} queue={q} />)}
        </div>
      )}
    </div>
  );
}
