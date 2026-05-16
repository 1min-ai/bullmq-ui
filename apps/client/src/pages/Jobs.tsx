import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Search, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { jobsApi, queuesApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { AddJobDialog } from "@/components/jobs/AddJobDialog";
import { JobStatusBadge } from "@/components/shared/JobStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RotateCcw, Trash2, ArrowUp } from "lucide-react";
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
  { value: "all", label: "All statuses" },
  { value: "waiting", label: "Waiting" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "delayed", label: "Delayed" },
  { value: "paused", label: "Paused" },
];

function JobActions({ job }: { job: JobSummary }) {
  const qc = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: () => jobsApi.retry(job.queueName, job.id),
    onSuccess: () => { toast.success("Job retried"); qc.invalidateQueries({ queryKey: ["jobs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteMutation = useMutation({
    mutationFn: () => jobsApi.promote(job.queueName, job.id),
    onSuccess: () => { toast.success("Job promoted"); qc.invalidateQueries({ queryKey: ["jobs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => jobsApi.remove(job.queueName, job.id),
    onSuccess: () => { toast.success("Job removed"); qc.invalidateQueries({ queryKey: ["jobs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {job.status === "failed" && (
          <DropdownMenuItem onClick={() => retryMutation.mutate()}>
            <RotateCcw className="h-4 w-4" /> Retry
          </DropdownMenuItem>
        )}
        {job.status === "delayed" && (
          <DropdownMenuItem onClick={() => promoteMutation.mutate()}>
            <ArrowUp className="h-4 w-4" /> Promote
          </DropdownMenuItem>
        )}
        {job.repeatJobKey && <DropdownMenuSeparator />}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => removeMutation.mutate()}
        >
          <Trash2 className="h-4 w-4" />
          {job.repeatJobKey ? "Remove + Stop Schedule" : "Remove"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Jobs() {
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [queueName, setQueueName] = useState("all");
  const [search, setSearch] = useState("");
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

  const { data: queues } = useQuery({ queryKey: ["queues"], queryFn: queuesApi.list });

  const { data: jobs, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["jobs", "list", status, queueName],
    queryFn: () => jobsApi.list({
      status: status === "all" ? undefined : status,
      queueName: queueName === "all" ? undefined : queueName,
      limit: 500,
    }),
    refetchInterval: 10_000,
  });

  const filtered = jobs?.filter((j) =>
    !search ||
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    j.id.includes(search) ||
    j.queueName.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = filtered && sortField
    ? [...filtered].sort((a, b) => {
        const aVal = sortField === "timestamp" ? a.timestamp : (a.timestamp + (a.delay ?? 0));
        const bVal = sortField === "timestamp" ? b.timestamp : (b.timestamp + (b.delay ?? 0));
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      })
    : filtered;

  return (
    <div className="space-y-6">
      <Header title="Jobs" onRefresh={() => refetch()} isRefreshing={isFetching}>
        <AddJobDialog />
      </Header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as JobStatus | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={queueName} onValueChange={setQueueName}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All queues</SelectItem>
            {queues?.map((q) => (
              <SelectItem key={q.name} value={q.name}>{q.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : sorted?.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12" />}
          title="No jobs found"
          description="Try adjusting your filters."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{sorted?.length} jobs</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Queue</th>
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
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {sorted?.map((job) => (
                  <tr key={`${job.queueName}-${job.id}`} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/jobs/${encodeURIComponent(job.queueName)}/${job.id}`}
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
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{job.queueName}</td>
                    <td className="px-4 py-2.5">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{job.attemptsMade}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {formatNextRun(job) ?? <span className="text-border">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {formatRelative(job.timestamp)}
                    </td>
                    <td className="px-2 py-2.5">
                      <JobActions job={job} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
