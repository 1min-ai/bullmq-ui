import { useQuery } from "@tanstack/react-query";
import { Database, Wifi, WifiOff } from "lucide-react";
import { connectionApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium font-mono truncate">{value}</p>
    </div>
  );
}

export function RedisInfoCard() {
  const { data: connInfo, isLoading: loadingConn } = useQuery({
    queryKey: ["connection", "info"],
    queryFn: connectionApi.info,
    refetchInterval: 30_000,
  });

  const { data: redisInfo, isLoading: loadingRedis } = useQuery({
    queryKey: ["connection", "redis-info"],
    queryFn: connectionApi.redisInfo,
    refetchInterval: 30_000,
  });

  const loading = loadingConn || loadingRedis;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Redis
          </CardTitle>
          {!loading && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                connInfo?.connected ? "text-green-400" : "text-destructive"
              }`}
            >
              {connInfo?.connected ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {connInfo?.connected ? "Connected" : "Disconnected"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4">
            <InfoCell
              label="Host"
              value={connInfo?.displayUrl ?? "—"}
            />
            <InfoCell
              label="Database"
              value={connInfo?.database || "0"}
            />
            <InfoCell
              label="Version"
              value={redisInfo?.version ?? "—"}
            />
            <InfoCell
              label="Mode"
              value={
                <span className="capitalize">{redisInfo?.mode ?? "—"}</span>
              }
            />
            <InfoCell
              label="Used Memory"
              value={redisInfo?.usedMemory ?? "—"}
            />
            <InfoCell
              label="Clients"
              value={
                redisInfo
                  ? `${redisInfo.connectedClients.toLocaleString()} / ${redisInfo.maxClients.toLocaleString()}`
                  : "—"
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
