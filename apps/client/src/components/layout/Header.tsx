import { RefreshCw, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { connectionApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode;
}

export function Header({ title, onRefresh, isRefreshing, children }: Props) {
  const { data: conn } = useQuery({
    queryKey: ["connection-status"],
    queryFn: connectionApi.info,
    refetchInterval: 30_000,
  });

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold truncate">{title}</h1>
        {conn && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Circle
              className={cn(
                "h-2 w-2 fill-current",
                conn.connected ? "text-green-500" : "text-red-500",
              )}
            />
            <span className="text-xs text-muted-foreground font-mono">
              {conn.displayUrl}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {children}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}
