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

export interface Job extends JobSummary {
  data: unknown;
  attemptsLimit: number;
  stacktrace?: string[];
  returnValue?: unknown;
  repeatJobKey?: string;
}

export interface TimeSeriesPoint {
  timestamp: number;
  completed: number;
  failed: number;
  avgProcessingTimeMs: number;
}

export interface SlowJob {
  id: string;
  name: string;
  queueName: string;
  processingTimeMs: number;
  timestamp: number;
  status: string;
}

export interface FailingJobType {
  name: string;
  queueName: string;
  failureCount: number;
  lastFailedAt: number;
  lastFailedReason?: string;
}

export interface QueueCount {
  name: string;
  isPaused: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  prioritized: number;
  waitingChildren: number;
}

export interface OverviewMetrics {
  summary: {
    totalCompleted: number;
    totalFailed: number;
    avgThroughputPerHour: number;
    failureRate: number;
    avgProcessingTimeMs: number;
    avgDelayMs: number;
  };
  timeSeries: TimeSeriesPoint[];
  slowestJobs: SlowJob[];
  failingJobTypes: FailingJobType[];
  queuesCount: number;
  queueCounts: QueueCount[];
  lastUpdated: number;
}
