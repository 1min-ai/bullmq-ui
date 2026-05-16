import type { Job, JobSummary, Queue, OverviewMetrics } from "@/types";
import { clearCredentials, getAuthHeader } from "@/lib/auth";

const BASE = "/api";

let redirectingToLogin = false;

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const authHeader = getAuthHeader();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 401) {
    if (!redirectingToLogin) {
      redirectingToLogin = true;
      clearCredentials();
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Connection ──────────────────────────────────────────────────────────────

export const connectionApi = {
  info: () => request<{ connected: boolean; host: string; port: string; displayUrl: string; hasPassword: boolean; database: string }>("/connection/info"),
  redisInfo: () => request<{ version: string; mode: string; usedMemory: string; totalMemory: string; connectedClients: number; maxClients: number }>("/connection/redis-info"),
};

// ── Queues ──────────────────────────────────────────────────────────────────

export const queuesApi = {
  list: () => request<Queue[]>("/queues"),
  get: (name: string) => request<Queue>(`/queues/${encodeURIComponent(name)}`),
  pause: (name: string) =>
    request<{ success: boolean }>(`/queues/${encodeURIComponent(name)}/pause`, { method: "POST" }),
  resume: (name: string) =>
    request<{ success: boolean }>(`/queues/${encodeURIComponent(name)}/resume`, { method: "POST" }),
  clean: (name: string, body: { grace?: number; limit?: number; status?: string }) =>
    request<{ success: boolean; removed: number }>(`/queues/${encodeURIComponent(name)}/clean`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  delete: (name: string) =>
    request<{ success: boolean }>(`/queues/${encodeURIComponent(name)}`, { method: "DELETE" }),
  workers: (name: string) =>
    request<unknown[]>(`/queues/${encodeURIComponent(name)}/workers`),
};

// ── Jobs ────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params?: { queueName?: string; status?: string; limit?: number; offset?: number; summary?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.queueName) q.set("queueName", params.queueName);
    if (params?.status) q.set("status", params.status);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.summary != null) q.set("summary", String(params.summary));
    return request<JobSummary[]>(`/jobs?${q}`);
  },
  get: (queueName: string, jobId: string) =>
    request<Job>(`/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`),
  logs: (queueName: string, jobId: string) =>
    request<{ logs: string[]; count: number }>(`/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/logs`),
  add: (body: { queueName: string; jobName: string; data: string; options?: Record<string, unknown> }) =>
    request<{ success: boolean; jobId: string }>("/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  retry: (queueName: string, jobId: string) =>
    request<{ success: boolean }>(`/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/retry`, { method: "POST" }),
  promote: (queueName: string, jobId: string) =>
    request<{ success: boolean }>(`/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/promote`, { method: "POST" }),
  remove: (queueName: string, jobId: string) =>
    request<{ success: boolean }>(`/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`, { method: "DELETE" }),
};

// ── Overview ─────────────────────────────────────────────────────────────────

export const overviewApi = {
  metrics: (params?: { queueName?: string; timeRangeHours?: number }) => {
    const q = new URLSearchParams();
    if (params?.queueName) q.set("queueName", params.queueName);
    if (params?.timeRangeHours != null)
      q.set("timeRangeHours", String(params.timeRangeHours));
    return request<OverviewMetrics>(`/overview/metrics?${q}`);
  },
};
