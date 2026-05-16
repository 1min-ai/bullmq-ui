import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ensureConnected } from "../services/bullmq-service.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const svc = await ensureConnected();
    const queues = await svc.getQueues();
    return c.json(queues);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/:name", async (c) => {
  try {
    const svc = await ensureConnected();
    const queue = await svc.getQueue(c.req.param("name"));
    if (!queue) return c.json({ error: "Queue not found" }, 404);
    return c.json(queue);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/:name/pause", async (c) => {
  try {
    const svc = await ensureConnected();
    await svc.pauseQueue(c.req.param("name"));
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/:name/resume", async (c) => {
  try {
    const svc = await ensureConnected();
    await svc.resumeQueue(c.req.param("name"));
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

const cleanSchema = z.object({
  grace: z.number().min(0).default(0),
  limit: z.number().min(1).default(1000),
  status: z.enum(["completed", "failed", "delayed", "active", "wait"]).default("completed"),
});

app.post(
  "/:name/clean",
  zValidator("json", cleanSchema),
  async (c) => {
    try {
      const svc = await ensureConnected();
      const body = c.req.valid("json");
      const removed = await svc.cleanQueue(
        c.req.param("name"),
        body.grace,
        body.limit,
        body.status,
      );
      return c.json({ success: true, removed: removed.length });
    } catch (err: unknown) {
      return c.json({ error: String(err) }, 500);
    }
  },
);

app.delete("/:name", async (c) => {
  try {
    const svc = await ensureConnected();
    await svc.deleteQueue(c.req.param("name"));
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/:name/workers", async (c) => {
  try {
    const svc = await ensureConnected();
    const workers = await svc.getWorkers(c.req.param("name"));
    return c.json(workers);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

export default app;
