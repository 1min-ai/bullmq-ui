# BullMQ UI

A lightweight, self-hosted UI for managing BullMQ queues and jobs. Built with Bun, Hono, React, and shadcn/ui.

![Dark UI with queue overview, job stats, and throughput charts]

## Features

- **Overview** — throughput charts, processing time, slowest & most-failing job types
- **Queues** — list all queues with job counts, pause / resume / clean / delete
- **Jobs** — global job table with filters by queue, status, and name; retry / promote / remove per row
- **Job detail** — data, result, error, and logs tabs with progress bar
- **Workers** — live view of connected workers per queue
- **Redis** — supports local Redis, password auth, TLS (`rediss://`), Valkey, AWS ElastiCache

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- Redis (local, Docker, or remote)

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your `REDIS_URL`:

```env
# Local Redis
REDIS_URL=redis://localhost:6379

# Redis with password
REDIS_URL=redis://:yourpassword@localhost:6379

# TLS (Valkey / AWS ElastiCache)
REDIS_URL=rediss://user:pass@hostname:6380
```

### 3. Start in development mode

Runs the server (port 3001) and the Vite dev server (port 5173) concurrently with hot reload:

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Build and run for production

```bash
bun run build
bun run start
```

Open [http://localhost:3001](http://localhost:3001)

---

## Docker

### Run with Docker Compose (includes Redis)

```bash
docker compose up -d
```

Open [http://localhost:3001](http://localhost:3001)

### Connect to an external Redis

```bash
REDIS_URL=redis://your-redis-host:6379 docker compose up -d bullmq-studio
```

### Build the image manually

```bash
docker build -t bullmq-studio .
docker run -p 3001:3001 -e REDIS_URL=redis://host.docker.internal:6379 bullmq-studio
```

---

## Environment Variables

| Variable           | Default                    | Description                          |
|--------------------|----------------------------|--------------------------------------|
| `REDIS_URL`        | `redis://localhost:6379`   | Redis connection URL                 |
| `PORT`             | `3001`                     | Server port                          |
| `HOST`             | `0.0.0.0`                  | Server bind address                  |
| `NODE_ENV`         | `development`              | `production` disables CORS wildcard  |
| `BULLMQ_USERNAME`  | —                          | Enable HTTP basic auth (username)    |
| `BULLMQ_PASSWORD`  | —                          | Enable HTTP basic auth (password)    |

---

## Project Structure

```
bullmq-studio/
├── apps/
│   ├── client/          # Vite + React + shadcn/ui
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── lib/
│   │       └── types/
│   └── server/          # Bun + Hono + BullMQ
│       └── src/
│           ├── routes/
│           ├── services/
│           └── types/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Runtime  | [Bun](https://bun.sh)                   |
| Server   | [Hono](https://hono.dev)                |
| Queue    | [BullMQ](https://docs.bullmq.io)        |
| Redis    | [ioredis](https://github.com/redis/ioredis) |
| Client   | React 18, Vite, TypeScript              |
| UI       | [shadcn/ui](https://ui.shadcn.com), Tailwind CSS |
| Charts   | [Recharts](https://recharts.org)        |
