import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import connectionRoutes from "./routes/connection.js";
import queuesRoutes from "./routes/queues.js";
import jobsRoutes from "./routes/jobs.js";
import overviewRoutes from "./routes/overview.js";
import { ensureConnected } from "./services/bullmq-service.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Health check
app.get("/health", (c) => c.json({ ok: true }));
app.get("/healthz", (c) => c.json({ ok: true }));

// API routes
app.route("/api/connection", connectionRoutes);
app.route("/api/queues", queuesRoutes);
app.route("/api/jobs", jobsRoutes);
app.route("/api/overview", overviewRoutes);

// Serve client build in production
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./public" }));
  app.get("*", serveStatic({ path: "./public/index.html" }));
}

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

// Connect to Redis on startup
ensureConnected()
  .then(() => {
    console.log(`[bullmq-studio] Connected to Redis`);
  })
  .catch((err: unknown) => {
    console.error(`[bullmq-studio] Redis connection failed:`, err);
    console.warn(`[bullmq-studio] Server will retry on first request`);
  });

serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`[bullmq-studio] Server running at http://${HOST}:${info.port}`);
});
