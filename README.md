# Multiplayer Game Backend

Real-time multiplayer game platform. TypeScript-based monorepo: Express + Socket.io backend, React + Vite frontend, shared type layer.

## Tech Stack

- **Backend:** Node.js 20 · Express 5 · Socket.io 4 · TypeScript 5
- **Frontend:** React 19 · Vite · TypeScript · TailwindCSS v4
- **Database:** Neon (serverless PostgreSQL) + Drizzle ORM
- **Cache / Realtime State:** Redis (ioredis)
- **Auth:** JWT (registered + guest), bcryptjs
- **Deployment:** Render (backend, WebSocket-enabled) · Vercel (frontend SPA) · Redis Cloud · Neon

## Project Structure

```
multiplayer-game/
├── server/    # Node.js + Express + Socket.io backend
├── client/    # React + Vite frontend (Vercel deploy)
├── shared/    # Shared TypeScript types (wire contract)
├── STEPS.md   # Step-by-step build guide
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (local Docker or Neon dev branch)
- Redis 7 (local Docker or Redis Cloud)

### Installation

```bash
# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install

# Shared type package (for type-checking if not using workspaces)
cd ../shared && npm install
```

### Environment Variables

```bash
# server/.env.example → server/.env
cp server/.env.example server/.env

# client/.env.example → client/.env
cp client/.env.example client/.env
```

At minimum, fill in `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `CLIENT_ORIGIN` inside `server/.env`.

### Database Setup

```bash
cd server
npm run db:generate   # generate migration if schema changed
npm run db:migrate    # apply migrations
```

### Running

```bash
# Server (development, tsx watch)
cd server && npm run dev

# Client (development, Vite HMR)
cd client && npm run dev
```

## Deploy

- **Backend:** Render Web Service — WebSocket-enabled plan, predeploy = `npm --prefix server run db:migrate`
- **Frontend:** Vercel — Root Directory `client/`, framework auto-detect (Vite). SPA rewrite + cache headers committed via `client/vercel.json`
- **DB:** Neon Postgres — use pooled connection string (`-pooler` prefixed)
- **Cache:** Redis Cloud free tier (30 MB)

See `STEPS.md` (Step 55) for detailed deployment instructions.

## License

[PolyForm Noncommercial 1.0.0](LICENSE)
