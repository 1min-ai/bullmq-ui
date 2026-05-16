export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused"
  | "prioritized"
  | "waiting-children";

export interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  prioritized: number;
  waitingChildren: number;
}

export interface Queue {
  name: string;
  isPaused: boolean;
  jobCounts: JobCounts;
}

export interface Job {
  id: string;
  name: string;
  queueName: string;
  data: unknown;
  status: JobStatus;
  progress: number | object;
  attemptsMade: number;
  attemptsLimit: number;
  failedReason?: string;
  stacktrace?: string[];
  returnValue?: unknown;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  delay?: number;
  priority?: number;
  parentId?: string;
  repeatJobKey?: string;
}

export interface JobSummary {
  id: string;
  name: string;
  queueName: string;
  status: JobStatus;
  progress: number | object;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  delay?: number;
  priority?: number;
  parentId?: string;
}

export interface JobQueryOptions {
  filter?: {
    status?: JobStatus | JobStatus[];
    name?: string;
  };
  sort?: {
    field: "timestamp" | "processedOn" | "finishedOn" | "progress";
    order: "asc" | "desc";
  };
  limit?: number;
  offset?: number;
}

export interface RedisInfo {
  version: string;
  mode: string;
  usedMemory: string;
  totalMemory: string;
  connectedClients: number;
  maxClients: number;
}

export interface WorkerInfo {
  id: string;
  name: string;
  addr: string;
  age: number;
  idle: number;
  flags: string;
  db: number;
  cmd: string;
  events: string;
}
