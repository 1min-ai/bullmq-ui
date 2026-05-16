import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ensureConnected } from "../services/bullmq-service.js";
import type { JobSummary } from "../types/index.js";

const app = new Hono();

const metricsSchema = z.object({
  queueName: z.string().optional(),
  timeRangeHours: z.coerce.number().min(1).max(168).default(24),
});

app.get("/metrics", zValidator("query", metricsSchema), async (c) => {
  try {
    const svc = await ensureConnected();
    const { queueName, timeRangeHours } = c.req.valid("query");

    const allQueues = await svc.getQueues();
    const timeRangeMs = timeRangeHours * 60 * 60 * 1000;
    const cutoff = Date.now() - timeRangeMs;

    const toProcess = queueName
      ? allQueues.filter((q) => q.name === queueName)
      : allQueues;

    const allJobs: JobSummary[] = [];
    for (const queue of toProcess) {
      const [completed, failed] = await Promise.all([
        svc.getJobsSummary(queue.name, {
          filter: { status: "completed" },
          limit: 1000,
        }),
        svc.getJobsSummary(queue.name, {
          filter: { status: "failed" },
          limit: 1000,
        }),
      ]);
      allJobs.push(
        ...completed.filter((j) => j.finishedOn && j.finishedOn >= cutoff),
        ...failed.filter((j) => j.finishedOn && j.finishedOn >= cutoff),
      );
    }

    const metrics = buildMetrics(allJobs, timeRangeHours, toProcess.length);

    // Also include live queue counts
    const queueCounts = toProcess.map((q) => ({
      name: q.name,
      isPaused: q.isPaused,
      ...q.jobCounts,
    }));

    return c.json({ ...metrics, queueCounts });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

function buildMetrics(
  jobs: JobSummary[],
  timeRangeHours: number,
  queuesCount: number,
) {
  const completed = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");
  const withTime = jobs.filter((j) => j.processedOn && j.finishedOn);
  const withDelay = jobs.filter((j) => j.processedOn && j.timestamp);

  const avgProcessingTimeMs =
    withTime.length > 0
      ? withTime.reduce((s, j) => s + (j.finishedOn! - j.processedOn!), 0) /
        withTime.length
      : 0;

  const avgDelayMs =
    withDelay.length > 0
      ? Math.max(
          0,
          withDelay.reduce(
            (s, j) => s + (j.processedOn! - j.timestamp - (j.delay || 0)),
            0,
          ) / withDelay.length,
        )
      : 0;

  const total = completed.length + failed.length;

  return {
    summary: {
      totalCompleted: completed.length,
      totalFailed: failed.length,
      avgThroughputPerHour: total / timeRangeHours,
      failureRate: total > 0 ? (failed.length / total) * 100 : 0,
      avgProcessingTimeMs,
      avgDelayMs,
    },
    timeSeries: buildTimeSeries(jobs, timeRangeHours),
    slowestJobs: buildSlowest(withTime),
    failingJobTypes: buildFailingTypes(failed),
    queuesCount,
    lastUpdated: Date.now(),
  };
}

function buildTimeSeries(jobs: JobSummary[], hours: number) {
  const buckets = new Map<number, JobSummary[]>();
  const now = Date.now();
  for (let i = 0; i < hours; i++) {
    const t = now - i * 3600_000;
    const h = Math.floor(t / 3600_000) * 3600_000;
    buckets.set(h, []);
  }
  for (const job of jobs) {
    if (job.finishedOn) {
      const h = Math.floor(job.finishedOn / 3600_000) * 3600_000;
      buckets.get(h)?.push(job);
    }
  }
  return Array.from(buckets.entries())
    .map(([ts, bJobs]) => {
      const comp = bJobs.filter((j) => j.status === "completed").length;
      const fail = bJobs.filter((j) => j.status === "failed").length;
      const wt = bJobs.filter((j) => j.processedOn && j.finishedOn);
      return {
        timestamp: ts,
        completed: comp,
        failed: fail,
        avgProcessingTimeMs:
          wt.length > 0
            ? wt.reduce((s, j) => s + (j.finishedOn! - j.processedOn!), 0) /
              wt.length
            : 0,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function buildSlowest(jobs: JobSummary[]) {
  return jobs
    .map((j) => ({
      id: j.id,
      name: j.name,
      queueName: j.queueName,
      processingTimeMs: j.finishedOn! - j.processedOn!,
      timestamp: j.timestamp,
      status: j.status,
    }))
    .sort((a, b) => b.processingTimeMs - a.processingTimeMs)
    .slice(0, 10);
}

function buildFailingTypes(failed: JobSummary[]) {
  const grouped = new Map<string, JobSummary[]>();
  for (const job of failed) {
    const key = `${job.queueName}:${job.name}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(job);
  }
  return Array.from(grouped.entries())
    .map(([key, jobs]) => {
      const [queueName, ...rest] = key.split(":");
      const name = rest.join(":");
      const sorted = [...jobs].sort(
        (a, b) => (b.finishedOn || 0) - (a.finishedOn || 0),
      );
      const latest = sorted[0];
      return {
        name,
        queueName: queueName ?? "",
        failureCount: jobs.length,
        lastFailedAt: latest?.finishedOn || latest?.timestamp || 0,
        lastFailedReason: latest?.failedReason,
      };
    })
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 10);
}

export default app;
