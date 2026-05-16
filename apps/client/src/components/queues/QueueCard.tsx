import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Trash2, Eraser, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { queuesApi } from "@/lib/api";
import type { Queue } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  queue: Queue;
}

const STATUS_COLORS: Record<string, string> = {
  waiting: "text-yellow-400",
  active: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
  delayed: "text-orange-400",
  paused: "text-zinc-400",
};

function Stat({ label, value, colorClass }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-bold tabular-nums", colorClass ?? "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground capitalize">{label}</p>
    </div>
  );
}

export function QueueCard({ queue }: Props) {
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const pauseMutation = useMutation({
    mutationFn: () => queue.isPaused ? queuesApi.resume(queue.name) : queuesApi.pause(queue.name),
    onSuccess: () => {
      toast.success(queue.isPaused ? "Queue resumed" : "Queue paused");
      qc.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cleanMutation = useMutation({
    mutationFn: () => queuesApi.clean(queue.name, { grace: 0, limit: 10000, status: "completed" }),
    onSuccess: (r) => {
      toast.success(`Cleaned ${r.removed} completed jobs`);
      qc.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => queuesApi.delete(queue.name),
    onSuccess: () => {
      toast.success(`Queue "${queue.name}" deleted`);
      qc.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = Object.values(queue.jobCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      <Card className="hover:border-primary/40 transition-colors group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <Link
                to={`/queues/${encodeURIComponent(queue.name)}`}
                className="font-mono text-sm font-semibold hover:text-primary truncate block"
              >
                {queue.name}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium",
                  queue.isPaused
                    ? "bg-zinc-500/20 text-zinc-400"
                    : "bg-green-500/20 text-green-400"
                )}>
                  {queue.isPaused ? "Paused" : "Running"}
                </span>
                <span className="text-xs text-muted-foreground">{total} jobs</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => pauseMutation.mutate()}>
                  {queue.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {queue.isPaused ? "Resume" : "Pause"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cleanMutation.mutate()}>
                  <Eraser className="h-4 w-4" />
                  Clean completed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Stat label="waiting" value={queue.jobCounts.waiting} colorClass={STATUS_COLORS.waiting} />
            <Stat label="active" value={queue.jobCounts.active} colorClass={STATUS_COLORS.active} />
            <Stat label="failed" value={queue.jobCounts.failed} colorClass={STATUS_COLORS.failed} />
            <Stat label="delayed" value={queue.jobCounts.delayed} colorClass={STATUS_COLORS.delayed} />
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2">
            <Stat label="completed" value={queue.jobCounts.completed} colorClass={STATUS_COLORS.completed} />
            <Stat label="paused" value={queue.jobCounts.paused} colorClass={STATUS_COLORS.paused} />
            <Stat label="prioritized" value={queue.jobCounts.prioritized} colorClass="text-purple-400" />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete queue "{queue.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the queue and all its jobs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
