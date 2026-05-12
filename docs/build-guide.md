# Multiplayer Game Backend — Step-by-Step Build Guide

> **Archived: original build playbook.**
> This document is the original roadmap used to build the Multiplayer Game Backend project from scratch. The codebase may have evolved since this guide was written — consult the [README](../README.md) for current setup, architecture, and deployment notes.

---

> **Project Summary:**
> A real-time multiplayer game platform built on Node.js + Socket.io with Redis as the live game-state store and Neon (serverless PostgreSQL) accessed through Drizzle ORM as the persistent user/leaderboard store. Two roles (Player, Admin) and two participation modes (registered + guest) are supported. Players can create/join rooms with a UUID code, auto-match through a queue, spectate live games, chat in-room, request rematches, and track stats on a global leaderboard. The system ships with two games — TicTacToe (2 players) and a simple 4-player card game — implemented behind a GameFactory pattern so additional games can be plugged in without touching transport, room, or state code. All game logic runs server-side; the client is a thin renderer that forwards intents (e.g., "play cell index 4") and renders the authoritative state pushed back over Socket.io. Security layers include JWT-authenticated WebSocket handshakes, helmet, strict CORS, per-route rate limiting, mass-assignment protection, parameterized SQL queries, RBAC guards, and admin self-protection.

Each step below is a self-contained prompt. Execute them in order.
Stack: **TypeScript 5** end-to-end, React 19 + Vite, Node 20 LTS, Express 5, Socket.io 4, **Neon (PostgreSQL serverless) + Drizzle ORM**, Redis (ioredis), JWT, TailwindCSS v4, React Router v7, Axios, socket.io-client.
Shared types live in a top-level `shared/` package consumed by both `server/` and `client/` so socket event payloads, game state shapes, JWT claims, and REST responses are statically guaranteed across the wire.

---

## Table of Contents

**PHASE 1 — Backend Foundation**
- STEP 1 — Project Scaffolding & Dependency Setup
- STEP 2 — Environment Configuration, Neon Postgres (Drizzle) & Redis Connection
- STEP 3 — User Model, Auth System & Admin Seed
- STEP 4 — Guest Authentication Flow

**PHASE 2 — Backend Resources (REST API)**
- STEP 5 — User Profile API (Public & Own)
- STEP 6 — Avatar Upload (Multer + File Validation)
- STEP 7 — Preferences API (Theme, Privacy, Notifications)
- STEP 8 — Match History Model & Stats Tracking
- STEP 9 — Leaderboard API
- STEP 10 — Admin REST API (Dashboard, User Management, Active Rooms)

**PHASE 3 — Socket.io Real-Time Foundation**
- STEP 11 — Socket.io Server Setup & JWT Auth Middleware
- STEP 12 — Redis Service Layer (Rooms, Queues, TTL)
- STEP 13 — Room Management Events (Create, Join, Leave)
- STEP 14 — Spectator Mode
- STEP 15 — Matchmaking Queue
- STEP 16 — In-Room Chat System

**PHASE 4 — Game Logic (Server-Side)**
- STEP 17 — GameFactory Pattern & Base Game Class
- STEP 18 — TicTacToe — Move Validation & Turn Mechanics
- STEP 19 — TicTacToe — Win Detection & State Lifecycle
- STEP 20 — Card Game — Deck, Shuffle & Deal
- STEP 21 — Card Game — Play Card & Follow-Suit Enforcement
- STEP 22 — Card Game — Trick Resolution & Final Scoring
- STEP 23 — Game Lifecycle (Start, Turn, End, Rematch)
- STEP 24 — Disconnect Handling & Reconnection (Server-Side)

**PHASE 5 — Backend Validation, Security & Logging**
- STEP 25 — REST Validators (express-validator chains)
- STEP 26 — Socket Event Validators (Type-Narrowing Helpers)
- STEP 27 — Comprehensive Security Audit Checklist
- STEP 28 — Logging & Observability (pino + structured logs)

**PHASE 6 — Backend Testing**
- STEP 29 — Unit Tests (Game Logic, Utils, Validators)
- STEP 30 — Integration Tests (REST + Socket.io flows)

**PHASE 7 — Client Foundation**
- STEP 31 — Client Setup: Vite, Tailwind, Axios, Socket.io-client
- STEP 32 — Reusable UI Kit (Button, Input, Modal, Spinner, Card, Badge)
- STEP 33 — Contexts: Auth, Socket, Preferences
- STEP 34 — Layouts, Navbar & Routing

**PHASE 8 — Client Pages**
- STEP 35 — Auth Pages (Login, Register, Guest Entry)
- STEP 36 — Home / Lobby Page (Create / Join / Matchmake)
- STEP 37 — Game Room Page Orchestration
- STEP 38 — Game Room Sub-Components (PlayerList, SpectatorList, ChatPanel, TurnIndicator, RematchPrompt)
- STEP 39 — TicTacToe Board Component
- STEP 40 — Card Game Component
- STEP 41 — Leaderboard Page
- STEP 42 — Profile Pages (Public & Own)
- STEP 43 — Settings Pages
- STEP 44 — Admin Pages (Dashboard, Users, Active Rooms)

**PHASE 9 — Client Polish**
- STEP 45 — Reconnection UX Flow (Banner, Retry, Rejoin Toast)
- STEP 46 — Animations & Game Feel (Transitions, Piece Drop, Card Flip, Win Highlight)
- STEP 47 — Sound Design (Preload, Volume, Mute, Contextual Triggers)
- STEP 48 — Accessibility (Keyboard Nav, ARIA, Focus Management, Screen Reader)
- STEP 49 — Performance (React.memo, Code Splitting, Lazy Routes, useCallback Strategy)
- STEP 50 — Responsive Design (Mobile Game Room, Touch Targets, Adaptive Board)

**PHASE 10 — Client Testing**
- STEP 51 — Component Tests (React Testing Library: forms, board, chat)

**PHASE 11 — DevOps & Deploy**
- STEP 52 — README & Architecture Documentation
- STEP 53 — CI/CD (GitHub Actions: typecheck + lint + test on PR)
- STEP 54 — Code Cleanup & Pre-Deploy Review
- STEP 55 — Production Deployment (Render + Vercel + Redis Cloud + Neon Postgres + optional Sentry)

---

## Global Build Rules (apply to EVERY step)

- Do not run `git` commands. Version control is handled manually by the user.
- Do not install packages not listed in the step's dependency list without explicit approval.
- Do not run long-running processes (dev servers, watchers) unless the step explicitly asks for it.
- Treat every step as self-contained: read its instructions, implement, verify acceptance criteria, then stop.
- Follow the project's TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`). No `any`, no `@ts-ignore`.
- All wire-crossing types (Socket.io events, REST responses, JWT claims) must come from `shared/types/*.ts` — never duplicate type definitions.

---

## Architecture at a Glance

```mermaid
flowchart LR
    Client["Client\nReact 19 + Vite\nsocket.io-client"]
    Server["Server\nExpress 5 + Socket.io 4\nNode 20 LTS"]
    Redis["Redis Cloud\nRooms, Queues, TTL"]
    Postgres["Neon Postgres\nUsers, Matches\nStats (jsonb)"]
    Vercel["Vercel\n(hosting)"]
    Render["Render\n(hosting)"]

    Client -->|"HTTPS REST + WSS\n(shared/ types)"| Server
    Server -->|"JWT auth"| Redis
    Server -->|"Drizzle ORM"| Postgres
    Client -.->|"deployed on"| Vercel
    Server -.->|"deployed on"| Render
```

```
                  +---------------+
                  |   Client      |  React 19 + Vite + TypeScript
                  |  (Vercel)     |  socket.io-client (typed)
                  +-------+-------+
                          |  HTTPS REST + WSS
                          |  (shared/ types ensure contract)
                          v
                  +---------------+
                  |   Server      |  Express 5 + Socket.io 4 + TypeScript
                  |  (Render)     |  Node 20 LTS, compiled to dist/
                  +---+-------+---+
                      |       |
             JWT auth |       | Drizzle ORM
                      v       v
               +---------+ +--------------+
               |  Redis  | |   Postgres   |
               | (Cloud) | |    (Neon)    |
               | Rooms,  | |  Users,      |
               | Queues, | |  Matches,    |
               | TTL     | |  Stats jsonb |
               +---------+ +--------------+
```

---

# PHASE 1 — BACKEND FOUNDATION

---

## STEP 1 — Project Scaffolding & Dependency Setup

Create a monorepo with three folders at the project root: `server/` (TypeScript Node/Express + Socket.io backend), `client/` (TypeScript React + Vite frontend), and `shared/` (a tiny package of cross-cutting TypeScript types consumed by both). Initialize each with its own `package.json` and `tsconfig.json`. Add a root `.gitignore`, a root `tsconfig.base.json`, and a top-level `README.md` placeholder.

**Top-level layout:**

```
multiplayer-game/
├── server/
├── client/
├── shared/
├── tsconfig.base.json     # shared compiler options
├── .gitignore
└── README.md
```

**Folder tree (`shared/`):** consumed by both server and client via a relative import path (`../shared/types`). No build step; `.ts` source files are imported directly via the consumer's TS compiler. No runtime code, types only.

```
shared/
├── types/
│   ├── auth.ts            # JwtPayload (discriminated union for guest/registered), AuthUser
│   ├── user.ts            # PublicUser, OwnUser, UserPreferences, UserStats
│   ├── match.ts           # MatchRecord, MatchPlayerSnapshot, MatchResult
│   ├── room.ts            # Room, RoomPlayer, RoomSpectator, RoomStatus
│   ├── games.ts           # GameType, Card, TicTacToeState, CardGameState, GameAction
│   ├── events.ts          # ClientToServerEvents, ServerToClientEvents (Socket.io maps)
│   └── api.ts             # ApiResponse<T>, ApiError, Paginated<T>
├── package.json           # name: "@mpg/shared", main field unused
└── tsconfig.json          # extends ../tsconfig.base.json, declarationOnly-friendly
```

**Folder tree (`server/`):** all source under `src/`, compiled output to `dist/` (gitignored).

```
server/
├── src/
│   ├── config/
│   │   ├── redis.ts                   # ioredis singleton + duplicate() pub/sub
│   │   └── env.ts                     # Centralized env access + zod-style runtime validation
│   ├── db/
│   │   ├── index.ts                   # Drizzle client (postgres-js) + typed `db` export
│   │   ├── migrate.ts                 # Standalone migration runner (`npm run db:migrate`)
│   │   └── schema/
│   │       └── index.ts               # All pgTable definitions (users + matches) in one file
│   ├── middleware/
│   │   ├── authMiddleware.ts          # protect, optionalAuth, adminOnly, registeredOnly
│   │   ├── errorHandler.ts
│   │   ├── rateLimiters.ts            # global, auth, admin, upload
│   │   ├── sanitizeMiddleware.ts      # input shape sanitization
│   │   └── uploadMiddleware.ts        # multer config
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── matchController.ts
│   │   ├── leaderboardController.ts
│   │   └── adminController.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── matchRoutes.ts
│   │   ├── leaderboardRoutes.ts
│   │   └── adminRoutes.ts
│   ├── socket/
│   │   ├── index.ts                   # registerSocketHandlers, types Server<...>
│   │   ├── authSocket.ts              # JWT handshake middleware
│   │   ├── roomHandlers.ts
│   │   ├── matchmakingHandlers.ts
│   │   ├── chatHandlers.ts
│   │   ├── gameHandlers.ts
│   │   └── disconnectHandlers.ts
│   ├── games/
│   │   ├── BaseGame.ts                # abstract class + GameConfig
│   │   ├── TicTacToe.ts               # extends BaseGame<TicTacToeState>
│   │   ├── CardGame.ts                # extends BaseGame<CardGameState>
│   │   └── GameFactory.ts             # generic registry (compile-time game-type -> class map)
│   ├── services/
│   │   ├── roomService.ts             # Redis CRUD for rooms
│   │   ├── matchmakingService.ts
│   │   ├── matchService.ts            # Postgres match-history + atomic stat increments
│   │   └── userService.ts             # createUser (with bcrypt), changePassword
│   ├── utils/
│   │   ├── generateToken.ts
│   │   ├── generateRoomCode.ts
│   │   ├── escapeRegex.ts
│   │   ├── shuffle.ts
│   │   ├── constants.ts               # GAME_TYPES, ROOM_TTL, MAX_PLAYERS
│   │   └── apiResponse.ts
│   ├── validators/
│   │   ├── authValidators.ts
│   │   ├── userValidators.ts
│   │   ├── matchValidators.ts
│   │   ├── adminValidators.ts
│   │   └── socketValidators.ts
│   ├── types/
│   │   └── express.d.ts               # augment Express.Request with `user?: AuthUser`
│   ├── seed/
│   │   └── seedAdmin.ts
│   └── server.ts                      # entry: HTTP + Socket.io bootstrap
├── drizzle/                           # generated SQL migrations (committed)
│   ├── 0000_initial.sql
│   ├── 0001_add_xxx.sql
│   └── meta/                          # snapshot history (managed by drizzle-kit)
├── uploads/                           # local avatar storage (gitignored)
├── dist/                              # tsc output (gitignored)
├── drizzle.config.ts                  # drizzle-kit config: schema path + migration dir + dialect
├── .env
├── .env.example
├── .gitignore
├── tsconfig.json
└── package.json
```

**Folder tree (`client/`):** Vite + React + TypeScript. All `.tsx` for components, `.ts` for non-JSX modules.

```
client/
├── public/
│   └── sounds/                  # turn.mp3, win.mp3, lose.mp3, click.mp3
├── vercel.json                  # SPA rewrite + asset cache headers (Vercel)
├── src/
│   ├── api/
│   │   ├── axios.ts             # AxiosInstance with interceptors
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── matchService.ts
│   │   ├── leaderboardService.ts
│   │   └── adminService.ts
│   ├── socket/
│   │   ├── socket.ts            # typed Socket<ServerToClient, ClientToServer>
│   │   └── events.ts            # re-export from @mpg/shared
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── SocketContext.tsx
│   │   └── PreferencesContext.tsx
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── useSocketEvent.ts    # generic over ServerToClient event names
│   │   └── useSounds.ts
│   ├── components/
│   │   ├── ui/                  # Spinner, Button, Input, Modal, Toast wrappers
│   │   ├── layout/              # Navbar, Footer, Sidebar, MainLayout, AdminLayout, SettingsLayout
│   │   ├── game/                # GameBoardFrame, PlayerList, SpectatorList, TurnIndicator, ChatPanel, RematchPrompt
│   │   ├── games/
│   │   │   ├── TicTacToeBoard.tsx
│   │   │   └── CardGameTable.tsx
│   │   └── guards/              # ProtectedRoute, AdminRoute, GuestOnlyRoute, RegisteredOnlyRoute
│   ├── pages/
│   │   ├── auth/                # LoginPage, RegisterPage, GuestEntryPage
│   │   ├── HomePage.tsx
│   │   ├── GameRoomPage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   ├── profile/             # PublicProfilePage, MyProfilePage
│   │   ├── settings/            # ProfileSettings, AccountSettings, AppearanceSettings, NotificationsSettings, PrivacySettings
│   │   ├── admin/               # AdminDashboard, AdminUsers, AdminActiveRooms, AdminMatches
│   │   └── NotFoundPage.tsx
│   ├── utils/
│   │   ├── formatDate.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts            # Vite ImportMeta env types
│   └── index.css
├── .env
├── .env.example
├── .gitignore
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json           # for vite.config.ts itself
└── package.json
```

**Server dependencies (production):** `express`, `socket.io`, `drizzle-orm`, `postgres` (driver), `ioredis`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`, `helmet`, `express-rate-limit`, `express-validator`, `multer`, `uuid`, `pino`.

**Server dependencies (dev):** `typescript`, `tsx`, `drizzle-kit`, `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/cors`, `@types/multer`, `@types/uuid`, `pino-pretty`.

> **Note:** `mongoose` and `express-mongo-sanitize` are **not** used. Drizzle's parameterized queries protect against SQL injection by default; `hpp` and `mongo-sanitize` are unnecessary. The `sanitizeMiddleware.ts` (Step 2) instead applies a lightweight type-shape check on `req.body` to reject pathological structures.

**Client dependencies (production):** `react`, `react-dom`, `react-router-dom`, `axios`, `socket.io-client`, `react-hot-toast`, `lucide-react`.

**Client dependencies (dev):** `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/vite`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.

**Shared dependencies (dev):** `typescript` (only — `shared/` ships nothing at runtime; types are consumed via TS path mapping).

**`tsconfig.base.json`** (root, extended by all three packages):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**`server/tsconfig.json`** — server compiles to CommonJS-friendly output via `tsc`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "@mpg/shared/*": ["../shared/*"] },
    "types": ["node"]
  },
  "include": ["src/**/*", "../shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`client/tsconfig.json`** — Vite handles bundling; `tsc --noEmit` is used only for type-checking.

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@mpg/shared/*": ["../shared/*"] },
    "types": ["vite/client"]
  },
  "include": ["src", "../shared"]
}
```

**`shared/tsconfig.json`:**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "declaration": true
  },
  "include": ["types/**/*"]
}
```

**npm scripts (`server/package.json`):**

| Script | Command | Purpose |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Hot-reload dev server (no nodemon needed) |
| `build` | `tsc -p tsconfig.json` | Compile TS to `dist/` |
| `start` | `node dist/src/server.js` | Production runtime (Render uses this) |
| `typecheck` | `tsc --noEmit` | Standalone type check |
| `db:generate` | `drizzle-kit generate` | Generate SQL migration files from schema diffs |
| `db:migrate` | `tsx src/db/migrate.ts` | Apply pending migrations to the configured database |
| `db:studio` | `drizzle-kit studio` | Open the local Drizzle Studio web UI for inspecting data |
| `db:push` | `drizzle-kit push` | (Dev only) Push schema directly without migration files |
| `seed:admin` | `tsx src/seed/seedAdmin.ts` | Seed admin user |

**npm scripts (`client/package.json`):**

| Script | Command |
|---|---|
| `dev` | `vite` |
| `build` | `tsc --noEmit && vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc --noEmit` |

**Root `.gitignore`:**

```
node_modules/
.env
.env.local
*.log
.DS_Store

# Build outputs
server/dist/
client/dist/

# Local uploads (avatars in dev)
server/uploads/

# TypeScript build info
*.tsbuildinfo
```

**SECURITY:**
- `.env` files are gitignored — never commit real secrets.
- `server/uploads/` and all `dist/` directories gitignored.
- `tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` — the strictest practical setup. This catches off-by-one array accesses (`board[i]` is `Cell | undefined`), forces explicit handling of optional fields, and prevents implicit `any`.
- `shared/types/` is the single source of truth for any type that crosses the wire (Socket.io payloads, REST responses, JWT claims). A change here surfaces compile errors on **both** sides simultaneously, eliminating client/server drift bugs.
- Confirm `.env.example` is created (Step 2) without real secrets — only key names and safe defaults.

---

## STEP 2 — Environment Configuration, Neon Postgres (Drizzle) & Redis Connection

Build the environment access layer, connect to Neon Postgres through Drizzle ORM (using the `postgres` driver), connect Redis through ioredis, and wire all global Express middleware in the correct order.

**`config/env.ts`** — central env reader with runtime validation. Exports a typed `env` object so consumers get autocomplete and compile-time guarantees:

| Variable | Required | Default | Validation |
|---|---|---|---|
| `NODE_ENV` | yes | `development` | `development`/`production`/`test` |
| `PORT` | yes | `5000` | positive integer |
| `DATABASE_URL` | yes | — | Postgres connection string (Neon: `postgresql://user:pass@host/db?sslmode=require`) |
| `REDIS_URL` | yes | — | non-empty string (e.g. `redis://default:pwd@host:port`) |
| `JWT_SECRET` | yes | — | min 32 chars in production |
| `JWT_EXPIRES_IN` | no | `7d` | string |
| `GUEST_JWT_EXPIRES_IN` | no | `2h` | string |
| `CLIENT_ORIGIN` | yes | — | URL (no wildcard in production) |
| `ROOM_TTL_SECONDS` | no | `7200` | integer (2h default) |
| `MATCHMAKING_TTL_SECONDS` | no | `300` | integer |
| `BCRYPT_SALT_ROUNDS` | no | `12` | integer >= 10 |
| `UPLOAD_MAX_BYTES` | no | `5242880` | integer (5 MB) |

On startup, if `NODE_ENV === 'production'` and `JWT_SECRET.length < 32`, throw and exit immediately.

**`db/index.ts`** — Drizzle client, typed:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'production' ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client, { schema, logger: env.LOG_LEVEL === 'debug' });
export const dbClient = client;
```

**`db/migrate.ts`** — runs pending migrations on startup or via `npm run db:migrate`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env.js';

const client = postgres(env.DATABASE_URL, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
await client.end();
console.log('Migrations applied');
```

**`drizzle.config.ts`** (server root):

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});
```

**Connection lifecycle:**
- App starts -> `db` is lazy-imported when first query runs (postgres-js connects on first query).
- Health check (`GET /api/health`) executes `SELECT 1` to verify connectivity.
- Graceful shutdown (SIGTERM): `await dbClient.end({ timeout: 5 })`.

**`config/redis.ts`** — singleton ioredis client, typed:
- `new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3, enableReadyCheck: true })`.
- Listeners for `connect`, `ready`, `error`, `close`.
- Export `redis: Redis` (default client) and a `pub`/`sub` pair for future Socket.io adapter scaling (cloned with `.duplicate()`).

**`server.ts`** — bootstrap order (this exact order matters):

1. `import 'dotenv/config'`
2. Validate env (`config/env.js` import auto-validates).
3. `app.disable('x-powered-by')`.
4. `app.use(helmet())`.
5. `app.use(cors({ origin: corsOriginCheck, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE'] }))` where `corsOriginCheck(origin, cb)` allows: `undefined` (curl/health checks), the exact `env.CLIENT_ORIGIN`, and — in non-production only — any `*.vercel.app` subdomain so preview deployments work. Reject everything else with `cb(new Error('Not allowed by CORS'))`. This same check is reused by Socket.io's `cors` option in Step 11 to keep one source of truth.
6. `app.use(express.json({ limit: '10kb' }))`.
7. `app.use(express.urlencoded({ extended: true, limit: '10kb' }))`.
8. `app.use(sanitizeMiddleware)` — strips prototype-pollution keys and clamps depth (see snippet).
9. `app.use('/api', globalLimiter)`.
10. `GET /api/health` -> `{ status: 'ok', uptime, db: <state>, redis: <state> }`.
11. Mount routers (`/api/auth`, `/api/users`, `/api/matches`, `/api/leaderboard`, `/api/admin`).
12. `app.use(errorHandler)` last.
13. Create HTTP server with `http.createServer(app)`, attach `socket.io` (Step 11). The Drizzle client is imported lazily and connects on first query. In production startup, optionally `await migrate(...)` to apply pending migrations before listening (or run migrations as a separate Render predeploy step — see Step 55). Finally `httpServer.listen(env.PORT)`.

**Input shape sanitization (`middleware/sanitizeMiddleware.ts`)** — defense-in-depth even though Drizzle uses parameterized queries. Strips `__proto__`/`constructor`/`prototype` keys and rejects deeply-nested objects:

```ts
import type { Request, Response, NextFunction } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 6;

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return undefined;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      out[k] = sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
};

export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params) as typeof req.params;
  next();
};
```

> **Why no `express-mongo-sanitize`?** It targets MongoDB's `$`/`.` operator injection. Drizzle generates parameterized SQL via `postgres-js`; user input is bound, never interpolated. SQL injection is structurally prevented. The middleware above blocks prototype-pollution attacks and deeply-nested DoS payloads instead.

**`middleware/rateLimiters.ts`** — separate instances:

| Limiter | windowMs | max | Used on |
|---|---|---|---|
| `globalLimiter` | 15 min | 300 | `/api/*` |
| `authLimiter` | 15 min | 10 | `/api/auth/login`, `/api/auth/register`, `/api/auth/guest` |
| `adminLimiter` | 5 min | 60 | `/api/admin/*` |
| `uploadLimiter` | 10 min | 20 | `/api/users/me/avatar` |

**`.env.example`** must list every key from the table above with safe placeholders (e.g. `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multiplayer_game`, `JWT_SECRET=replace_with_a_secret_of_at_least_32_chars`). For Neon, the URL ends with `?sslmode=require`. For local development, run Postgres in Docker: `docker run -d --name mpg-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine`.

**SECURITY:**
- `helmet`, `cors` strict origin, `x-powered-by` disabled, body size capped at 10 KB.
- Custom `sanitizeMiddleware` strips `__proto__`/`constructor`/`prototype` keys (prototype-pollution prevention) and clamps object depth to 6.
- SQL injection structurally prevented by Drizzle + `postgres-js` parameterized queries — user input is **never** string-concatenated into SQL.
- Drizzle pool capped at 10 (production) / 5 (dev) connections to stay under Neon free tier limits.
- `hpp` and `express-mongo-sanitize` are **not** installed (incompatible with Express 5 / unnecessary for Postgres).
- `JWT_SECRET` length check enforced in production.
- Rate limiters scoped per route group; auth limiter is tightest.
- Health check leaks no internal info beyond connection state booleans.

---

## STEP 3 — User Model, Auth System & Admin Seed

Implement the registered-user authentication path. (Guest path is added in Step 4.)

**`db/schema/index.ts`** — Drizzle `pgTable` definitions live in a single file (both `users` and `matches`). Types are inferred via `$type<...>()` casts where SQL nullability isn't expressive enough (e.g., jsonb columns). The inferred row type is exported as `UserRow` and re-used in `shared/types/user.ts` (minus DB-only fields like `password`).

> **Note on file layout:** drizzle-kit's CJS loader cannot resolve cross-file `.js` imports between schema files (e.g., `matches.ts` importing `users` from `./users.js`), so we keep both tables colocated in `schema/index.ts`. Split only if the file grows past ~300 lines, and at that point use a per-table `drizzle.config.ts` workaround.

**Columns:**

| Column | SQL Type | Constraints / Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | replaces Mongo ObjectId |
| `username` | `varchar(20)` | unique, not null | lowercase, regex enforced at validator layer |
| `email` | `varchar(255)` | unique, not null | normalized lowercase |
| `password` | `varchar(255)` | not null | bcrypt hash; **never** selected in default queries via `usersPublicView` (see below) |
| `displayName` | `varchar(30)` | not null | |
| `avatarUrl` | `varchar(500)` | default `''`, not null | |
| `role` | `varchar(10)` | `$type<'player' \| 'admin'>()`, default `'player'`, not null | enforced at app layer |
| `isGuest` | `boolean` | default `false`, not null | always `false` here; guests have no row |
| `bio` | `varchar(200)` | default `''`, not null | |
| `stats` | `jsonb` | `$type<UserStats>()`, default `{ wins:0, losses:0, draws:0, gamesPlayed:0 }`, not null | |
| `statsByGame` | `jsonb` | `$type<Record<GameType, UserStats>>()`, default `{}`, not null | |
| `preferences` | `jsonb` | `$type<UserPreferences>()`, not null | default applied at insert via service |
| `lastLoginAt` | `timestamptz` | nullable | |
| `createdAt` | `timestamptz` | `defaultNow()`, not null | |
| `updatedAt` | `timestamptz` | `defaultNow().$onUpdate(() => new Date())`, not null | auto-updated on every UPDATE |

**`UserPreferences` shape** (in `shared/types/user.ts`, stored as jsonb):

| Field | Type | Default | Enum / Range |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | |
| `fontSize` | `'small' \| 'medium' \| 'large'` | `'medium'` | |
| `animations` | `boolean` | `true` | |
| `sounds` | `boolean` | `true` | |
| `soundVolume` | `number` | `0.7` | 0-1 |
| `language` | `'en'` | `'en'` | |
| `notifications.matchInvite` | `boolean` | `true` | |
| `notifications.rematch` | `boolean` | `true` | |
| `privacy.showStats` | `boolean` | `true` | |
| `privacy.showOnLeaderboard` | `boolean` | `true` | |

**Indexes** (declared in the `pgTable` second-arg):
- `unique('users_username_unique').on(t.username)`
- `unique('users_email_unique').on(t.email)`
- `index('users_stats_wins_idx').on(sql`((${t.stats}->>'wins')::int) DESC`)` — expression index for leaderboard performance
- `index('users_role_idx').on(t.role)` — admin filter

**Drizzle schema example (concise, the AI executing this step writes the full version):**

```ts
import { pgTable, uuid, varchar, boolean, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { UserStats, UserPreferences } from '@mpg/shared/types/user';
import type { GameType } from '@mpg/shared/types/games';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 30 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }).notNull().default(''),
  role: varchar('role', { length: 10 }).$type<'player' | 'admin'>().notNull().default('player'),
  isGuest: boolean('is_guest').notNull().default(false),
  bio: varchar('bio', { length: 200 }).notNull().default(''),
  stats: jsonb('stats').$type<UserStats>().notNull().default({ wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }),
  statsByGame: jsonb('stats_by_game').$type<Record<GameType, UserStats>>().notNull().default({}),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  winsIdx: index('users_stats_wins_idx').on(sql`((${t.stats}->>'wins')::int)`),
  roleIdx: index('users_role_idx').on(t.role),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Replacing Mongoose pre-save hooks with a service** — Drizzle has no built-in middleware, so password hashing moves into a small service:

```ts
// services/userService.ts
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, type NewUserRow, type PublicUserRow, usersPublicSelect } from '../db/schema/index.js';
import { env } from '../config/env.js';

export const createUser = async (
  input: Pick<NewUserRow, 'username' | 'email' | 'displayName' | 'role'> & { password: string },
): Promise<PublicUserRow> => {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(input.password, salt);
  const [row] = await db.insert(users).values({ ...input, password: passwordHash }).returning(usersPublicSelect);
  return row!;
};

export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

export const updatePasswordById = async (userId: string, newPassword: string): Promise<void> => {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, userId));
};
```

**Public projection helper** — never returns `password`. Define it inline at the bottom of `db/schema/index.ts` so it lives next to the table definition:

```ts
// db/schema/index.ts (continued)
export const usersPublicSelect = {
  id: users.id,
  username: users.username,
  email: users.email,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  role: users.role,
  isGuest: users.isGuest,
  bio: users.bio,
  stats: users.stats,
  statsByGame: users.statsByGame,
  preferences: users.preferences,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;
```

**`utils/generateToken.ts`** — `generateToken(payload: JwtPayload): string` signs with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` for users / `GUEST_JWT_EXPIRES_IN` for guests. `JwtPayload` is the discriminated union from `shared/types/auth.ts`.

**`shared/types/auth.ts`:**

```ts
export type RegisteredJwtPayload = { id: string; role: 'player' | 'admin'; isGuest: false };
export type GuestJwtPayload      = { id: string; role: 'player'; isGuest: true; displayName: string };
export type JwtPayload = RegisteredJwtPayload | GuestJwtPayload;

export type AuthUser = {
  _id: string;
  displayName: string;
  role: 'player' | 'admin';
  isGuest: boolean;
  avatarUrl?: string;
};
```

**`types/express.d.ts`** — augment `Request` so `req.user` is typed everywhere:

```ts
import type { AuthUser } from '@mpg/shared/types/auth';
declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}
export {};
```

**`middleware/authMiddleware.ts`:**

| Middleware | Behavior |
|---|---|
| `protect` | Read `Authorization: Bearer <token>`, verify, fetch user (skip for guest tokens — set `req.user = { _id, isGuest: true, displayName }`), attach `req.user`. 401 otherwise. |
| `optionalAuth` | Same as `protect` but never errors — leaves `req.user = null` on missing/invalid token. |
| `adminOnly` | Requires `req.user?.role === 'admin'`. 403 otherwise. |
| `registeredOnly` | Requires `req.user && !req.user.isGuest`. 403 otherwise. |

**`controllers/authController.ts`:**

| Function | Method/Path | Body / Behavior |
|---|---|---|
| `register` | POST `/api/auth/register` | Destructure `{ username, email, password, displayName }` only — never `req.body` directly. Reject if username/email exists (catch Postgres unique-violation `23505`) with generic message. Hash via `userService.createUser`. Return `{ user, token }` (no password). |
| `login` | POST `/api/auth/login` | `{ email, password }`. Always return identical error `Invalid email or password` for missing user OR wrong password. Update `lastLoginAt`. Return `{ user, token }`. |
| `getMe` | GET `/api/auth/me` | Requires `protect`. Return `req.user`. |
| `updateProfile` | PUT `/api/auth/me` | Whitelist `{ displayName, bio, avatarUrl }` only. Never accept `role`, `email`, `password`, `stats`, `isGuest`. |
| `changePassword` | PUT `/api/auth/me/password` | `{ currentPassword, newPassword }`. Verify current via `userService.verifyPassword`, then `userService.changePassword`. |
| `deleteAccount` | DELETE `/api/auth/me` | `{ password }` confirmation. `db.delete(users).where(eq(users.id, req.user._id))` — `matches.players` jsonb references are nulled by the application (see Step 8). |

**`controllers/authController.ts` — register mass-assignment guard (critical):**

```ts
import { createUser } from '../services/userService.js';

type RegisterBody = Pick<NewUser, 'username' | 'email' | 'displayName'> & { password: string };
const { username, email, password, displayName } = req.body as RegisterBody;
const user = await createUser({ username, email, password, displayName });
const { password: _omit, ...publicUser } = user;
res.status(201).json({ success: true, data: { user: publicUser, token: generateToken({ id: user.id, role: user.role, isGuest: false }) } });
```

**Routes (`routes/authRoutes.ts`):**

| Method | Path | Middleware |
|---|---|---|
| POST | `/register` | `authLimiter`, `registerValidator`, `validate` |
| POST | `/login` | `authLimiter`, `loginValidator`, `validate` |
| GET | `/me` | `protect`, `registeredOnly` |
| PUT | `/me` | `protect`, `registeredOnly`, `updateProfileValidator`, `validate` |
| PUT | `/me/password` | `protect`, `registeredOnly`, `changePasswordValidator`, `validate` |
| DELETE | `/me` | `protect`, `registeredOnly`, `deleteAccountValidator`, `validate` |

**`middleware/errorHandler.ts`** — production-safe global handler typed as `ErrorRequestHandler`. Always log internally. Response shape: `ApiResponse<never>` with `{ success: false, message, errors? }`. In production, never include `err.stack`, raw Postgres error codes, or column names. Map known Postgres error codes (`23505` unique violation, `23503` FK violation) to friendly generic messages.

**`seed/seedAdmin.ts`** — imports `db`, upserts admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_USERNAME` env vars using Drizzle's `onConflictDoNothing()` on the unique `email` index, then exits.

**SECURITY:**
- Mass assignment blocked: `register` and `updateProfile` destructure exact whitelists; `role` cannot be set via any public endpoint.
- User enumeration prevented: identical error message for both wrong email and wrong password.
- Password hashed with bcrypt (rounds 12) — the `password` column is excluded from public projections (`usersPublicSelect`), never returned in responses; change requires current password, deletion requires password confirmation.
- JWT signed with secret length-validated at startup; tokens accepted only from `Authorization` header.
- `protect` rejects expired/invalid tokens with generic `Not authenticated`.
- `registeredOnly` ensures account-management routes are never reachable by guests.
- Admin seed credentials only read from env (never hard-coded).
- Postgres error codes never leaked to client — `23505` becomes `'Username or email already in use.'` (or generic for login).

---

## STEP 4 — Guest Authentication Flow

Guests can join games without registering. They get a short-lived JWT bound to a random in-memory identity stored only inside the token; no `users` row is inserted in Postgres.

**`controllers/authController.ts`** add:

| Function | Method/Path | Body / Behavior |
|---|---|---|
| `loginAsGuest` | POST `/api/auth/guest` | `{ displayName }`. Validate displayName (3-20 chars, trim, escape). Generate UUID v4 as guest id. Sign JWT payload `{ id: guestId, role: 'player', isGuest: true, displayName }` with `GUEST_JWT_EXPIRES_IN`. Return `{ user: { _id: guestId, displayName, isGuest: true, role: 'player' }, token }`. |

**`middleware/authMiddleware.ts` — `protect` upgrade** (TypeScript discriminated-union narrowing handles guest/registered safely):
- If decoded payload has `isGuest === true`, do **not** query Postgres. Build `req.user` from token claims directly.
- If `isGuest === false`, fetch from `users` via `db.select().from(users).where(eq(users.id, decoded.id)).limit(1)`; reject if missing.

**Routes:**

| Method | Path | Middleware |
|---|---|---|
| POST | `/api/auth/guest` | `authLimiter`, `guestLoginValidator`, `validate` |

**Behavioral rules:**
- Guests can: create rooms, join rooms, play games, chat, spectate, queue for matchmaking.
- Guests **cannot**: appear on the leaderboard, write match history rows linked to their id (matches still record `displayName` snapshot but not `userId` for guests), update profile/preferences (no DB row), access `/api/users/me`, access any `/api/admin/*` endpoint.
- Match history writer (Step 8) checks `isGuest` on each player; if true, stores `{ userId: null, displayName, isGuest: true }`.

**SECURITY:**
- Guest tokens TTL <= 2 hours — abandoned guests cannot linger forever.
- `guestLoginValidator` escapes `displayName` to prevent XSS through chat or scoreboards.
- `registeredOnly` middleware on profile/admin routes blocks any guest privilege escalation attempts via crafted tokens.
- Guest `id` is a fresh UUID per session — no replay across guest sessions.
- Rate limit on `/api/auth/guest` prevents guest-token spam.

---

# PHASE 2 — BACKEND RESOURCES (REST API)

---

## STEP 5 — User Profile API (Public & Own)

Public profile lookup and own profile read. Avatar upload (Step 6) and preferences update (Step 7) split out for clarity.

**`controllers/userController.ts` — profile endpoints:**

| Function | Method/Path | Behavior |
|---|---|---|
| `getPublicProfile` | GET `/api/users/:username` | Look up by username (case-insensitive). Return only public fields: `{ username, displayName, avatarUrl, bio, role, createdAt, stats, statsByGame }` filtered by `preferences.privacy.showStats` (omit stats when false). 404 if not found. Guests have no DB row, so they cannot be looked up here. |
| `getMyProfile` | GET `/api/users/me` | `protect` + `registeredOnly`. Returns the full profile **including** preferences. |
| `updateMyProfile` | PATCH `/api/users/me` | Whitelist `{ displayName, bio }` only. Never accept `role`, `email`, `username`, `password`, `stats`, `isGuest`. |
| `getUserMatches` | GET `/api/users/:username/matches` | Public. Pagination (page, limit, sort by `createdAt: -1`). Limit clamped to 50. Filters `Match` docs where `players.userId === user._id`. |

**Public response shape (`shared/types/user.ts`):**

```ts
export type PublicUser = {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  role: 'player' | 'admin';
  createdAt: string;
  stats?: UserStats;
  statsByGame?: Record<GameType, UserStats>;
};
```

**Routes added to `routes/userRoutes.ts`:**

| Method | Path | Middleware |
|---|---|---|
| GET | `/:username` | `optionalAuth`, `usernameParamValidator`, `validate` |
| GET | `/me` | `protect`, `registeredOnly` |
| PATCH | `/me` | `protect`, `registeredOnly`, `updateProfileValidator`, `validate` |
| GET | `/:username/matches` | `optionalAuth`, `usernameParamValidator`, `paginationValidator`, `validate` |

**SECURITY:**
- Public profile honors `privacy.showStats` server-side; the response shape literally omits the `stats` keys when privacy is off.
- `updateMyProfile` whitelist eliminates mass-assignment risk — `role`, `username`, `email` cannot be changed via this endpoint.
- Pagination limit clamped to 50.
- Username param case-insensitive lookup but stored as lowercase, preventing duplicate-account ambiguity.

---

## STEP 6 — Avatar Upload (Multer + File Validation)

Server-managed avatar storage. Local disk in development; production swaps in S3/Cloudinary via the same controller signature.

**`middleware/uploadMiddleware.ts`:**

```ts
import multer from 'multer';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads/avatars')),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${EXT_BY_MIME[file.mimetype] ?? '.bin'}`),
});

export const uploadAvatar = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_MIME'));
  },
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
}).single('avatar');
```

**Controller endpoints** (extend `userController.ts`):

| Function | Method/Path | Behavior |
|---|---|---|
| `uploadAvatar` | POST `/api/users/me/avatar` | Multer middleware processes the upload. After success, delete previous avatar file (if any), update `user.avatarUrl = '/uploads/avatars/<filename>'`, save user. Return new URL. |
| `removeAvatar` | DELETE `/api/users/me/avatar` | Delete file from disk if it exists, set `avatarUrl = ''`, save user. |

**Static serving:** in `server.ts`, `app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), { maxAge: '7d', dotfiles: 'deny', index: false }))`. The `dotfiles: 'deny'` and `index: false` close common static-server pitfalls.

**Routes:**

| Method | Path | Middleware |
|---|---|---|
| POST | `/me/avatar` | `protect`, `registeredOnly`, `uploadLimiter`, `uploadAvatar` |
| DELETE | `/me/avatar` | `protect`, `registeredOnly` |

**Production storage path** (deferred to Step 55 deploy notes):
- Render's filesystem is **ephemeral** — uploaded avatars vanish on every redeploy.
- For production: swap `multer.diskStorage` for `multer-s3` (AWS S3) or `multer-storage-cloudinary`. Controller code stays identical because the abstraction is at the middleware boundary.
- For this learning project, document the limitation in README and ship with disk storage.

**SECURITY:**
- MIME whitelist enforced via `fileFilter` — uploads with mismatched declared MIME rejected.
- File size capped at 5 MB; multer rejects oversized uploads with a typed error.
- Filename generated server-side via UUID — user-controlled filenames never reach disk (prevents path traversal like `../../etc/passwd`).
- Static file server denies dotfiles and disables directory indexing.
- Old avatar files are deleted on upload/remove to avoid orphan accumulation.
- One file per request enforced (`limits.files: 1`).

---

## STEP 7 — Preferences API (Theme, Privacy, Notifications)

A focused endpoint for per-user preferences with strict per-key validation, used by the client's `PreferencesContext` (Step 33) for instant auto-save.

**Controller endpoint** (extend `userController.ts`):

| Function | Method/Path | Behavior |
|---|---|---|
| `updateMyPreferences` | PATCH `/api/users/me/preferences` | Body is a partial `UserPreferences` object. Whitelist each top-level key and each nested key. Reject unknown keys with 400. Apply via `$set` with dot-notation paths so partial updates don't overwrite unrelated nested fields. |

**Implementation pattern (`updateMyPreferences`)** — load -> deep-merge against current jsonb -> write back atomically. Postgres `jsonb_set` could be used for surgical updates, but a read-modify-write within a single transaction is simpler and safe here because each user only has their own preferences:

```ts
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';

const ALLOWED_TOP: Array<keyof UserPreferences> = ['theme', 'fontSize', 'animations', 'sounds', 'soundVolume', 'language'];

const result = await db.transaction(async (tx) => {
  const [row] = await tx.select({ preferences: users.preferences }).from(users).where(eq(users.id, req.user!._id)).limit(1);
  if (!row) throw new HttpError(404, 'User not found');

  const next: UserPreferences = { ...row.preferences };
  for (const [key, value] of Object.entries(req.body)) {
    if (key === 'notifications' || key === 'privacy') {
      if (value && typeof value === 'object') next[key] = { ...next[key], ...(value as object) };
    } else if (ALLOWED_TOP.includes(key as keyof UserPreferences)) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  const [updated] = await tx.update(users).set({ preferences: next }).where(eq(users.id, req.user!._id)).returning({ preferences: users.preferences });
  return updated!.preferences;
});

res.json({ success: true, data: result });
```

**Key validation** is fully enforced by `preferencesValidator` (Step 25 details the per-key rules). The controller's whitelist is a second defense layer.

**Routes:**

| Method | Path | Middleware |
|---|---|---|
| PATCH | `/me/preferences` | `protect`, `registeredOnly`, `preferencesValidator`, `validate` |

**Default preferences** (used when creating a new user, defined in `User.ts` schema):

```ts
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontSize: 'medium',
  animations: true,
  sounds: true,
  soundVolume: 0.7,
  language: 'en',
  notifications: { matchInvite: true, rematch: true },
  privacy: { showStats: true, showOnLeaderboard: true },
};
```

**SECURITY:**
- Two layers of whitelisting: the express-validator chain rejects unknown/invalid keys, then the controller only writes known keys to Postgres.
- The controller deep-merges incoming patch against `DEFAULT_PREFERENCES` (any unknown key is dropped) and re-validates enums (e.g., theme `light/dark/system`) before writing the entire preferences jsonb back with `db.update(users).set({ preferences: merged }).where(...)`.
- Privacy preference changes (`showStats`, `showOnLeaderboard`) take effect immediately on the next public profile / leaderboard query — no caching layer to invalidate.
- Notifications preferences are **only** consumed client-side for now (toast suppression); server doesn't push notification emails.

---

## STEP 8 — Match History Model & Stats Tracking

Persist completed games to Postgres and increment per-user stats atomically using SQL `UPDATE` with arithmetic on jsonb.

**`db/schema/index.ts` (continued)** — append the `matches` `pgTable` next to `users` in the same file. The row type is exported as `MatchRow` and re-used alongside `MatchRecord` in `shared/types/match.ts` (with the jsonb shapes spelled out for client consumption).

**Columns:**

| Column | SQL Type | Constraints / Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | |
| `gameType` | `varchar(20)` | `$type<GameType>()`, not null | `'tictactoe'` / `'cardgame'` |
| `roomCode` | `varchar(36)` | not null | UUID v4 issued at room creation |
| `players` | `jsonb` | `$type<MatchPlayer[]>()`, not null | each `{ userId: string \| null, displayName, isGuest, position }` |
| `winnerUserId` | `uuid` | nullable, `references(() => users.id, { onDelete: 'set null' })` | null on draw or all-guest game |
| `winnerDisplayName` | `varchar(30)` | nullable | snapshot for guests / deleted users |
| `result` | `varchar(15)` | `$type<'win' \| 'draw' \| 'aborted'>()`, not null | |
| `durationMs` | `integer` | not null, default `0` | |
| `moves` | `jsonb` | `$type<MatchMove[]>()`, not null, default `[]` | game-specific move log |
| `createdAt` | `timestamptz` | `defaultNow()`, not null | |

**Indexes:**
- `index('matches_winner_idx').on(t.winnerUserId, t.createdAt)`
- `index('matches_game_created_idx').on(t.gameType, t.createdAt)`
- GIN index on `players`: `index('matches_players_gin_idx').using('gin', t.players)` — required for fast "my recent matches" jsonb-containment lookups.

**Player-history query pattern:**

```ts
const myMatches = await db.select()
  .from(matches)
  .where(sql`${matches.players} @> ${JSON.stringify([{ userId }])}::jsonb`)
  .orderBy(desc(matches.createdAt))
  .limit(20);
```

**`services/matchService.ts`:**

| Function | Behavior |
|---|---|
| `recordMatch({ gameType, roomCode, players, winnerUserId, winnerDisplayName, result, durationMs, moves })` | Inside a single `db.transaction(...)`: (1) `INSERT INTO matches`, (2) for each registered (non-guest) player, run an atomic `UPDATE users SET stats = ..., stats_by_game = ...` using `jsonb_set` arithmetic so concurrent finishes never lose updates. |
| `abortMatch({ roomCode, gameType, players, reason })` | Insert match with `result: 'aborted'`. No stat increments. |

**Atomic stats increment (the tricky bit — replaces Mongoose `$inc` + `bulkWrite`):**

```ts
import { sql, eq } from 'drizzle-orm';
import { users } from '../db/schema/users.js';

const incrementStats = (tx: typeof db, userId: string, gameType: GameType, outcome: 'wins' | 'losses' | 'draws') =>
  tx.update(users).set({
    stats: sql`jsonb_set(
      jsonb_set(${users.stats}, '{gamesPlayed}', ((COALESCE(${users.stats}->>'gamesPlayed','0'))::int + 1)::text::jsonb),
      ${'{' + outcome + '}'}, ((COALESCE(${users.stats}->>${outcome},'0'))::int + 1)::text::jsonb
    )`,
    statsByGame: sql`jsonb_set(
      jsonb_set(
        COALESCE(${users.statsByGame}, '{}'::jsonb),
        ${'{' + gameType + '}'},
        COALESCE(${users.statsByGame}->${gameType}, '{"wins":0,"losses":0,"draws":0,"gamesPlayed":0}'::jsonb)
      ),
      ${'{' + gameType + ',' + outcome + '}'},
      ((COALESCE(${users.statsByGame}->${gameType}->>${outcome},'0'))::int + 1)::text::jsonb
    )`,
  }).where(eq(users.id, userId));
```

Encapsulate this verbose SQL in a `incrementStats(tx, userId, gameType, outcome)` helper inside `services/matchService.ts`. Postgres performs each `UPDATE` under row-level lock, so simultaneous wins for the same user do not lose increments.

**`controllers/matchController.ts`:**

| Function | Method/Path | Behavior |
|---|---|---|
| `getMatchById` | GET `/api/matches/:id` | `optionalAuth`. Public read. Returns full match with player display names. |
| `getRecentMatches` | GET `/api/matches` | Public. Pagination, optional `gameType` filter, `ORDER BY created_at DESC`. |

**Routes (`routes/matchRoutes.ts`):**

| Method | Path | Middleware |
|---|---|---|
| GET | `/` | `optionalAuth`, `paginationValidator`, `gameTypeFilterValidator`, `validate` |
| GET | `/:id` | `optionalAuth`, `uuidParamValidator`, `validate` |

**SECURITY:**
- Match write is server-only (called from socket handlers, never via REST).
- `players[].userId` is `null` for guests — no fake user-id injection possible.
- `getMatchById`/`getRecentMatches` are read-only public endpoints; no internal fields leaked.
- Stat increments use Postgres row-level locking via `UPDATE` — concurrent game-end events for the same user never lose increments.
- All match writes happen inside a transaction, so a partial failure (e.g., one stat update errors) rolls back the match insert too — match history and stats stay consistent.

---

## STEP 9 — Leaderboard API

Compute the leaderboard from `User.stats` with a configurable game filter.

**`controllers/leaderboardController.ts`:**

| Function | Method/Path | Behavior |
|---|---|---|
| `getLeaderboard` | GET `/api/leaderboard` | Query params: `gameType` (optional, enum), `page` (default 1), `limit` (default 25, max 100). Filter `WHERE is_guest = false AND (preferences->'privacy'->>'showOnLeaderboard')::boolean = true`. If `gameType` provided, `ORDER BY (stats_by_game->'<game>'->>'wins')::int DESC NULLS LAST`; else `ORDER BY (stats->>'wins')::int DESC`. Project public columns only: `id, username, displayName, avatarUrl, stats` (and the relevant `statsByGame[gameType]` slice). The `users_stats_wins_idx` expression index makes this query fast. |

**Routes (`routes/leaderboardRoutes.ts`):**

| Method | Path | Middleware |
|---|---|---|
| GET | `/` | `optionalAuth`, `leaderboardValidator`, `validate` |

**SECURITY:**
- Privacy preference `showOnLeaderboard` enforced server-side at the query level.
- Limit clamped to 100; page coerced to positive integer.
- No password, email, or preferences fields ever projected.

---

## STEP 10 — Admin REST API (Dashboard, User Management, Active Rooms)

Admin-only endpoints; all live behind `adminOnly` and `adminLimiter`.

**`controllers/adminController.ts`:**

| Function | Method/Path | Behavior |
|---|---|---|
| `getDashboardStats` | GET `/api/admin/stats` | `{ totalUsers, totalAdmins, totalMatches, matchesByGameType, activeRoomsCount, queueSize }`. Active rooms count and queue size pulled from Redis. |
| `getUsers` | GET `/api/admin/users` | Pagination, search by username/email/displayName (regex-escaped), filter by role. |
| `getUserById` | GET `/api/admin/users/:id` | Full user record (without password). |
| `updateUserRole` | PATCH `/api/admin/users/:id/role` | Body `{ role }`. **Self-protection**: refuse if `:id === req.user._id`. **Last-admin protection**: refuse demoting the only admin (count admins first). |
| `deleteUser` | DELETE `/api/admin/users/:id` | **Self-protection**: refuse deleting self. **Last-admin protection**: refuse deleting the only admin. Cascade-update `Match.players.userId` to `null` for that user. |
| `getActiveRooms` | GET `/api/admin/rooms` | List all live rooms from Redis (`SCAN` with `room:*` pattern). Include `roomCode`, `gameType`, `status`, player count, createdAt. |
| `forceCloseRoom` | DELETE `/api/admin/rooms/:roomCode` | Emit `room_closed` to all sockets in the Socket.io room, then delete Redis key. |
| `getRecentMatches` | GET `/api/admin/matches` | Same shape as public matches, but no privacy filtering. |

**Routes (`routes/adminRoutes.ts`):** all routes mounted with `protect`, `registeredOnly`, `adminOnly`, `adminLimiter`. Each mutation uses its own validator.

**SECURITY:**
- Admin self-protection: cannot delete self or change own role.
- Last-admin protection: count admins before any role demotion or deletion.
- All admin search uses regex-escaped queries (`utils/escapeRegex.js`) to prevent ReDoS.
- `forceCloseRoom` emits a notification to participants so they aren't silently dropped.
- Cascade rule: deleted users have their `Match.players.userId` nulled but display names preserved (history integrity).
- Admin rate limiter applied even though the routes are already privileged — defense-in-depth against compromised admin tokens.

---

# PHASE 3 — SOCKET.IO REAL-TIME FOUNDATION

---

## STEP 11 — Socket.io Server Setup & JWT Auth Middleware

Attach Socket.io to the HTTP server, gate every handshake with a JWT check, and route incoming events to per-feature handler files. **TypeScript win:** Socket.io 4 supports four generic params on `Server` — `<ListenEvents, EmitEvents, ServerSideEvents, SocketData>`. We use `ClientToServerEvents`, `ServerToClientEvents`, and `SocketData` (where `user: AuthUser` lives) — every `socket.on`, `socket.emit`, `io.to(...).emit` is then **fully typed**.

**`shared/types/events.ts`** — single source of truth for both sides:

```ts
import type { GameType, Card, GameState } from './games';
import type { Room, RoomPlayer } from './room';
import type { AuthUser } from './auth';

export type GameAction =
  | { action: 'play'; payload: { index: number } }
  | { action: 'play_card'; payload: { card: Card } };

export interface ClientToServerEvents {
  'room:create':           (data: { gameType: GameType; isPrivate: boolean }) => void;
  'room:join':             (data: { roomCode: string; asSpectator?: boolean }) => void;
  'room:leave':            () => void;
  'matchmaking:join':      (data: { gameType: GameType }) => void;
  'matchmaking:cancel':    () => void;
  'game:action':           (data: GameAction) => void;
  'game:rematch_request':  () => void;
  'chat:send':             (data: { message: string }) => void;
}

export interface ServerToClientEvents {
  'room:state':           (room: Room) => void;
  'room:player_joined':   (data: { player: RoomPlayer }) => void;
  'room:player_left':     (data: { playerId: string; reason: 'leave' | 'disconnect' | 'kicked' }) => void;
  'room:closed':          (data: { reason: string }) => void;
  'game:state':           (state: GameState) => void;
  'game:turn':            (data: { currentPlayerId: string }) => void;
  'game:end':             (data: { result: 'win' | 'draw' | 'aborted'; winnerId?: string; winnerDisplayName?: string; matchId?: string }) => void;
  'matchmaking:queued':   (data: { gameType: GameType; position: number }) => void;
  'matchmaking:matched':  (data: { roomCode: string }) => void;
  'matchmaking:cancelled': () => void;
  'chat:message':         (data: { from: string; displayName: string; message: string; timestamp: number }) => void;
  'error_event':          (data: { code: string; message: string }) => void;
}

export interface SocketData {
  user: AuthUser;
}
```

**`server.ts`** updates:

```ts
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@mpg/shared/types/events';
import { registerSocketHandlers } from './socket/index.js';

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e5,
});

registerSocketHandlers(io);
```

**`socket/authSocket.ts`** — handshake middleware (typed `Socket`):
- Read token from `socket.handshake.auth.token` (preferred) or `socket.handshake.headers.authorization`.
- `jwt.verify(token, env.JWT_SECRET) as JwtPayload`.
- For guest tokens (discriminant `isGuest === true`), build `socket.data.user` from claims directly.
- For registered tokens, fetch user from Postgres by `id`.
- Set `socket.data.user = { _id, displayName, role, isGuest, avatarUrl }` and `socket.join(\`user:${_id}\`)`.
- On error: `next(new Error('UNAUTHORIZED'))`.

**`socket/index.ts`** — `registerSocketHandlers(io: TypedServer): void`:
- Apply `io.use(authSocket)`.
- Define `type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>` and `type TypedSocket = Socket<...>` for all handler signatures.
- On `connection`, register handlers from `roomHandlers`, `matchmakingHandlers`, `chatHandlers`, `gameHandlers`, `disconnectHandlers`. Each handler module exports `register(io: TypedServer, socket: TypedSocket): void`.
- On every event handler, wrap in try/catch; emit `error_event { code, message }` to `socket` on failure (never expose stack traces).

**Event reference table** (exact names — all type-checked against `events.ts`):

| Direction | Event | Payload |
|---|---|---|
| C->S | `room:create` | `{ gameType, isPrivate }` |
| C->S | `room:join` | `{ roomCode, asSpectator }` |
| C->S | `room:leave` | `{}` |
| C->S | `matchmaking:join` | `{ gameType }` |
| C->S | `matchmaking:cancel` | `{}` |
| C->S | `game:action` | `{ action, payload }` (game-specific intent only) |
| C->S | `game:rematch_request` | `{}` |
| C->S | `chat:send` | `{ message }` |
| S->C | `room:state` | full sanitized room snapshot |
| S->C | `room:player_joined` | `{ player }` |
| S->C | `room:player_left` | `{ playerId, reason }` |
| S->C | `room:closed` | `{ reason }` |
| S->C | `game:state` | sanitized game state |
| S->C | `game:turn` | `{ currentPlayerId }` |
| S->C | `game:end` | `{ result, winnerId, winnerDisplayName, matchId }` |
| S->C | `chat:message` | `{ from, displayName, message, timestamp }` |
| S->C | `error_event` | `{ code, message }` |

**SECURITY:**
- Every connection requires a valid JWT — anonymous WebSocket connections are rejected at the handshake.
- Guest tokens still go through verification; they cannot impersonate registered users (different `isGuest` claim).
- `maxHttpBufferSize` capped at 100 KB to prevent oversized payload abuse.
- All handlers are wrapped in try/catch and emit only generic error codes — no stack traces sent to client.
- Server never trusts `socket.handshake.query` for identity; only the verified JWT.

---

## STEP 12 — Redis Service Layer (Rooms, Queues, TTL)

Centralize all Redis read/writes behind a service so handlers stay thin and TTL/expiration logic is consistent.

**Key naming conventions:**

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `room:<roomCode>` | String (JSON) | `ROOM_TTL_SECONDS` (default 7200) | Full room snapshot |
| `room:index` | Set | none | All active room codes (for SCAN-free admin listing) |
| `mm:<gameType>` | List | `MATCHMAKING_TTL_SECONDS` per entry refresh | FIFO queue of waiting users (JSON entries) |
| `user:room:<userId>` | String | matches room TTL | Reverse lookup so reconnects find their room fast |

**Room snapshot JSON shape:**

```json
{
  "roomCode": "ab12cd34",
  "gameType": "tictactoe",
  "isPrivate": false,
  "status": "waiting",
  "hostId": "<userId>",
  "maxPlayers": 2,
  "players": [
    { "userId": "...", "displayName": "...", "isGuest": false, "avatarUrl": "...", "position": 0, "isConnected": true }
  ],
  "spectators": [{ "userId": "...", "displayName": "..." }],
  "gameState": null,
  "chat": [],
  "rematchVotes": [],
  "createdAt": 1730000000000,
  "startedAt": null,
  "endedAt": null
}
```

**`services/roomService.ts`** — all functions return `Promise<Room>` or `Promise<Room | null>`; the `Room` type comes from `shared/types/room.ts`:

| Function | Behavior |
|---|---|
| `createRoom({ host, gameType, isPrivate })` | Generate `roomCode` (Step utils — short slug from UUID). Build snapshot. `SET room:<code> <json> EX <ttl>`. `SADD room:index <code>`. `SET user:room:<userId> <code> EX <ttl>`. Return snapshot. |
| `getRoom(roomCode)` | `GET room:<code>`. Parse JSON. Return null if missing. |
| `updateRoom(roomCode, mutator)` | Read, apply pure mutator function, `SET` with same TTL preserved (`EX` re-applied). Use Redis `WATCH`/`MULTI`/`EXEC` optimistic concurrency. |
| `deleteRoom(roomCode)` | `DEL room:<code>`. `SREM room:index <code>`. Delete `user:room:*` entries for all room members. |
| `addPlayer(roomCode, player)` | `updateRoom` mutator that pushes player if `players.length < maxPlayers` and not already present. Throw `ROOM_FULL`/`ALREADY_IN_ROOM`/`GAME_IN_PROGRESS` as needed. |
| `removePlayer(roomCode, userId)` | Mutator that filters out the player. If empty after removal, delete room. If host left and others remain, transfer host to next player. |
| `addSpectator(roomCode, user)` | Mutator that appends to `spectators` (cap at 10). |
| `removeSpectator(roomCode, userId)` | Mutator. |
| `setGameState(roomCode, gameState)` | Mutator. |
| `appendChat(roomCode, message)` | Mutator. Hard-cap chat array length at 50 (drop oldest). |
| `listAllRooms()` | `SMEMBERS room:index` then pipelined `MGET`. Skip stale codes whose key has expired. |

**`utils/generateRoomCode.ts`:** `generateRoomCode(): string` -> first 8 hex chars from `uuidv4().replace(/-/g, '')`.

**SECURITY:**
- TTL on every room key — abandoned rooms self-clean.
- All room mutations go through the service; handlers never call `redis.set` directly. This keeps validation, capacity checks, and host transfer in one place.
- `WATCH/MULTI/EXEC` prevents lost-update races when two players join simultaneously.
- Chat is capped at 50 messages to prevent unbounded memory growth in Redis.
- `user:room:*` reverse index is rebuilt on disconnect/reconnect (Step 24) — never trusted as the source of truth.

---

## STEP 13 — Room Management Events (Create, Join, Leave)

Implement `room:create`, `room:join`, `room:leave` and the consequent broadcasts.

**`socket/roomHandlers.ts`:**

| Event | Server-side flow |
|---|---|
| `room:create` | Validate `{ gameType, isPrivate }`. Refuse if user already in a live room (`user:room:<id>` exists). Determine `maxPlayers` from `GameFactory.getConfig(gameType).maxPlayers`. Call `roomService.createRoom`. `socket.join(\`room:${roomCode}\`)`. Emit `room:state` to socket. |
| `room:join` | Validate `{ roomCode, asSpectator? }`. Fetch room; emit `error_event ROOM_NOT_FOUND` if null. If `asSpectator`, call `addSpectator`; else `addPlayer`. `socket.join(\`room:${roomCode}\`)`. Broadcast `room:player_joined` to others, emit fresh `room:state` to all in the room. If now full and `status === 'waiting'`, transition to `starting` and call `gameHandlers.startGame(roomCode)`. |
| `room:leave` | Resolve room from `socket.user._id`. Call `removePlayer` or `removeSpectator`. Emit `room:player_left` to remaining members. If game was in progress, call `gameHandlers.handleAbortOnLeave(roomCode, userId)` (forfeit logic). If room emptied -> `deleteRoom`. |

**SECURITY:**
- Server enforces `maxPlayers` from `GameFactory` — client cannot inflate the cap.
- Single-room rule: a user is in at most one room at a time, preventing duplicate identities.
- Spectator cap (10) enforced server-side.
- Private rooms (`isPrivate: true`) are not listed by `getActiveRooms` to public; they are reachable only via direct `roomCode`.
- Server never trusts `socket.user.role` claims for room privileges except admin-only force-close (which is a REST endpoint, not a socket event).

---

## STEP 14 — Spectator Mode

Spectators receive sanitized game-state updates but cannot send `game:action` or `game:rematch_request`.

**Rules:**
- `room:join` with `asSpectator: true` adds to `room.spectators`.
- Spectator cap = 10 (enforced in `addSpectator`).
- Spectators receive `game:state`, `game:turn`, `game:end`, `chat:message`, `room:state`.
- `game:action` from a spectator -> `error_event { code: 'NOT_A_PLAYER' }`.
- `game:rematch_request` from a spectator -> ignored.
- A player can be promoted to spectator if a game ends and they choose to stay (UI calls `room:join` with `asSpectator: true` after `game:end`).

**Sanitization:** the Game class's `getStateFor(userId)` (Step 17) returns a public state for spectators (e.g., card game: face-up cards visible, hands hidden).

**SECURITY:**
- `game:action` handler hard-checks `room.players.find(p => p.userId === socket.user._id)` before invoking game logic.
- Spectator state is filtered through `getStateFor(null)` so private game data (hidden cards) never leaks.

---

## STEP 15 — Matchmaking Queue

Public auto-matchmaker: a player picks a `gameType`, gets queued, and is auto-paired into a fresh room when enough players exist.

**`services/matchmakingService.ts`:**

| Function | Behavior |
|---|---|
| `joinQueue({ user, gameType })` | Refuse if user is already in a room or already queued. `RPUSH mm:<gameType> <json>` with `{ userId, displayName, isGuest, avatarUrl, queuedAt }`. Set per-entry TTL via separate `SET mm:lock:<userId> 1 EX <ttl>`. After enqueue, call `tryMatch(gameType)`. |
| `cancelQueue({ user, gameType })` | `LREM mm:<gameType>` matching entry. `DEL mm:lock:<userId>`. |
| `tryMatch(gameType)` | While queue length >= `GameFactory.getConfig(gameType).maxPlayers`: `LPOP` that many entries, double-check each user is still online (via `mm:lock` existence + connected-socket index), create a new public room via `roomService.createRoom`, `addPlayer` for each, emit `matchmaking:matched { roomCode }` to each socket. |
| `cleanupOnDisconnect(userId)` | Remove user from any queues. |

**`socket/matchmakingHandlers.ts`:**

| Event | Flow |
|---|---|
| `matchmaking:join` | Validate `{ gameType }`. Call `joinQueue`. Emit `matchmaking:queued { gameType, position }`. |
| `matchmaking:cancel` | Call `cancelQueue`. Emit `matchmaking:cancelled`. |

**Server-pushed:**
- `matchmaking:queued` immediate ack.
- `matchmaking:matched` `{ roomCode }` when paired (client then auto-emits `room:join`).

**SECURITY:**
- Queue entries are server-authored; clients cannot forge `userId` because we use `socket.user._id`.
- `tryMatch` re-verifies each popped user's online state and room-free state — stale entries are dropped, never paired.
- TTL on `mm:lock:<userId>` prevents zombie queue entries from holding a slot indefinitely.

---

## STEP 16 — In-Room Chat System

Server-stamped chat with a 50-message rolling window per room.

**`socket/chatHandlers.ts`:**

| Event | Flow |
|---|---|
| `chat:send` | Validate `{ message }` (1-300 chars after trim, escape HTML). Verify socket is in a room (player **or** spectator). Build `{ from: userId, displayName: socket.user.displayName, message, timestamp }`. `roomService.appendChat`. Broadcast `chat:message` to `room:<roomCode>`. |

**Per-socket throttle:** in-memory `Map<string, number>` (userId -> lastMsgAt). Reject if `< 500ms` since last message; emit `error_event { code: 'CHAT_THROTTLED' }`.

**SECURITY:**
- Message length validated and `escape()` applied — no stored XSS in chat history.
- Server stamps `from` and `timestamp` — clients cannot spoof identity or backdate messages.
- 500 ms per-user throttle prevents spam without needing a heavy rate-limiter library on the socket layer.
- Chat history capped at 50 — bounded memory.

---

# PHASE 4 — GAME LOGIC (SERVER-SIDE)

---

## STEP 17 — GameFactory Pattern & Base Game Class

Encapsulate game rules behind a uniform interface so transport code (handlers, services) stays game-agnostic. **TypeScript win:** `BaseGame` is generic over its own state type, and `GameFactory.create<T>` returns the concrete instance type — so `gameHandlers.ts` knows exactly which state shape it's dealing with at compile time.

**`shared/types/games.ts`:**

```ts
export type GameType = 'tictactoe' | 'cardgame';

export type Cell = null | 'X' | 'O';
export type TicTacToeBoard = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Card = { suit: Suit; rank: Rank };

export type TicTacToeState = {
  gameType: 'tictactoe';
  board: TicTacToeBoard;
  currentTurnUserId: string;
  players: { userId: string; displayName: string; symbol: 'X' | 'O' }[];
  winner: string | null;
  result: 'win' | 'draw' | null;
};

export type CardGameState = {
  gameType: 'cardgame';
  players: { userId: string; displayName: string; position: 0 | 1 | 2 | 3; handCount: number; tricksWon: number }[];
  myHand?: Card[];
  currentTrick: { userId: string; card: Card }[];
  leadSuit: Suit | null;
  currentTurnUserId: string;
  trickNumber: number;
  result: 'win' | 'draw' | null;
  winner: string | null;
};

export type GameState = TicTacToeState | CardGameState;
```

**`games/BaseGame.ts`** (abstract, generic over state):

```ts
export type GameConfig = { gameType: GameType; minPlayers: number; maxPlayers: number };
export type ActionResult = { stateChanged: boolean; gameOver: boolean; result?: 'win' | 'draw'; winnerId?: string };

export abstract class BaseGame<TState extends GameState> {
  static getConfig(): GameConfig { throw new Error('override'); }
  abstract getStateFor(userId: string | null): TState;
  abstract getPublicState(): TState;
  abstract applyAction(userId: string, action: string, payload: unknown): ActionResult;
  abstract getCurrentPlayerId(): string;
  abstract isGameOver(): boolean;
  abstract getResult(): { result: 'win' | 'draw'; winnerId?: string } | null;
  abstract getMoveLog(): unknown[];
  abstract serialize(): unknown;
  static deserialize(_raw: unknown): BaseGame<GameState> { throw new Error('override'); }
}
```

**`games/GameFactory.ts`** — generics make `create('tictactoe', players)` return `TicTacToe` (not just `BaseGame`):

```ts
import { TicTacToe } from './TicTacToe.js';
import { CardGame } from './CardGame.js';
import type { GameType } from '@mpg/shared/types/games';

type Registry = { tictactoe: typeof TicTacToe; cardgame: typeof CardGame };
const REGISTRY: Registry = { tictactoe: TicTacToe, cardgame: CardGame };

export const GameFactory = {
  create<T extends GameType>(gameType: T, players: RoomPlayer[]): InstanceType<Registry[T]> {
    const Cls = REGISTRY[gameType];
    if (!Cls) throw new Error('UNKNOWN_GAME_TYPE');
    return new Cls({ players }) as InstanceType<Registry[T]>;
  },
  getConfig(gameType: GameType): GameConfig {
    const Cls = REGISTRY[gameType];
    if (!Cls) throw new Error('UNKNOWN_GAME_TYPE');
    return Cls.getConfig();
  },
  list(): GameType[] { return Object.keys(REGISTRY) as GameType[]; },
};
```

**SECURITY:**
- Registry is a closed whitelist — unknown `gameType` strings fail compile-time AND throw at runtime.
- Subclasses enforce all server-side rules; handlers never touch raw state.
- `payload: unknown` in `applyAction` forces every game class to validate the payload shape before using it (no silent `any`).

---

## STEP 18 — TicTacToe — Move Validation & Turn Mechanics

Build the core move-handling logic for TicTacToe. Win detection and lifecycle (Step 19) come next.

**`games/TicTacToe.ts` extends `BaseGame<TicTacToeState>`.**

**Static config:** `static getConfig(): GameConfig { return { gameType: 'tictactoe', minPlayers: 2, maxPlayers: 2 }; }`.

**Internal state:**

| Field | Type | Notes |
|---|---|---|
| `board` | `Cell[]` (length 9) | values `null`, `'X'`, `'O'` |
| `players` | `[Player, Player]` | `players[0].symbol = 'X'`, `players[1].symbol = 'O'` (server assigns by join order) |
| `currentTurnIndex` | `0 \| 1` | starts at `0` |
| `winner` | `string \| null` | userId of winner |
| `result` | `'win' \| 'draw' \| null` | |
| `moves` | `Array<{ userId: string; index: number; symbol: 'X'\|'O'; t: number }>` | move log for match history |

**Constructor (`constructor({ players })`):**
- Validate `players.length === 2` (else throw — caller's bug).
- Initialize `board = Array(9).fill(null)`.
- Assign symbols: `players[0]` -> `X`, `players[1]` -> `O`.
- `currentTurnIndex = 0` (X plays first).

**`applyAction(userId, action, payload): ActionResult`** — this step focuses on move validation only:
- Reject if `this.result !== null` -> throw `GAME_OVER`.
- Reject if `action !== 'play'` -> throw `UNKNOWN_ACTION`.
- Validate payload shape: `typeof payload === 'object' && payload !== null && typeof (payload as any).index === 'number'`. Else throw `INVALID_PAYLOAD`.
- Reject if `userId !== this.players[this.currentTurnIndex].userId` -> throw `NOT_YOUR_TURN`.
- Let `index = (payload as { index: number }).index`. Reject if not integer in `0..8` -> `INVALID_MOVE`.
- Reject if `this.board[index] !== null` (cell occupied) -> `INVALID_MOVE`.
- **Apply:** `this.board[index] = this.players[this.currentTurnIndex].symbol`.
- Append to `this.moves`: `{ userId, index, symbol, t: Date.now() }`.
- Win/draw detection happens in Step 19 (`#checkOutcome` private method).
- If no outcome yet, flip turn: `this.currentTurnIndex = this.currentTurnIndex === 0 ? 1 : 0`.
- Return `{ stateChanged: true, gameOver: this.result !== null, result: this.result ?? undefined, winnerId: this.winner ?? undefined }`.

**Helpers:**
- `getCurrentPlayerId(): string` -> `this.players[this.currentTurnIndex].userId`.

**SECURITY:**
- Symbol assignment is server-controlled by join order; client never sets it.
- Cell index is the only client-controlled value; validated against type, range, and occupancy before mutating board.
- Turn check uses `userId` (from authenticated socket) — not a client-supplied identifier.
- Move log records the truth about who played what; later used by `recordMatch`.

---

## STEP 19 — TicTacToe — Win Detection & State Lifecycle

Add the win/draw checking and the per-viewer state serialization that completes the TicTacToe class.

**Private `#checkOutcome()` method** — called inside `applyAction` after a move is placed:

```ts
private static readonly WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6],
];

#checkOutcome(): void {
  for (const [a, b, c] of TicTacToe.WINNING_LINES) {
    const v = this.board[a];
    if (v !== null && v === this.board[b] && v === this.board[c]) {
      this.result = 'win';
      this.winner = this.players.find((p) => p.symbol === v)!.userId;
      this.winningLine = [a, b, c];
      return;
    }
  }
  if (this.board.every((cell) => cell !== null)) this.result = 'draw';
}
```

**`getStateFor(userId | null): TicTacToeState`** — TicTacToe has no hidden information, so spectator and player views are identical:

```ts
getStateFor(_userId: string | null): TicTacToeState {
  return {
    gameType: 'tictactoe',
    board: this.board as TicTacToeBoard,
    currentTurnUserId: this.players[this.currentTurnIndex]!.userId,
    players: this.players.map((p) => ({ userId: p.userId, displayName: p.displayName, symbol: p.symbol })),
    winner: this.winner,
    result: this.result,
    winningLine: this.winningLine ?? null,
  };
}
```

**Serialization for Redis (`serialize` / `deserialize`):**
- `serialize(): unknown` -> `{ board, players, currentTurnIndex, winner, result, winningLine, moves }`.
- `static deserialize(raw: unknown): TicTacToe` -> reconstruct by validating shape, then assigning fields directly.

**`getResult()`:** if `this.result !== null`, return `{ result: this.result, winnerId: this.winner ?? undefined }`. Else return `null`.

**`getMoveLog()`:** returns `this.moves` directly (used by `matchService.recordMatch`).

**Add `winningLine: [number, number, number] | null` field** — the client uses this to highlight the 3 winning cells (Step 39 + animation in Step 46).

**Update `shared/types/games.ts` `TicTacToeState`:** add `winningLine: readonly [number, number, number] | null`.

**SECURITY:**
- Winner detection is exhaustive over all 8 lines — no client claim influences it.
- `winningLine` is computed server-side; client cannot fake a win highlight.
- `serialize`/`deserialize` round-trip preserves type safety; on Redis hydration, shape is validated before reuse (catches Redis corruption or version drift).

---

## STEP 20 — Card Game — Deck, Shuffle & Deal

Build the deterministic, cryptographically-seeded deal logic for the 4-player card game. Play and trick resolution come in Steps 21 and 22.

**`games/CardGame.ts` extends `BaseGame<CardGameState>`.**

**Static config:** `static getConfig(): GameConfig { return { gameType: 'cardgame', minPlayers: 4, maxPlayers: 4 }; }`.

**Rules summary** (encoded across this and the next two steps):
- 52-card deck, dealt 13 to each of 4 players.
- 13 tricks per game. Each trick: lead plays first; others must follow suit if possible; highest card of the lead suit wins the trick.
- Player with the most tricks wins. Tie -> draw.

**`utils/shuffle.ts`** — Fisher-Yates seeded by `crypto.randomBytes` (cryptographically unpredictable):

```ts
import { randomBytes } from 'node:crypto';

export const shuffle = <T>(input: readonly T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const rand = randomBytes(4).readUInt32BE(0);
    const j = rand % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};
```

**`utils/deck.ts`** — full 52-card deck generator:

```ts
import type { Card, Suit, Rank } from '@mpg/shared/types/games';

const SUITS: readonly Suit[] = ['spade', 'heart', 'diamond', 'club'];
const RANKS: readonly Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

export const buildDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
};
```

**Constructor (`constructor({ players })`):**
- Validate `players.length === 4` — else throw.
- Build deck via `buildDeck()`, shuffle.
- Slice into 4 hands of 13: `players[i].hand = shuffled.slice(i*13, i*13+13)`.
- Sort each player's hand for stable display: by suit order, then rank ascending.
- Determine starting lead: player who has `2 of clubs` plays first (classic rule). Set `currentTurnIndex` accordingly.
- Initialize: `currentTrick = []`, `leadSuit = null`, `tricksWon = { [userId]: 0 } x 4`, `trickNumber = 0`, `moves = []`.

**Internal state fields:**

| Field | Type | Notes |
|---|---|---|
| `players` | `Player[]` (length 4) | each `{ userId, displayName, position: 0\|1\|2\|3, hand: Card[] }` |
| `currentTrick` | `Array<{ userId: string; card: Card }>` | reset each trick |
| `leadSuit` | `Suit \| null` | set on first card of each trick |
| `currentTurnIndex` | `0\|1\|2\|3` | rotates by trick winner |
| `tricksWon` | `Record<string, number>` | keyed by userId |
| `trickNumber` | `0..12` | |
| `result` | `'win' \| 'draw' \| null` | set in Step 22 |
| `winner` | `string \| null` | |
| `moves` | `Array<{ userId; card; trickNumber; t }>` | |

**SECURITY:**
- Shuffle uses `crypto.randomBytes` not `Math.random` — predictable PRNG would let observers infer hands.
- Deal happens entirely server-side; hands are never serialized to clients in full.
- Constructor validates exactly 4 players to prevent malformed game starts.
- Position assignment (`0..3`) is from join order; not client-controlled.

---

## STEP 21 — Card Game — Play Card & Follow-Suit Enforcement

Implement `applyAction` for card plays with strict server-side enforcement of "must follow suit".

**`applyAction(userId, action, payload): ActionResult`:**
- Reject if `this.result !== null` -> throw `GAME_OVER`.
- Reject if `action !== 'play_card'` -> throw `UNKNOWN_ACTION`.
- Validate payload shape: must be `{ card: { suit: Suit; rank: Rank } }`. Throw `INVALID_PAYLOAD` otherwise.
- Reject if `userId !== this.players[this.currentTurnIndex].userId` -> throw `NOT_YOUR_TURN`.
- Find the player: `const player = this.players[this.currentTurnIndex]`.
- Verify card is in `player.hand`: search by exact `suit + rank` match. Throw `INVALID_CARD` if missing.
- **Follow-suit enforcement:** if `this.currentTrick.length > 0` and `this.leadSuit !== null`:
  - Compute `hasLeadSuit = player.hand.some(c => c.suit === this.leadSuit)`.
  - If `hasLeadSuit && card.suit !== this.leadSuit` -> throw `MUST_FOLLOW_SUIT`.
- **Apply move:**
  - Remove card from `player.hand` (in place).
  - Push `{ userId, card }` to `this.currentTrick`.
  - If `this.currentTrick.length === 1`, set `this.leadSuit = card.suit` (this player led).
  - Append to `this.moves`: `{ userId, card, trickNumber: this.trickNumber, t: Date.now() }`.
- **Trick complete?** If `this.currentTrick.length === 4`, hand off to `#resolveTrick()` (Step 22). Otherwise, advance turn: `this.currentTurnIndex = ((this.currentTurnIndex + 1) % 4) as 0|1|2|3`.
- Return `{ stateChanged: true, gameOver: this.result !== null }`.

**`getCurrentPlayerId(): string`** -> `this.players[this.currentTurnIndex].userId`.

**`getStateFor(viewerUserId: string | null): CardGameState`** — strict per-viewer filtering:

```ts
getStateFor(viewerUserId: string | null): CardGameState {
  const me = viewerUserId ? this.players.find((p) => p.userId === viewerUserId) : null;
  return {
    gameType: 'cardgame',
    players: this.players.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      position: p.position,
      handCount: p.hand.length,
      tricksWon: this.tricksWon[p.userId] ?? 0,
    })),
    myHand: me ? [...me.hand] : undefined,
    currentTrick: this.currentTrick.map((c) => ({ userId: c.userId, card: c.card })),
    leadSuit: this.leadSuit,
    currentTurnUserId: this.players[this.currentTurnIndex]!.userId,
    trickNumber: this.trickNumber,
    result: this.result,
    winner: this.winner,
  };
}
```

**Critical:** `myHand` is included only when viewer is one of the 4 players. Spectators get `myHand: undefined`. Other players' hands are exposed only as `handCount`.

**SECURITY:**
- Hand contents never leave the server for any viewer except the owning player.
- `MUST_FOLLOW_SUIT` is enforced by inspecting the **server's copy** of the player's hand, never the client's claim.
- Card identity match is exact (suit + rank); prevents "I played a heart-2" lies when the player doesn't own that card.
- The `myHand` filter in `getStateFor` is the single sanitization gate — emit helpers (Step 23) call this method per-recipient.

---

## STEP 22 — Card Game — Trick Resolution & Final Scoring

Resolve completed tricks, rotate the lead, and determine the final winner.

**Private `#resolveTrick()` method** — called from `applyAction` when `currentTrick.length === 4`:

```ts
private static readonly RANK_ORDER: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

#resolveTrick(): void {
  const lead = this.leadSuit!;
  const followingLeadSuit = this.currentTrick.filter((c) => c.card.suit === lead);
  const winningEntry = followingLeadSuit.reduce((best, cur) =>
    CardGame.RANK_ORDER[cur.card.rank] > CardGame.RANK_ORDER[best.card.rank] ? cur : best
  );
  this.tricksWon[winningEntry.userId] = (this.tricksWon[winningEntry.userId] ?? 0) + 1;
  this.currentTurnIndex = this.players.findIndex((p) => p.userId === winningEntry.userId) as 0|1|2|3;
  this.currentTrick = [];
  this.leadSuit = null;
  this.trickNumber += 1;
  if (this.trickNumber >= 13) this.#finalize();
}

#finalize(): void {
  const entries = Object.entries(this.tricksWon);
  const maxTricks = Math.max(...entries.map(([, v]) => v));
  const topPlayers = entries.filter(([, v]) => v === maxTricks);
  if (topPlayers.length === 1) {
    this.result = 'win';
    this.winner = topPlayers[0]![0];
  } else {
    this.result = 'draw';
    this.winner = null;
  }
}
```

**`getResult()` and `isGameOver()`:**

```ts
getResult(): { result: 'win' | 'draw'; winnerId?: string } | null {
  return this.result === null ? null : { result: this.result, winnerId: this.winner ?? undefined };
}
isGameOver(): boolean { return this.result !== null; }
```

**Serialization (`serialize` / `deserialize`):**
- `serialize()` -> `{ players, currentTrick, leadSuit, currentTurnIndex, tricksWon, trickNumber, result, winner, moves }`.
- `static deserialize(raw)` -> validate top-level shape, reconstruct hands as `Card[]`, restore counts/state.
- Critical: `deserialize` runs after every Redis read; if shape is invalid (e.g., from a code-version mismatch), throw and let the handler emit `error_event`.

**`getMoveLog()`:** returns `this.moves` for `matchService.recordMatch`. The full move log lets admins replay any past game.

**SECURITY:**
- Trick winner derived purely from server state; client cannot influence which card wins.
- Final result is deterministic given the move log — perfect for replay and auditing.
- `#finalize` handles ties by setting `winner: null` and `result: 'draw'` so stat tracker (Step 8) doesn't credit anyone.
- All private methods use TypeScript private fields (`#name`) so they cannot be called from outside the class even via `as any` casts.

---

## STEP 23 — Game Lifecycle (Start, Turn, End, Rematch)

Tie game logic to room state and Socket.io broadcasts.

**`socket/gameHandlers.ts`:**

| Function | Flow |
|---|---|
| `startGame(roomCode)` | Read room. Build `Game = GameFactory.create(gameType, players)`. Persist `gameState = serialized internal state` via `roomService.setGameState`. Update `room.status = 'in_progress'`, `room.startedAt = Date.now()`. For each player socket in the room, emit `game:state` with `Game.getStateFor(userId)`. Emit `game:turn { currentPlayerId }`. |
| `handleAction(socket, payload)` | Resolve room. Reject if `socket.user._id` not a player. Hydrate `Game` from `room.gameState`. Call `Game.applyAction(socket.user._id, action, payload.payload)`. On error, emit `error_event` with mapped code. On success: persist new state. Emit `game:state` per-viewer (per-socket sanitized). If `Game.isGameOver()`, call `endGame(roomCode)`. Else emit `game:turn`. |
| `endGame(roomCode)` | Compute `result` and `winner` from `Game.getResult()`. `roomService.updateRoom` to `status='ended'`, `endedAt=Date.now()`. Call `matchService.recordMatch(...)`. Emit `game:end { result, winnerId, winnerDisplayName, matchId }`. Reset `rematchVotes = []`. |
| `handleRematchRequest(socket)` | Reject if room status !== `ended`. Add `socket.user._id` to `room.rematchVotes` (de-duped). Broadcast `room:state`. If all current players voted, reset: build a new `Game`, `status='in_progress'`, `gameState=new state`, `startedAt=now`, clear chat? (keep chat). Re-emit `game:state` and `game:turn`. |
| `handleAbortOnLeave(roomCode, leftUserId)` | If `room.status === 'in_progress'`: in TicTacToe (2 players), award win to remaining player (`result='win'`, `winnerId=remaining`). In CardGame (4 players), `matchService.abortMatch(...)` and emit `game:end { result: 'aborted' }`. |

**Per-viewer state emission helper:**

```ts
const emitStateToRoom = <T extends GameState>(
  io: TypedServer,
  room: Room,
  game: BaseGame<T>
): void => {
  for (const p of room.players) io.to(`user:${p.userId}`).emit('game:state', game.getStateFor(p.userId));
  for (const s of room.spectators) io.to(`user:${s.userId}`).emit('game:state', game.getStateFor(null));
};
```

**SECURITY:**
- Server is the single source of truth — `gameState` lives in Redis, hydrated per-action.
- `getStateFor(userId)` ensures private game data (card hands) is never broadcast room-wide.
- Match recording is server-side only and atomic with stat increments.
- Rematch votes are reset on `game:end` to prevent stale-vote pollution.
- Aborted games still record a row in Postgres (for admin auditing) but do **not** increment stats.

---

## STEP 24 — Disconnect Handling & Reconnection (Server-Side)

Use Socket.io's built-in retry with a server-side grace period before forfeiting.

**`socket/disconnectHandlers.ts`:**

| Hook | Flow |
|---|---|
| `disconnect` | Look up the user's room via `user:room:<userId>`. If none, also call `matchmakingService.cleanupOnDisconnect(userId)` and return. Mark `player.isConnected = false` in room. Broadcast `room:state` (others see disconnected dot). Start a 30 s grace timer keyed by `<roomCode>:<userId>`. If user reconnects within 30 s and rejoins: cancel timer, mark `isConnected = true`, re-emit fresh `game:state`. If timer elapses: treat as `room:leave` (calls `roomService.removePlayer` and, if applicable, `gameHandlers.handleAbortOnLeave`). |
| Reconnection | On every `connection`, after `authSocket`, check `user:room:<userId>` in Redis. If a live room exists, auto-`socket.join(\`room:${code}\`)` and emit `room:state` + per-viewer `game:state`. |

**Client-side counterpart:** the socket.io-client uses default `reconnection: true`, `reconnectionAttempts: Infinity`, `reconnectionDelay: 1000`, `reconnectionDelayMax: 5000`.

**SECURITY:**
- Grace timer is keyed and cleared in-memory (Map). On server restart, all rooms are still in Redis but timers reset — clients must reconnect within 30 s of new boot or the room cleans up via TTL.
- Reconnection re-runs the JWT handshake; an attacker cannot resume someone else's session without their token.
- Forfeit logic only triggers if the user was an active player AND the game was in progress.

---

# PHASE 5 — BACKEND VALIDATION, SECURITY & LOGGING

---

## STEP 25 — REST Validators (express-validator chains)

Wire `express-validator` rules to every REST endpoint. Each validator file exports `ValidationChain[]` arrays plus a centralized `validate` middleware that returns `ApiResponse<never>` `{ success: false, errors: [...] }` on failure.

**`validators/*.ts` files:**

| File | Validators |
|---|---|
| `authValidators.ts` | `registerValidator` (username regex `^[a-z0-9_]+$` 3-20, email `isEmail` + `normalizeEmail`, password min 8 + complexity, displayName 2-30 trim+escape), `loginValidator`, `guestLoginValidator` (displayName 3-20 + escape), `changePasswordValidator`, `deleteAccountValidator` |
| `userValidators.ts` | `updateProfileValidator` (displayName, bio escape <=200, avatarUrl URL), `preferencesValidator` (each key checked against enum/boolean — see below), `usernameParamValidator`, `paginationValidator` |
| `matchValidators.ts` | `uuidParamValidator` (`isUUID(4)`), `gameTypeFilterValidator` (`isIn(['tictactoe','cardgame'])`) |
| `adminValidators.ts` | `updateRoleValidator` (role enum), `userIdParamValidator`, `userSearchValidator` (escape + regex-escape via `customSanitizer`) |

**`preferencesValidator` per-key rules:**

| Key | Rule |
|---|---|
| `theme` | `optional().isIn(['light','dark','system'])` |
| `fontSize` | `optional().isIn(['small','medium','large'])` |
| `animations` | `optional().isBoolean()` |
| `sounds` | `optional().isBoolean()` |
| `soundVolume` | `optional().isFloat({ min: 0, max: 1 })` |
| `language` | `optional().isIn(['en'])` |
| `notifications.matchInvite` | `optional().isBoolean()` |
| `notifications.rematch` | `optional().isBoolean()` |
| `privacy.showStats` | `optional().isBoolean()` |
| `privacy.showOnLeaderboard` | `optional().isBoolean()` |

**Centralized `validate` middleware (`middleware/validate.ts`):**

```ts
import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: result.array().map((e) => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })),
  });
};
```

**`utils/escapeRegex.ts`:** `(str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. Used in any user-search regex (admin user search, leaderboard search) to prevent ReDoS.

**SECURITY:**
- Every text field that ends up rendered in another user's view (displayName, bio, chat, search) is `escape()`d to prevent stored XSS.
- Email is `normalizeEmail()`d so `User+1@gmail.com` and `user@gmail.com` cannot register as separate accounts.
- All ID params validated via `isUUID(4)` — invalid ids fail at validator layer, never reach the database driver.
- Pagination clamped: `limit` `isInt({ min: 1, max: 50 })` (or 100 for leaderboard), `page` `isInt({ min: 1 })`.

---

## STEP 26 — Socket Event Validators (Type-Narrowing Helpers)

Hand-rolled validators for every socket event. Each returns a discriminated union so handlers narrow safely with TypeScript.

**`validators/socketValidators.ts`:**

```ts
type ValidatorResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

export const validateRoomCreatePayload = (raw: unknown): ValidatorResult<{ gameType: GameType; isPrivate: boolean }> => {
  if (typeof raw !== 'object' || raw === null) return { ok: false, code: 'INVALID_PAYLOAD', message: 'Payload must be an object' };
  const data = raw as { gameType?: unknown; isPrivate?: unknown };
  if (data.gameType !== 'tictactoe' && data.gameType !== 'cardgame')
    return { ok: false, code: 'INVALID_GAME_TYPE', message: 'Unknown game type' };
  if (typeof data.isPrivate !== 'boolean')
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'isPrivate must be boolean' };
  return { ok: true, value: { gameType: data.gameType, isPrivate: data.isPrivate } };
};
```

**Validators required:**

| Validator | Rule |
|---|---|
| `validateRoomCreatePayload` | `gameType` in `['tictactoe','cardgame']`, `isPrivate: boolean` |
| `validateRoomJoinPayload` | `roomCode` matches `/^[a-f0-9]{8}$/`, `asSpectator` boolean optional |
| `validateChatPayload` | `message` string, length 1-300 after trim, escape HTML chars |
| `validateGameActionPayload` | `action` non-empty string, `payload` object — per-game shape checked inside the game class's `applyAction` |
| `validateMatchmakingJoin` | `gameType` in allowed list |

**Handler usage pattern:**

```ts
socket.on('room:create', (raw: unknown) => {
  const v = validateRoomCreatePayload(raw);
  if (!v.ok) return socket.emit('error_event', { code: v.code, message: v.message });
  void roomService.createRoom({ host: socket.data.user, ...v.value });
});
```

**`utils/escapeHtml.ts`** — minimal HTML entity escaper:

```ts
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);
```

**SECURITY:**
- Every socket payload is treated as `unknown` until validated — TypeScript prevents accidental property access on raw input.
- Payload type narrowing is enforced at compile time; handlers cannot accidentally use unvalidated input.
- Chat messages are HTML-escaped server-side, then escape-on-render is applied client-side (defense-in-depth).
- `roomCode` regex prevents path-traversal-style strings from reaching Redis keys.
- `gameType` whitelist matches the closed-world `GameFactory` registry — adding a new game requires updating both.

---

## STEP 27 — Comprehensive Security Audit Checklist

- [x] Mass assignment: every controller destructures only allowed fields; no `req.body` spread into models.
- [x] Role protection: `role` is **not** settable via any non-admin endpoint.
- [x] User enumeration: identical error message for wrong email vs. wrong password.
- [x] Password security: hashed with bcrypt (rounds 12), never returned in any response, change requires current password.
- [x] JWT: secret length >= 32 chars enforced at startup in production. Guest tokens TTL <= 2 hours.
- [x] Rate limiters: separate instances for global, auth, admin, upload.
- [x] Helmet: enabled with default safe headers.
- [x] CORS: strict specific origin; never `*` in production.
- [x] Body size limits: `express.json({ limit: '10kb' })`. Socket.io `maxHttpBufferSize: 1e5`.
- [x] SQL injection: Drizzle + `postgres-js` parameterized queries. Zero raw string interpolation.
- [x] Prototype-pollution: `sanitizeMiddleware` strips `__proto__`/`constructor`/`prototype` keys.
- [x] Express 5 compatibility: no code assigns to `req.query`.
- [x] XSS: `escape()` applied via express-validator on all user text.
- [x] ReDoS: `escapeRegex` used on every regex-based user search.
- [x] Ownership checks: `game:action` verifies `socket.user._id` is a current player.
- [x] Spectator restrictions: spectators rejected on `game:action`; `getStateFor(null)` hides hidden info.
- [x] Admin self-protection: cannot delete self, cannot change own role, last-admin guarded.
- [x] Pagination clamp: `limit <= 100` (leaderboard), `<= 50` (matches/users).
- [x] File upload: MIME whitelist, 5 MB cap, server-generated filenames.
- [x] Error handler: never exposes stack traces in production.
- [x] Privacy: `preferences.privacy.showStats` and `showOnLeaderboard` enforced server-side.
- [x] x-powered-by disabled.
- [x] `.env.example` synced; no real secrets.
- [x] No `console.log` of tokens, hashes, or PII in production code.
- [x] Typed sockets: `Server<ClientToServerEvents, ServerToClientEvents>` ensures payload safety at compile time.

---

## STEP 28 — Logging & Observability (pino + structured logs)

Replace ad-hoc `console.log` with a structured logger so production logs are queryable, redact secrets, and integrate cleanly with Render/Sentry.

**`utils/logger.ts`:**

```ts
import pino from 'pino';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  ...(isProd
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } } }),
  redact: {
    paths: ['password', '*.password', 'token', '*.token', 'authorization', 'req.headers.authorization', 'req.body.password'],
    remove: true,
  },
  base: { service: 'multiplayer-game-backend' },
});

export const childLogger = (bindings: Record<string, unknown>) => logger.child(bindings);
```

**Usage patterns:**

| Where | Pattern |
|---|---|
| HTTP request log | `pino-http` middleware mounted just after helmet/cors. |
| Socket events | `socket.data.logger = childLogger({ socketId, userId })`. |
| Errors | `logger.error({ err, req }, 'Unhandled error')`. |
| Game lifecycle | `logger.info({ roomCode, gameType, players: players.length }, 'Game started')`. |
| Match record | `logger.info({ matchId, result, durationMs }, 'Match recorded')`. |
| Disconnects | `logger.warn({ userId, roomCode, reason }, 'Disconnect')`. |

**SECURITY:**
- Redaction is enforced at the logger level — even if a developer accidentally logs `req.body`, passwords are stripped.
- No PII (email, IP) in info-level logs by default; only in debug.
- Stack traces logged server-side only; never sent to client.

---

# PHASE 6 — BACKEND TESTING

---

## STEP 29 — Unit Tests (Game Logic, Utils, Validators)

Lock down the most-changed and highest-leverage logic with fast unit tests. **No I/O** — pure function tests run in milliseconds.

**Tooling:** `vitest` (faster than Jest, ESM-native, TS out-of-the-box).

**`server/vitest.config.ts`:**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.test.ts', '**/types/**', '**/seed/**', 'src/server.ts'],
    },
  },
});
```

**Test files (collocated next to source as `*.test.ts`):**

| File | Coverage |
|---|---|
| `games/__tests__/TicTacToe.test.ts` | Move validation, all 8 winning lines, draw detection, `getStateFor` |
| `games/__tests__/CardGame.test.ts` | Deal distribution, must-follow-suit enforcement, trick winner, final scoring, `getStateFor(userId)` hides other hands |
| `games/__tests__/GameFactory.test.ts` | `create` returns correct class, unknown type throws, `getConfig` correct per game |
| `utils/__tests__/escapeRegex.test.ts` | All regex special chars escaped |
| `utils/__tests__/escapeHtml.test.ts` | All HTML entities replaced |
| `utils/__tests__/shuffle.test.ts` | Same length/elements, order varies |
| `utils/__tests__/generateRoomCode.test.ts` | Returns 8-hex-char string, no collisions across 10k iterations |
| `validators/__tests__/socketValidators.test.ts` | Each validator: valid -> `ok: true`, invalid -> `ok: false` with expected code |
| `services/__tests__/roomService.test.ts` | Mock ioredis. Test capacity, host transfer, cleanup |

**Coverage gate:** >= 85% on `games/`, `utils/`, `validators/`.

**npm scripts (`server/package.json`):**

| Script | Command |
|---|---|
| `test` | `vitest` |
| `test:run` | `vitest run` |
| `test:coverage` | `vitest run --coverage` |
| `test:watch` | `vitest --watch` |

---

## STEP 30 — Integration Tests (REST + Socket.io flows)

End-to-end tests that exercise the real Express app and a real Socket.io server, against ephemeral test instances of Postgres and Redis.

**Tooling:** `vitest`, `supertest` (REST), `socket.io-client` (sockets), `@testcontainers/postgresql`, `ioredis-mock`.

**Test infrastructure (`src/__tests__/setup.integration.ts`):**

- `beforeAll`: start a Testcontainers Postgres instance, set `DATABASE_URL`, run `migrate(...)`, set `REDIS_URL` to `ioredis-mock://`, start the app on a random port, attach Socket.io.
- `afterEach`: `TRUNCATE matches, users RESTART IDENTITY CASCADE`; `redis.flushall()`.
- `afterAll`: close server, stop Postgres container.

**Test files:**

| File | Flow tested |
|---|---|
| `auth.integration.test.ts` | Register -> login -> getMe -> updateProfile -> changePassword -> deleteAccount. Negative: duplicate username, wrong password, role escalation |
| `guest.integration.test.ts` | `loginAsGuest` returns valid token; guest cannot access `/api/users/me`; guest can connect socket and join a room |
| `room.integration.test.ts` | Two clients connect -> create room -> join -> both receive `room:state` -> full room rejection |
| `tictactoe.integration.test.ts` | Full game: connect, room, alternating moves, win detected, match recorded, stats incremented |
| `cardgame.integration.test.ts` | 4 players connect, must-follow-suit enforced, trick resolution, final scoring |
| `spectator.integration.test.ts` | Spectator receives `game:state` without `myHand`, `game:action` rejected |
| `matchmaking.integration.test.ts` | 2 clients queue -> both receive `matchmaking:matched` -> game starts |
| `chat.integration.test.ts` | Message broadcast, 300-char limit, throttle, 50-msg cap |
| `disconnect.integration.test.ts` | Disconnect mid-game -> reconnect within grace -> resume. No reconnect -> forfeit |
| `admin.integration.test.ts` | Admin token required. Self-protection. Last-admin guard |
| `security.integration.test.ts` | SQL injection treated as plain string, XSS escaped, oversized body rejected, prototype-pollution stripped, helmet headers present, role escalation fails silently |

**npm scripts:**

| Script | Command |
|---|---|
| `test:integration` | `vitest run --config vitest.integration.config.ts` |
| `test:all` | `npm run test:run && npm run test:integration` |

---

# PHASE 7 — CLIENT FOUNDATION

---

## STEP 31 — Client Setup: Vite, Tailwind, Axios, Socket.io-client

**Vite config (`vite.config.ts`):**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  resolve: { alias: { '@mpg/shared': path.resolve(__dirname, '../shared') } },
});
```

**`vite-env.d.ts`** — typed env vars:

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
```

**`src/index.css`:**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-primary: #6366f1;
  --color-accent: #f59e0b;
  --color-success: #10b981;
  --color-danger: #ef4444;
}

@media (prefers-color-scheme: light) {
  :root { color-scheme: light; }
}

.font-size-small  { font-size: 14px; }
.font-size-medium { font-size: 16px; }
.font-size-large  { font-size: 18px; }
```

**`src/api/axios.ts`:**

```ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
  timeout: 15000,
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

**Service files** — each function returns `Promise<T>` where `T` is from `shared/types/*.ts`:

| File | Functions |
|---|---|
| `authService.ts` | `register`, `login`, `loginAsGuest`, `getMe`, `updateProfile`, `changePassword`, `deleteAccount` |
| `userService.ts` | `getPublicProfile`, `updatePreferences`, `uploadAvatar`, `removeAvatar`, `getUserMatches` |
| `matchService.ts` | `getRecentMatches`, `getMatchById` |
| `leaderboardService.ts` | `getLeaderboard` |
| `adminService.ts` | `getDashboardStats`, `getUsers`, `updateUserRole`, `deleteUser`, `getActiveRooms`, `forceCloseRoom`, `getRecentMatches` |

**`src/socket/socket.ts`** — fully typed socket.io-client singleton:

```ts
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@mpg/shared/types/events';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export const connectSocket = (token: string): AppSocket => {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
};

export const getSocket = (): AppSocket | null => socket;
export const disconnectSocket = (): void => { socket?.disconnect(); socket = null; };
```

**`src/hooks/useSocketEvent.ts`** — generic over event names:

```ts
import { useEffect } from 'react';
import type { ServerToClientEvents } from '@mpg/shared/types/events';
import { getSocket } from '../socket/socket';

export const useSocketEvent = <K extends keyof ServerToClientEvents>(
  eventName: K,
  handler: ServerToClientEvents[K]
): void => {
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.on(eventName, handler as never);
    return () => { s.off(eventName, handler as never); };
  }, [eventName, handler]);
};
```

**SECURITY:**
- Token stored in `localStorage` only — never in non-`httpOnly` cookies.
- 401 interceptor clears token and redirects, preventing stale-token usage.
- Socket auth attached via `auth: { token }` (handshake) — never logged anywhere.

---

## STEP 32 — Reusable UI Kit (Button, Input, Modal, Spinner, Card, Badge)

Build the design-system primitives once, then use them across every page.

**File layout — `client/src/components/ui/`:**

```
ui/
├── Button.tsx          # Primary, secondary, ghost, danger variants
├── IconButton.tsx      # Icon-only with required aria-label
├── Input.tsx           # Text input with label, error, hint slots
├── Textarea.tsx        # Multi-line input with character counter
├── Select.tsx          # Native select with consistent styling
├── ToggleSwitch.tsx    # Accessible switch (role="switch")
├── SelectableCard.tsx  # Radio-card pattern (theme picker, gameType picker)
├── Modal.tsx           # Headless modal with focus trap + escape close
├── ConfirmModal.tsx    # Composed on Modal: title + message + confirm/cancel
├── Spinner.tsx         # Sizes: sm/md/lg, optional center prop
├── Skeleton.tsx        # Loading placeholder (rectangular, circular)
├── Badge.tsx           # Status colors (default, success, warning, danger, info)
├── StatusBadge.tsx     # Composed: maps room status -> Badge variant + icon
├── RoleBadge.tsx       # Composed: player vs admin
├── Card.tsx            # Surface container with consistent padding/border
├── Avatar.tsx          # Image or initials fallback, sizes: xs/sm/md/lg
├── Tooltip.tsx         # Hover/focus tooltip
├── Tabs.tsx            # Headless tabs with keyboard nav
├── EmptyState.tsx      # Icon + heading + description + CTA slot
├── CharacterCounter.tsx
└── index.ts            # Re-export all
```

**`utils/cn.ts`** — tiny `clsx`-style class merger (no dependency):

```ts
export const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');
```

**Modal focus management:** On open: stash previously focused element, focus modal's first focusable. On close: restore focus. Trap Tab/Shift+Tab. Escape key closes. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linked to title id.

**SECURITY:**
- No component uses `dangerouslySetInnerHTML`. Text content is JSX-escaped by default.
- Modals render via React portal into `document.body`.

---

## STEP 33 — Contexts: Auth, Socket, Preferences

**`AuthContext.tsx`** typed state: `{ user: AuthUser | null; token: string | null; loading: boolean }`. Methods: `login`, `register`, `loginAsGuest`, `logout`, `updateUser`, `isAdmin(): boolean`, `isGuest(): boolean`. On mount: read token from `localStorage`; if present, call `getMe` (skip for guests — decode token client-side to recover claims).

**`SocketContext.tsx`** typed state: `{ socket: AppSocket | null; isConnected: boolean }`. On `AuthContext.token` change, call `connectSocket(token)` if present, else `disconnectSocket()`. Track `connect`/`disconnect`/`connect_error` events.

**`PreferencesContext.tsx`** typed state: `{ preferences: UserPreferences }`. For registered users, hydrate from `getMe` and persist via `updatePreferences`. For guests, persist to `localStorage`. Apply theme, font size, animations toggle, sounds toggle.

**SECURITY:**
- Client-side JWT decode is purely informational; the server still verifies on every request.
- Guest preferences live only in `localStorage` — no backend write path.

---

## STEP 34 — Layouts, Navbar & Routing

**Layouts:**

| Component | Composition |
|---|---|
| `MainLayout` | `<Navbar /> <Outlet /> <Footer />` |
| `AdminLayout` | sidebar + `<Outlet />`. Mobile collapse. |
| `SettingsLayout` | side nav + `<Outlet />`. Mobile dropdown. |

**Route guards:**

| Guard | Behavior |
|---|---|
| `ProtectedRoute` | Wait for `loading=false`; if no `user`, redirect `/login`. |
| `AdminRoute` | `ProtectedRoute` + `user.role === 'admin' && !user.isGuest`. |
| `GuestOnlyRoute` | If `user`, redirect `/`. |
| `RegisteredOnlyRoute` | `ProtectedRoute` + `!user.isGuest`. |

**`App.tsx` routes:**

| Path | Element | Guard |
|---|---|---|
| `/` | `HomePage` | `MainLayout` |
| `/login` | `LoginPage` | `GuestOnlyRoute` |
| `/register` | `RegisterPage` | `GuestOnlyRoute` |
| `/guest` | `GuestEntryPage` | `GuestOnlyRoute` |
| `/room/:roomCode` | `GameRoomPage` | `ProtectedRoute` |
| `/leaderboard` | `LeaderboardPage` | -- |
| `/u/:username` | `PublicProfilePage` | -- |
| `/profile` | `MyProfilePage` | `RegisteredOnlyRoute` |
| `/settings/*` | `SettingsLayout` + nested | `RegisteredOnlyRoute` |
| `/admin/*` | `AdminLayout` + nested | `AdminRoute` |
| `*` | `NotFoundPage` | -- |

---

# PHASE 8 — CLIENT PAGES

---

## STEP 35 — Auth Pages (Login, Register, Guest Entry)

**`LoginPage.tsx`**: typed form state `{ email, password }`. Submit -> `authService.login` -> store token -> navigate `/`.

**`RegisterPage.tsx`**: typed form state `{ username, email, password, displayName }`. Submit -> `register` -> auto-login -> navigate `/`.

**`GuestEntryPage.tsx`**: typed form state `{ displayName }`. Submit -> `loginAsGuest` -> navigate `/`. Banner: "Guest progress is not saved."

---

## STEP 36 — Home / Lobby Page (Create / Join / Matchmake)

**`HomePage.tsx` sections:**
1. **Hero** with display name and CTAs.
2. **Create Room** card: select `gameType`, private toggle, "Create" -> emit `room:create`.
3. **Join Room** card: input `roomCode` -> emit `room:join`.
4. **Matchmaking** card: select gameType -> emit `matchmaking:join` -> show queue position.

---

## STEP 37 — Game Room Page Orchestration

**`GameRoomPage.tsx`** layout. Typed state: `{ room, gameState, chat, turnInfo }`.

- **Header**: room code (copy button), gameType, status pill, Leave button.
- **Left column**: `PlayerList`, `SpectatorList`.
- **Center column**: `GameBoardFrame` -> `<TicTacToeBoard />` or `<CardGameTable />`. `TurnIndicator`. `RematchPrompt`.
- **Right column**: `ChatPanel`.

---

## STEP 38 — Game Room Sub-Components (PlayerList, SpectatorList, ChatPanel, TurnIndicator, RematchPrompt)

Decompose `GameRoomPage`'s complex layout into focused, individually-testable child components.

**`PlayerList.tsx`** — avatar, displayName, online dot, turn highlight.
**`SpectatorList.tsx`** — compact horizontal list with counter badge.
**`TurnIndicator.tsx`** — "Your turn" / "Waiting for {name}" with `aria-live="polite"`.
**`ChatPanel.tsx`** — scrollable history, 300-char input, throttle UX.
**`RematchPrompt.tsx`** — modal overlay with vote status.
**`GameBoardFrame.tsx`** — discriminated-union switch on `gameState.gameType`.

---

## STEP 39 — TicTacToe Board Component

**`TicTacToeBoard.tsx`**: 3x3 CSS grid, click on empty cell when `isMyTurn`, winning line highlighted, sounds on play/win/lose.

---

## STEP 40 — Card Game Component

**`CardGameTable.tsx`**: 4-player layout, center trick area, bottom hand, follow-suit dimming, card play on click.

---

## STEP 41 — Leaderboard Page

**`LeaderboardPage.tsx`**: filters by `gameType`, pagination. Table columns: Rank, Avatar, Display Name, Wins, Losses, Draws, Games Played, Win Rate.

---

## STEP 42 — Profile Pages (Public & Own)

**`PublicProfilePage.tsx`** (`/u/:username`): Header + Tabs (Stats, Recent Matches). Privacy-filtered.

**`MyProfilePage.tsx`** (`/profile`): Same layout plus "Edit profile" CTA -> `/settings/profile`.

---

## STEP 43 — Settings Pages

Auto-save on blur for non-sensitive prefs. Confirm modal for destructive actions.

| Page | Fields |
|---|---|
| `ProfileSettings` | displayName, bio, avatar upload/remove |
| `AccountSettings` | change password, delete account |
| `AppearanceSettings` | theme, fontSize, animations, sounds |
| `NotificationsSettings` | matchInvite, rematch toggles |
| `PrivacySettings` | showStats, showOnLeaderboard toggles |

---

## STEP 44 — Admin Pages (Dashboard, Users, Active Rooms)

| Page | Content |
|---|---|
| `AdminDashboard` | Stat cards: Total Users, Admins, Matches, Active Rooms, Queue Size |
| `AdminUsers` | Search, filter, paginated table, role change, delete |
| `AdminActiveRooms` | Live list (polled), Force Close action |
| `AdminMatches` | Recent matches with game type filter |

---

# PHASE 9 — CLIENT POLISH

---

## STEP 45 — Reconnection UX Flow (Banner, Retry, Rejoin Toast)

Make disconnects feel handled. The server keeps a 30-second grace window (Step 24); the client communicates every state.

**Connection states:** `connected`, `disconnected_temporary`, `disconnected_terminal`, `reconnected`.

**`components/system/ConnectionBanner.tsx`** — mounted globally inside `MainLayout`.

---

## STEP 46 — Animations & Game Feel (Transitions, Piece Drop, Card Flip, Win Highlight)

All animations honor `preferences.animations`; when `false`, CSS short-circuits to `none`.

**Tailwind animation tokens:** `--animate-piece-drop`, `--animate-card-flip`, `--animate-card-deal`, `--animate-win-pulse`, `--animate-toast-in/out`, `--animate-modal-in/out`, `--animate-page-fade`.

**FLIP helper** (`utils/flipAnimation.ts`):

```ts
export const flipAnimate = (el: HTMLElement, prevRect: DOMRect, durationMs = 300): void => {
  const next = el.getBoundingClientRect();
  const dx = prevRect.left - next.left;
  const dy = prevRect.top - next.top;
  el.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
    { duration: durationMs, easing: 'ease-out' }
  );
};
```

**Reduced motion respect:** check both `preferences.animations` and `window.matchMedia('(prefers-reduced-motion: reduce)')`.

---

## STEP 47 — Sound Design (Preload, Volume, Mute, Contextual Triggers)

**Sound assets in `client/public/sounds/`:** `click.mp3`, `turn.mp3`, `move.mp3`, `win.mp3`, `lose.mp3`, `draw.mp3`, `chat.mp3`, `match-found.mp3`.

**`hooks/useSounds.ts`** — preloads audio, respects `preferences.sounds` and `soundVolume`.

**Trigger map:**

| Trigger | Sound | Component |
|---|---|---|
| Button click | `click` (volume 0.3) | `ui/Button.tsx` |
| Your turn | `turn` | `GameRoomPage.tsx` |
| Opponent move | `move` | `GameRoomPage.tsx` |
| Self winner | `win` | `GameRoomPage.tsx` |
| Opponent winner | `lose` | `GameRoomPage.tsx` |
| Draw | `draw` | `GameRoomPage.tsx` |
| Chat (window hidden) | `chat` | `ChatPanel.tsx` |
| Match found | `match-found` | `HomePage.tsx` |

---

## STEP 48 — Accessibility (Keyboard Nav, ARIA, Focus Management, Screen Reader)

Every interactive element must be reachable and announceable without a mouse.

**Game boards keyboard navigation:** TicTacToe: arrow keys + Enter/Space. CardGame: arrow keys cycle cards + Enter/Space.

**ARIA contracts:** `role="grid"` for board, `role="gridcell"` for cells, `role="status"` + `aria-live="polite"` for turn indicator, `role="dialog"` + `aria-modal="true"` for modals.

**Focus management:** Route change focuses `<h1>`. Modal traps focus. Post-game focuses rematch button.

**Color contrast:** WCAG AA (4.5:1 normal, 3:1 large). Status badges use icon + text, never color alone.

---

## STEP 49 — Performance (React.memo, Code Splitting, Lazy Routes, useCallback Strategy)

**Code splitting:** `/admin/*`, `/settings/*`, `/leaderboard`, `/u/:username` lazy-loaded. Critical paths not lazy.

**`React.memo` targets:** `PlayerList`, `SpectatorList`, `ChatMessage`, TicTacToe cells, `CardInHand`.

**Bundle analysis:** `rollup-plugin-visualizer` produces `stats.html`. Goal: main chunk < 250 KB gzipped.

---

## STEP 50 — Responsive Design (Mobile Game Room, Touch Targets, Adaptive Board)

**Breakpoints:** `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`.

**Mobile GameRoom:** Tab bar (`Players` / `Game` / `Chat`) at top; each fills viewport.

**Touch targets:** >= 44x44 px on mobile.

---

# PHASE 10 — CLIENT TESTING

---

## STEP 51 — Component Tests (React Testing Library: forms, board, chat)

**Tooling:** Vitest, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`.

**Test files:**

| File | What it covers |
|---|---|
| `LoginPage.test.tsx` | Form validation, error toast, redirect on success |
| `RegisterPage.test.tsx` | Validation, mismatch errors, auto-login |
| `GuestEntryPage.test.tsx` | DisplayName validation, navigate on success |
| `TicTacToeBoard.test.tsx` | 9 cells render, click calls `onPlay`, winning line highlighted |
| `CardGameTable.test.tsx` | Hand renders, suit-following, off-suit dimmed |
| `ChatPanel.test.tsx` | Message list, send, 300-char, throttle UX |
| `PlayerList.test.tsx` | Connected/disconnected dot, turn highlight |
| `ProtectedRoute.test.tsx` | Spinner during loading, redirect on no user |
| `AdminRoute.test.tsx` | Redirect for non-admin, allow for admin |
| `AuthContext.test.tsx` | Login persists token, logout clears |
| `LeaderboardPage.test.tsx` | Renders rows, filter, pagination |
| `useSocketEvent.test.ts` | Subscribes on mount, unsubscribes on unmount |

**Coverage target:** 70% lines, 80% branches on `components/`, `pages/auth/`, `context/`.

---

# PHASE 11 — DEVOPS & DEPLOY

---

## STEP 52 — README & Architecture Documentation

Top-level `README.md` with: title + tech badges, demo link, features, architecture diagram, roles & permissions table, API endpoints table, socket events table, folder structure, security section, getting started, environment variables, deployment summary, architecture sequence diagrams (Mermaid), troubleshooting, license.

---

## STEP 53 — CI/CD (GitHub Actions: typecheck + lint + test on PR)

**`.github/workflows/ci.yml`** — three parallel jobs:

| Job | Steps |
|---|---|
| `server-ci` | checkout -> setup-node -> `npm ci` -> typecheck -> lint -> test:run -> test:integration |
| `client-ci` | checkout -> setup-node -> `npm ci` -> typecheck -> lint -> test:run -> build |
| `shared-ci` | checkout -> setup-node -> `npm ci` -> typecheck |

**Service containers for `server-ci`:** `postgres:16-alpine` and `redis:7-alpine`.

**Branch protection on `main`:** require all three CI jobs to pass.

---

## STEP 54 — Code Cleanup & Pre-Deploy Review

- Run `npm run typecheck` in both `server/` and `client/` — must exit 0.
- Run `npm run build` in both — verify outputs.
- Remove every `console.log` that prints tokens/hashes/PII.
- Remove unused imports. Eliminate `any` and `@ts-ignore`.
- Sync `.env.example` files.
- Run `npm audit --omit=dev`.
- Re-run Step 27 audit checklist.
- Verify Drizzle schema matches latest migration.
- Verify no raw user input interpolated in SQL.
- Verify all CI jobs pass.
- Smoke-test: register, login, guest login, create room, join, play, disconnect, stats.

---

## STEP 55 — Deployment (Render + Vercel + Redis Cloud + Neon Postgres + optional Sentry)

**Neon Postgres:**
- Create project on [neon.tech](https://neon.tech) free tier.
- Copy the **pooled** connection string (transaction-mode pooler) -> `DATABASE_URL`.

**Migration on deploy:**
```
predeploy: npm --prefix server run db:migrate
```

**Redis Cloud:**
- Create free-tier 30 MB DB -> `REDIS_URL`.

**Render (backend):**
- Root directory: repo root.
- Build: `cd server && npm install && npm run build`.
- Start: `cd server && node dist/src/server.js`.
- Env vars: all `.env.example` keys + `NODE_ENV=production`, `CLIENT_ORIGIN=https://<vercel-domain>`.
- Health check path: `/api/health`.
- Run admin seed once via Render Shell.

**Vercel (frontend):**
- Root directory: `client/`.
- Framework: Vite (auto-detected).
- Env vars: `VITE_API_URL`, `VITE_SOCKET_URL`.
- SPA fallback + caching via `client/vercel.json`.

**Post-deploy verification:**

Functional:
- [ ] Register, login, logout work end-to-end.
- [ ] Guest entry works and guest cannot access `/profile` or `/admin`.
- [ ] Create room, join, play TicTacToe to win/draw, stats increment.
- [ ] Card Game starts at 4 players, hands hidden, suit-following enforced.
- [ ] Matchmaking pairs two users automatically.
- [ ] Spectator joins and sees public state only.
- [ ] Chat sends/receives in real time; 300-char limit; throttle works.
- [ ] Disconnect mid-game -> 30s grace -> forfeit if no reconnect.
- [ ] Leaderboard reflects new wins after a game.
- [ ] Admin panel: dashboard stats, user role change, last-admin protection, force-close room.

Security:
- [ ] CORS blocks requests from unknown origin.
- [ ] Rate limiter trips after exceeding auth limit.
- [ ] `helmet` headers present.
- [ ] Injection attempt sanitized.
- [ ] XSS attempt escaped.
- [ ] Role-escalation attempt silently dropped.
- [ ] WebSocket without token rejected.
- [ ] Invalid `gameType` returns `error_event` with no internal details.
- [ ] Production error responses contain no stack traces.
- [ ] `x-powered-by` header absent.
- [ ] `.env` not committed; `.env.example` has no real secrets.

Once all checks pass, fill in the `Demo link` placeholder in `README.md`.
