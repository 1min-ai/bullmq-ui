import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative, truncate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { AlertCircle } from "lucide-react";
import type { FailingJobType } from "@/types";

interface Props {
  jobTypes: FailingJobType[];
}

export function FailingJobTypesTable({ jobTypes }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Failing Job Types</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {jobTypes.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title="No failures"
            description="No failed jobs in this time range."
            className="py-8"
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Job Type</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Queue</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Failures</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Last</th>
                </tr>
              </thead>
              <tbody>
                {jobTypes.map((jt) => (
                  <tr key={`${jt.queueName}-${jt.name}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{jt.name}</span>
                      {jt.lastFailedReason && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                          {truncate(jt.lastFailedReason, 60)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{jt.queueName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-semibold text-red-400">{jt.failureCount}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {jt.lastFailedAt ? formatRelative(jt.lastFailedAt) : "—"}
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
