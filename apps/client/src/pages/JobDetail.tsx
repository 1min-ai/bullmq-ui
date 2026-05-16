import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, RotateCcw, Trash2, ArrowUp, Copy } from "lucide-react";
import { jobsApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { JobStatusBadge } from "@/components/shared/JobStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration, formatTimestamp, formatRelative } from "@/lib/utils";

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="relative group">
        <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap break-all">
          {text}
        </pre>
        <button
          onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-right font-mono">{value}</span>
    </div>
  );
}

export default function JobDetail() {
  const { queueName: rawQueue, jobId } = useParams<{ queueName: string; jobId: string }>();
  const queueName = decodeURIComponent(rawQueue ?? "");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: job, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["job", queueName, jobId],
    queryFn: () => jobsApi.get(queueName, jobId!),
    refetchInterval: 5_000,
    enabled: !!jobId,
  });

  const { data: logsData } = useQuery({
    queryKey: ["job-logs", queueName, jobId],
    queryFn: () => jobsApi.logs(queueName, jobId!),
    enabled: !!jobId,
    refetchInterval: 5_000,
  });

  const retryMutation = useMutation({
    mutationFn: () => jobsApi.retry(queueName, jobId!),
    onSuccess: () => { toast.success("Job retried"); qc.invalidateQueries({ queryKey: ["job"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteMutation = useMutation({
    mutationFn: () => jobsApi.promote(queueName, jobId!),
    onSuccess: () => { toast.success("Job promoted to waiting"); qc.invalidateQueries({ queryKey: ["job"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => jobsApi.remove(queueName, jobId!),
    onSuccess: () => {
      toast.success("Job removed");
      navigate(`/queues/${encodeURIComponent(queueName)}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const processingTime =
    job?.processedOn && job?.finishedOn ? job.finishedOn - job.processedOn : null;
  const progress = typeof job?.progress === "number" ? job.progress : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/queues/${encodeURIComponent(queueName)}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-3 w-3" /> {queueName}
        </Link>
        <Header
          title={isLoading ? "Loading…" : `Job ${jobId}`}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        >
          {job?.status === "failed" && (
            <Button variant="outline" size="sm" onClick={() => retryMutation.mutate()}>
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
          )}
          {job?.status === "delayed" && (
            <Button variant="outline" size="sm" onClick={() => promoteMutation.mutate()}>
              <ArrowUp className="h-4 w-4" /> Promote
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => removeMutation.mutate()}
          >
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </Header>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : !job ? (
        <p className="text-muted-foreground text-sm">Job not found.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-0">
                <InfoRow label="Status" value={<JobStatusBadge status={job.status} />} />
                <InfoRow label="Name" value={job.name} />
                <InfoRow label="Queue" value={job.queueName} />
                <InfoRow label="ID" value={job.id} />
                <InfoRow label="Attempts" value={`${job.attemptsMade} / ${job.attemptsLimit}`} />
                {typeof job.priority === "number" && (
                  <InfoRow label="Priority" value={job.priority} />
                )}
                {typeof job.delay === "number" && job.delay > 0 && (
                  <InfoRow label="Delay" value={formatDuration(job.delay)} />
                )}
                <InfoRow label="Added" value={formatTimestamp(job.timestamp)} />
                {job.processedOn && (
                  <InfoRow label="Started" value={formatTimestamp(job.processedOn)} />
                )}
                {job.finishedOn && (
                  <InfoRow label="Finished" value={formatTimestamp(job.finishedOn)} />
                )}
                {processingTime !== null && (
                  <InfoRow label="Duration" value={formatDuration(processingTime)} />
                )}
              </CardContent>
            </Card>

            {typeof job.progress === "number" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="h-2" />
                  <p className="text-right text-xs text-muted-foreground mt-1">{progress}%</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: data/result/logs tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="data">
              <TabsList>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="result">Result</TabsTrigger>
                {job.failedReason && <TabsTrigger value="error">Error</TabsTrigger>}
                <TabsTrigger value="logs">Logs ({logsData?.count ?? 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="mt-4">
                <JsonBlock value={job.data} label="Input data" />
              </TabsContent>

              <TabsContent value="result" className="mt-4">
                {job.returnValue !== undefined ? (
                  <JsonBlock value={job.returnValue} label="Return value" />
                ) : (
                  <p className="text-sm text-muted-foreground">No return value.</p>
                )}
              </TabsContent>

              {job.failedReason && (
                <TabsContent value="error" className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Error message</p>
                    <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
                      <p className="text-xs font-mono text-destructive whitespace-pre-wrap">{job.failedReason}</p>
                    </div>
                  </div>
                  {job.stacktrace && job.stacktrace.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stacktrace</p>
                      <ScrollArea className="h-64 rounded-md bg-muted p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap">{job.stacktrace.join("\n")}</pre>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="logs" className="mt-4">
                {!logsData || logsData.logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logs for this job.</p>
                ) : (
                  <ScrollArea className="h-64 rounded-md bg-muted p-3">
                    <div className="space-y-1">
                      {logsData.logs.map((log, i) => (
                        <p key={i} className="text-xs font-mono">{log}</p>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
