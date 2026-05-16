import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/types";

const STATUS_LABELS: Record<JobStatus, string> = {
  waiting: "Waiting",
  active: "Active",
  completed: "Completed",
  failed: "Failed",
  delayed: "Delayed",
  paused: "Paused",
  prioritized: "Prioritized",
  "waiting-children": "Waiting Children",
};

interface Props {
  status: JobStatus;
}

export function JobStatusBadge({ status }: Props) {
  const variant = status as Parameters<typeof Badge>[0]["variant"];
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}
