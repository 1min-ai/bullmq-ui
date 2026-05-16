import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Pause, Play, Eraser, Trash2, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { queuesApi, jobsApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { AddJobDialog } from "@/components/jobs/AddJobDialog";
import { JobStatusBadge } from "@/components/shared/JobStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Separator } from "@/components/ui/separator";
import { Briefcase } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRelative } from "@/lib/utils";
import type { JobStatus, JobSummary } from "@/types";

type SortField = "nextRun" | "timestamp";

function SortIcon({ field, sortField, sortOrder }: { field: SortField; sortField: SortField | null; sortOrder: "asc" | "desc" }) {
  if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

function formatNextRun(job: JobSummary): string | null {
  if (job.status !== "delayed" || !job.delay) return null;
  const nextRun = job.timestamp + job.delay;
  const diff = nextRun - Date.now();
  if (diff <= 0) return "now";
  if (diff < 60_000) return `in ${Math.ceil(diff / 1000)}s`;
  if (diff < 3_600_000) return `in ${Math.ceil(diff / 60_000)}m`;
  if (diff < 86_400_000) return `in ${Math.floor(diff / 3_600_000)}h`;
  return new Date(nextRun).toLocaleDateString();
}

const STATUSES: { value: JobStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "delayed", label: "Delayed" },
  { value: "paused", label: "Paused" },
];

export default function QueueDetail() {
  const { name } = useParams<{ name: string }>();
  const queueName = decodeURIComponent(name ?? "");
  const qc = useQueryClient();
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cleanOpen, setCleanOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  const { data: queue, isLoading: loadingQueue, isFetching, refetch } = useQuery({
    queryKey: ["queues", queueName],
    queryFn: () => queuesApi.get(queueName),
    refetchInterval: 10_000,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs", queueName, status],
    queryFn: () => jobsApi.list({
      queueName,
      status: status === "all" ? undefined : status,
      limit: 200,
    }),
    refetchInterval: 10_000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => queue?.isPaused ? queuesApi.resume(queueName) : queuesApi.pause(queueName),
    onSuccess: () => {
      toast.success(queue?.isPaused ? "Queue resumed" : "Queue paused");
      qc.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cleanMutation = useMutation({
    mutationFn: () => queuesApi.clean(queueName, { grace: 0, limit: 10000, status: "completed" }),
    onSuccess: (r) => {
      toast.success(`Cleaned ${r.removed} completed jobs`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["queues"] });
      setCleanOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => queuesApi.delete(queueName),
    onSuccess: () => {
      toast.success(`Queue "${queueName}" deleted`);
      qc.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sortedJobs = jobs && sortField
    ? [...jobs].sort((a, b) => {
        const aVal = sortField === "timestamp" ? a.timestamp : (a.timestamp + (a.delay ?? 0));
        const bVal = sortField === "timestamp" ? b.timestamp : (b.timestamp + (b.delay ?? 0));
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      })
    : jobs;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/queues" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="h-3 w-3" /> Back to Queues
        </Link>
        <Header title={queueName} onRefresh={() => refetch()} isRefreshing={isFetching}>
          <Button variant="outline" size="sm" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
            {queue?.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {queue?.isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCleanOpen(true)}>
            <Eraser className="h-4 w-4" /> Clean
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <AddJobDialog defaultQueue={queueName} />
        </Header>
      </div>

      {/* Job Counts */}
      {loadingQueue ? (
        <div className="flex gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-24" />)}
        </div>
      ) : queue ? (
        <div className="flex flex-wrap gap-3">
          {Object.entries(queue.jobCounts).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setStatus(k === "waitingChildren" ? "waiting-children" : k as JobStatus)}
              className="flex flex-col items-center px-4 py-2 rounded-lg border border-border hover:border-primary/40 transition-colors bg-card"
            >
              <span className="text-xl font-bold tabular-nums">{v}</span>
              <span className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Separator />

      {/* Jobs Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as JobStatus | "all")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{jobs?.length ?? 0} jobs</span>
        </div>

        {loadingJobs ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : jobs?.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-10 w-10" />}
            title="No jobs"
            description={`No ${status === "all" ? "" : status + " "}jobs in this queue.`}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Attempts</th>
                  <th
                    className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("nextRun")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <SortIcon field="nextRun" sortField={sortField} sortOrder={sortOrder} />
                      Next Run
                    </div>
                  </th>
                  <th
                    className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("timestamp")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <SortIcon field="timestamp" sortField={sortField} sortOrder={sortOrder} />
                      Added
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs?.map((job) => (
                  <tr key={job.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/jobs/${encodeURIComponent(queueName)}/${job.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {job.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">{job.name}</span>
                        {job.repeatJobKey && (
                          <span title="Scheduled (repeating)">
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {job.attemptsMade}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {formatNextRun(job) ?? <span className="text-border">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {formatRelative(job.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete queue "{queueName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the queue and all its jobs. Cannot be undone.
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

      {/* Clean Dialog */}
      <AlertDialog open={cleanOpen} onOpenChange={setCleanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clean completed jobs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all completed jobs from "{queueName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => cleanMutation.mutate()}>Clean</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
