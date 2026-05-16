import { Hono } from "hono";
import { ensureConnected, getService } from "../services/bullmq-service.js";

const app = new Hono();

app.get("/info", async (c) => {
  try {
    const svc = await ensureConnected();
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    let parsed: URL | null = null;
    try {
      parsed = new URL(redisUrl);
    } catch {}

    const host = parsed?.hostname ?? "localhost";
    const port = parsed?.port ?? "6379";
    const hasPassword = !!(parsed?.password);
    const database = parsed?.pathname?.slice(1) || "0";

    return c.json({
      connected: svc.isConnected(),
      host,
      port,
      hasPassword,
      database,
      displayUrl: `${host}:${port}`,
    });
  } catch (err: unknown) {
    return c.json({ connected: false, error: String(err) }, 500);
  }
});

app.get("/redis-info", async (c) => {
  try {
    const svc = await ensureConnected();
    const info = await svc.getRedisInfo();
    return c.json(info);
  } catch (err: unknown) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/status", (c) => {
  const svc = getService();
  return c.json({ connected: svc.isConnected() });
});

export default app;
