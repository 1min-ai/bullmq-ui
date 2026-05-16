import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ensureConnected } from "../services/bullmq-service.js";

const app = new Hono();

const jobStatusSchema = z.enum([
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
  "waiting-children",
]);

const listSchema = z.object({
  queueName: z.string().optional(),
  status: jobStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
  summary: z.coerce.boolean().default(true),
});

app.get("/", zValidator("query", listSchema), async (c) => {
  try {
    const svc = await ensureConnected();
    const { queueName, status, limit, offset, summary } = c.req.valid("query");

    const queues = await svc.getQueues();
    const toFetch = queueName
      ? queues.filter((q) => q.name === queueName)
      : queues;

    const allJobs = [];
    for (const queue of toFetch) {
      if (summary) {
        const jobs = await svc.getJobsSummary(queue.name, {
          filter: status ? { status } : undefined,
          limit,
          offset,
        });
        allJobs.push(...jobs);
      } else {
        const jobs = await svc.getJobs(queue.name, {
          filter: status ? { status } : undefined,
          limit,
          offset,
        });
        allJobs.push(...jobs);
      }
    }

    allJobs.sort((a, b) => b.timestamp - a.timestamp);
    return c.json(allJobs);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

const addSchema = z.object({
  queueName: z.string().min(1),
  jobName: z.string().min(1),
  data: z.string().default("{}"),
  options: z
    .object({
      delay: z.number().min(0).optional(),
      priority: z.number().min(0).optional(),
      attempts: z.number().min(1).optional(),
      repeat: z
        .object({
          pattern: z.string().optional(),
          every: z.number().min(1).optional(),
          limit: z.number().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});

app.post("/", zValidator("json", addSchema), async (c) => {
  try {
    const svc = await ensureConnected();
    const body = c.req.valid("json");

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(body.data);
    } catch {
      return c.json({ error: "Invalid JSON in job data" }, 400);
    }

    const jobId = await svc.addJob(
      body.queueName,
      body.jobName,
      parsedData,
      body.options,
    );
    return c.json({ success: true, jobId }, 201);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/:queueName/:jobId", async (c) => {
  try {
    const svc = await ensureConnected();
    const job = await svc.getJob(
      c.req.param("queueName"),
      c.req.param("jobId"),
    );
    if (!job) return c.json({ error: "Job not found" }, 404);
    return c.json(job);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/:queueName/:jobId/logs", async (c) => {
  try {
    const svc = await ensureConnected();
    const logs = await svc.getJobLogs(
      c.req.param("queueName"),
      c.req.param("jobId"),
    );
    return c.json(logs);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/:queueName/:jobId/retry", async (c) => {
  try {
    const svc = await ensureConnected();
    const { queueName, jobId } = c.req.param();
    const job = await svc.getJob(queueName, jobId);
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.status !== "failed")
      return c.json({ error: `Job is not failed (status: ${job.status})` }, 400);
    await svc.retryJob(queueName, jobId);
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/:queueName/:jobId/promote", async (c) => {
  try {
    const svc = await ensureConnected();
    const { queueName, jobId } = c.req.param();
    const job = await svc.getJob(queueName, jobId);
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.status !== "delayed")
      return c.json({ error: `Job is not delayed (status: ${job.status})` }, 400);
    await svc.promoteJob(queueName, jobId);
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.delete("/:queueName/:jobId", async (c) => {
  try {
    const svc = await ensureConnected();
    const { queueName, jobId } = c.req.param();
    const job = await svc.getJob(queueName, jobId);
    if (!job) return c.json({ error: "Job not found" }, 404);
    await svc.removeJob(queueName, jobId);
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

export default app;
