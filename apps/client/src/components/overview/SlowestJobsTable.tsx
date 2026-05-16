import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatRelative } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { Timer } from "lucide-react";
import type { SlowJob } from "@/types";

interface Props {
  jobs: SlowJob[];
}

export function SlowestJobsTable({ jobs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Slowest Jobs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {jobs.length === 0 ? (
          <EmptyState
            icon={<Timer className="h-8 w-8" />}
            title="No data"
            description="No completed jobs in this time range."
            className="py-8"
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Job</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Queue</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Duration</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={`${job.queueName}-${job.id}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/jobs/${encodeURIComponent(job.queueName)}/${job.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{job.queueName}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-orange-400">
                      {formatDuration(job.processingTimeMs)}
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
      </CardContent>
    </Card>
  );
}
