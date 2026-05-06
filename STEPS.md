# Multiplayer Game Backend — Step-by-Step Build Guide

> **Project Summary:**
> A real-time multiplayer game platform built on Node.js + Socket.io with Redis as the live game-state store and MongoDB as the persistent user/leaderboard store. Two roles (Player, Admin) and two participation modes (registered + guest) are supported. Players can create/join rooms with a UUID code, auto-match through a queue, spectate live games, chat in-room, request rematches, and track stats on a global leaderboard. The system ships with two games — TicTacToe (2 players) and a simple 4-player card game — implemented behind a GameFactory pattern so additional games can be plugged in without touching transport, room, or state code. All game logic runs server-side; the client is a thin renderer that forwards intents (e.g., "play cell index 4") and renders the authoritative state pushed back over Socket.io. Security layers include JWT-authenticated WebSocket handshakes, helmet, strict CORS, per-route rate limiting, mass-assignment protection, NoSQL-injection sanitization, RBAC guards, and admin self-protection.

> Each step below is a self-contained prompt. Execute them in order.
> Stack: **TypeScript 5** end-to-end, React 19 + Vite, Node 20 LTS, Express 5, Socket.io 4, MongoDB/Mongoose 9, Redis (ioredis), JWT, TailwindCSS v4, React Router v7, Axios, socket.io-client.
> Shared types live in a top-level `shared/` package consumed by both `server/` and `client/` so socket event payloads, game state shapes, JWT claims, and REST responses are statically guaranteed across the wire.

---

## Table of Contents

**Phase 1 — Backend Foundation**
- STEP 1 — Project Scaffolding & Dependency Setup
- STEP 2 — Environment Configuration, MongoDB & Redis Connection
- STEP 3 — User Model, Auth System & Admin Seed
- STEP 4 — Guest Authentication Flow

**Phase 2 — Backend Resources (REST API)**
- STEP 5 — User Profile API (Public & Own)
- STEP 6 — Avatar Upload (Multer + File Validation)
- STEP 7 — Preferences API (Theme, Privacy, Notifications)
- STEP 8 — Match History Model & Stats Tracking
- STEP 9 — Leaderboard API
- STEP 10 — Admin REST API (Dashboard, User Management, Active Rooms)

**Phase 3 — Socket.io Real-Time Foundation**
- STEP 11 — Socket.io Server Setup & JWT Auth Middleware
- STEP 12 — Redis Service Layer (Rooms, Queues, TTL)
- STEP 13 — Room Management Events (Create, Join, Leave)
- STEP 14 — Spectator Mode
- STEP 15 — Matchmaking Queue
- STEP 16 — In-Room Chat System

**Phase 4 — Game Logic (Server-Side)**
- STEP 17 — GameFactory Pattern & Base Game Class
- STEP 18 — TicTacToe — Move Validation & Turn Mechanics
- STEP 19 — TicTacToe — Win Detection & State Lifecycle
- STEP 20 — Card Game — Deck, Shuffle & Deal
- STEP 21 — Card Game — Play Card & Follow-Suit Enforcement
- STEP 22 — Card Game — Trick Resolution & Final Scoring
- STEP 23 — Game Lifecycle (Start, Turn, End, Rematch)
- STEP 24 — Disconnect Handling & Reconnection (Server-Side)

**Phase 5 — Backend Validation, Security & Logging**
- STEP 25 — REST Validators (express-validator chains)
- STEP 26 — Socket Event Validators (Type-Narrowing Helpers)
- STEP 27 — Comprehensive Security Audit Checklist
- STEP 28 — Logging & Observability (pino + structured logs)

**Phase 6 — Backend Testing**
- STEP 29 — Unit Tests (Game Logic, Utils, Validators)
- STEP 30 — Integration Tests (REST + Socket.io flows)

**Phase 7 — Client Foundation**
- STEP 31 — Client Setup: Vite, Tailwind, Axios, Socket.io-client
- STEP 32 — Reusable UI Kit (Button, Input, Modal, Spinner, Card, Badge)
- STEP 33 — Contexts: Auth, Socket, Preferences
- STEP 34 — Layouts, Navbar & Routing

**Phase 8 — Client Pages**
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

**Phase 9 — Client Polish**
- STEP 45 — Reconnection UX Flow (Banner, Retry, Rejoin Toast)
- STEP 46 — Animations & Game Feel (Transitions, Piece Drop, Card Flip, Win Highlight)
- STEP 47 — Sound Design (Preload, Volume, Mute, Contextual Triggers)
- STEP 48 — Accessibility (Keyboard Nav, ARIA, Focus Management, Screen Reader)
- STEP 49 — Performance (React.memo, Code Splitting, Lazy Routes, useCallback Strategy)
- STEP 50 — Responsive Design (Mobile Game Room, Touch Targets, Adaptive Board)

**Phase 10 — Client Testing**
- STEP 51 — Component Tests (React Testing Library: forms, board, chat)

**Phase 11 — DevOps & Deploy**
- STEP 52 — README & Architecture Documentation
- STEP 53 — CI/CD (GitHub Actions: typecheck + lint + test on PR)
- STEP 54 — Code Cleanup & Pre-Deploy Review
- STEP 55 — Production Deployment (Render + Netlify + Redis Cloud + MongoDB Atlas + optional Sentry)

---

# PHASE 1 — Backend Foundation

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
│   │   ├── db.ts                      # MongoDB connectDB
│   │   ├── redis.ts                   # ioredis singleton + duplicate() pub/sub
│   │   └── env.ts                     # Centralized env access + zod-style runtime validation
│   ├── middleware/
│   │   ├── authMiddleware.ts          # protect, optionalAuth, adminOnly, registeredOnly
│   │   ├── errorHandler.ts
│   │   ├── rateLimiters.ts            # global, auth, admin, upload
│   │   ├── sanitizeMiddleware.ts      # Express 5–safe mongo-sanitize
│   │   └── uploadMiddleware.ts        # multer config
│   ├── models/
│   │   ├── User.ts                    # IUser interface + Schema<IUser>
│   │   └── Match.ts                   # IMatch interface + Schema<IMatch>
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
│   │   └── GameFactory.ts             # generic registry (compile-time game-type → class map)
│   ├── services/
│   │   ├── roomService.ts             # Redis CRUD for rooms
│   │   ├── matchmakingService.ts
│   │   └── matchService.ts            # MongoDB match history writes
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
├── uploads/                           # local avatar storage (gitignored)
├── dist/                              # tsc output (gitignored)
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
│   ├── sounds/                  # turn.mp3, win.mp3, lose.mp3, click.mp3
│   └── _redirects               # SPA fallback for Netlify
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

**Server dependencies (production):** `express`, `socket.io`, `mongoose`, `ioredis`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`, `helmet`, `express-rate-limit`, `express-mongo-sanitize`, `express-validator`, `multer`, `uuid`.

**Server dependencies (dev):** `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/cors`, `@types/multer`, `@types/uuid`, `@types/express-mongo-sanitize`.

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
| `build` | `tsc -p tsconfig.json` | Compile TS → `dist/` |
| `start` | `node dist/src/server.js` | Production runtime (Render uses this) |
| `typecheck` | `tsc --noEmit` | Standalone type check |
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

## STEP 2 — Environment Configuration, MongoDB & Redis Connection

Build the environment access layer, connect MongoDB through Mongoose, connect Redis through ioredis, and wire all global Express middleware in the correct order.

**`config/env.ts`** — central env reader with runtime validation. Exports a typed `env` object so consumers get autocomplete and compile-time guarantees:

| Variable | Required | Default | Validation |
|---|---|---|---|
| `NODE_ENV` | yes | `development` | `development`/`production`/`test` |
| `PORT` | yes | `5000` | positive integer |
| `MONGO_URI` | yes | — | non-empty string |
| `REDIS_URL` | yes | — | non-empty string (e.g. `redis://default:pwd@host:port`) |
| `JWT_SECRET` | yes | — | min 32 chars in production |
| `JWT_EXPIRES_IN` | no | `7d` | string |
| `GUEST_JWT_EXPIRES_IN` | no | `2h` | string |
| `CLIENT_ORIGIN` | yes | — | URL (no wildcard in production) |
| `ROOM_TTL_SECONDS` | no | `7200` | integer (2h default) |
| `MATCHMAKING_TTL_SECONDS` | no | `300` | integer |
| `BCRYPT_SALT_ROUNDS` | no | `12` | integer ≥ 10 |
| `UPLOAD_MAX_BYTES` | no | `5242880` | integer (5 MB) |

On startup, if `NODE_ENV === 'production'` and `JWT_SECRET.length < 32`, throw and exit immediately.

**`config/db.ts`** — `connectDB(): Promise<void>`:
- `mongoose.set('strictQuery', true)`.
- `await mongoose.connect(env.MONGO_URI)` — no deprecated options.
- Log `MongoDB connected: <host>` on success; on error, log and `process.exit(1)`.

**`config/redis.ts`** — singleton ioredis client, typed:
- `new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3, enableReadyCheck: true })`.
- Listeners for `connect`, `ready`, `error`, `close`.
- Export `redis: Redis` (default client) and a `pub`/`sub` pair for future Socket.io adapter scaling (cloned with `.duplicate()`).

**`server.ts`** — bootstrap order (this exact order matters):

1. `import 'dotenv/config'`
2. Validate env (`config/env.js` import auto-validates).
3. `app.disable('x-powered-by')`.
4. `app.use(helmet())`.
5. `app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE'] }))`.
6. `app.use(express.json({ limit: '10kb' }))`.
7. `app.use(express.urlencoded({ extended: true, limit: '10kb' }))`.
8. `app.use(sanitizeMiddleware)` — custom Express 5–safe mongo-sanitize (see snippet).
9. `app.use('/api', globalLimiter)`.
10. `GET /api/health` → `{ status: 'ok', uptime, db: <state>, redis: <state> }`.
11. Mount routers (`/api/auth`, `/api/users`, `/api/matches`, `/api/leaderboard`, `/api/admin`).
12. `app.use(errorHandler)` last.
13. Create HTTP server with `http.createServer(app)`, attach `socket.io` (Step 11), `await connectDB()`, then `httpServer.listen(env.PORT)`.

**Express 5–safe mongo-sanitize middleware (`middleware/sanitizeMiddleware.ts`):**

```ts
import type { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
};
```

**`middleware/rateLimiters.ts`** — separate instances:

| Limiter | windowMs | max | Used on |
|---|---|---|---|
| `globalLimiter` | 15 min | 300 | `/api/*` |
| `authLimiter` | 15 min | 10 | `/api/auth/login`, `/api/auth/register`, `/api/auth/guest` |
| `adminLimiter` | 5 min | 60 | `/api/admin/*` |
| `uploadLimiter` | 10 min | 20 | `/api/users/me/avatar` |

**`.env.example`** must list every key from the table above with safe placeholders (e.g. `MONGO_URI=mongodb://localhost:27017/multiplayer_game`, `JWT_SECRET=replace_with_a_secret_of_at_least_32_chars`).

**SECURITY:**
- `helmet`, `cors` strict origin, `x-powered-by` disabled, body size capped at 10 KB.
- `mongoSanitize.sanitize()` applied to `req.body` and `req.params` only — `req.query` is read-only in Express 5; `app.use(mongoSanitize())` would crash the server.
- `hpp` is **not** installed (incompatible with Express 5).
- `JWT_SECRET` length check enforced in production.
- Rate limiters scoped per route group; auth limiter is tightest.
- Health check leaks no internal info beyond connection state booleans.

---

## STEP 3 — User Model, Auth System & Admin Seed

Implement the registered-user authentication path. (Guest path is added in Step 4.)

**`models/User.ts`** — declare `IUser` interface first, then `Schema<IUser>`. The interface is also exported via `shared/types/user.ts` (without Mongoose-specific fields) so the client can reuse it. Fields:

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `username` | String | yes | — | unique, lowercase, trim, 3–20 chars, regex `^[a-z0-9_]+$` |
| `email` | String | yes | — | unique, lowercase, trim, valid email |
| `password` | String | yes | — | min 8 chars, `select: false` |
| `displayName` | String | yes | — | 2–30 chars, trim |
| `avatarUrl` | String | no | `''` | |
| `role` | String | yes | `player` | enum: `player`, `admin` |
| `isGuest` | Boolean | yes | `false` | always `false` for this model path |
| `bio` | String | no | `''` | max 200 chars |
| `stats` | Subdoc | yes | `{ wins:0, losses:0, draws:0, gamesPlayed:0 }` | per-game and total |
| `statsByGame` | Map<String, Subdoc> | no | `{}` | key = `tictactoe`/`cardgame`, value = `{wins, losses, draws, gamesPlayed}` |
| `preferences` | Subdoc | yes | defaults below | |
| `lastLoginAt` | Date | no | — | |
| `createdAt`/`updatedAt` | timestamps | — | — | |

**`preferences` subdocument:**

| Field | Type | Default | Enum / Range |
|---|---|---|---|
| `theme` | String | `system` | `light`/`dark`/`system` |
| `fontSize` | String | `medium` | `small`/`medium`/`large` |
| `animations` | Boolean | `true` | — |
| `sounds` | Boolean | `true` | — |
| `language` | String | `en` | `en` |
| `notifications.matchInvite` | Boolean | `true` | — |
| `notifications.rematch` | Boolean | `true` | — |
| `privacy.showStats` | Boolean | `true` | — |
| `privacy.showOnLeaderboard` | Boolean | `true` | — |

**Indexes:** `{ username: 1 }` unique, `{ email: 1 }` unique, `{ 'stats.wins': -1 }` for leaderboard.

**Pre-save hash hook (Mongoose 9 + TypeScript syntax — no `next` parameter):**

```ts
userSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});
```

**Instance method (declared on `IUser`):** `comparePassword(plain: string): Promise<boolean>` → `bcrypt.compare(plain, this.password)`.

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
| `register` | POST `/api/auth/register` | Destructure `{ username, email, password, displayName }` only — never `req.body` directly. Reject if username/email exists with generic message. Hash via pre-save hook. Return `{ user, token }` (no password). |
| `login` | POST `/api/auth/login` | `{ email, password }`. Always return identical error `Invalid email or password` for missing user OR wrong password. Update `lastLoginAt`. Return `{ user, token }`. |
| `getMe` | GET `/api/auth/me` | Requires `protect`. Return `req.user`. |
| `updateProfile` | PUT `/api/auth/me` | Whitelist `{ displayName, bio, avatarUrl }` only. Never accept `role`, `email`, `password`, `stats`, `isGuest`. |
| `changePassword` | PUT `/api/auth/me/password` | `{ currentPassword, newPassword }`. Verify current, then assign new. |
| `deleteAccount` | DELETE `/api/auth/me` | `{ password }` confirmation. Cascade-delete or anonymize user's matches. |

**`controllers/authController.ts` — register mass-assignment guard (critical):**

```ts
const { username, email, password, displayName } = req.body as Pick<IUser, 'username' | 'email' | 'password' | 'displayName'>;
const user = await User.create({ username, email, password, displayName });
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

**`middleware/errorHandler.ts`** — production-safe global handler typed as `ErrorRequestHandler`. Always log internally. Response shape: `ApiResponse<never>` with `{ success: false, message, errors? }`. In production, never include `err.stack` or Mongoose internal field paths.

**`seed/seedAdmin.ts`** — connects DB, upserts admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_USERNAME` env vars (added to `.env.example`), exits.

**SECURITY:**
- Mass assignment blocked: `register` and `updateProfile` destructure exact whitelists; `role` cannot be set via any public endpoint.
- User enumeration prevented: identical error message for both wrong email and wrong password.
- Password hashed with bcrypt (rounds 12), `select: false`, never returned in responses, change requires current password, deletion requires password confirmation.
- JWT signed with secret length-validated at startup; tokens accepted only from `Authorization` header.
- `protect` rejects expired/invalid tokens with generic `Not authenticated`.
- `registeredOnly` ensures account-management routes are never reachable by guests.
- Admin seed credentials only read from env (never hard-coded).

---

## STEP 4 — Guest Authentication Flow

Guests can join games without registering. They get a short-lived JWT bound to a random in-memory identity stored only inside the token; no MongoDB user document is created.

**`controllers/authController.ts`** add:

| Function | Method/Path | Body / Behavior |
|---|---|---|
| `loginAsGuest` | POST `/api/auth/guest` | `{ displayName }`. Validate displayName (3–20 chars, trim, escape). Generate UUID v4 as guest id. Sign JWT payload `{ id: guestId, role: 'player', isGuest: true, displayName }` with `GUEST_JWT_EXPIRES_IN`. Return `{ user: { _id: guestId, displayName, isGuest: true, role: 'player' }, token }`. |

**`middleware/authMiddleware.ts` — `protect` upgrade** (TypeScript discriminated-union narrowing handles guest/registered safely):
- If decoded payload has `isGuest === true`, do **not** query MongoDB. Build `req.user` from token claims directly.
- If `isGuest === false`, fetch from MongoDB; reject if not found.

**Routes:**

| Method | Path | Middleware |
|---|---|---|
| POST | `/api/auth/guest` | `authLimiter`, `guestLoginValidator`, `validate` |

**Behavioral rules:**
- Guests can: create rooms, join rooms, play games, chat, spectate, queue for matchmaking.
- Guests **cannot**: appear on the leaderboard, write match history rows linked to their id (matches still record `displayName` snapshot but not `userId` for guests), update profile/preferences (no DB row), access `/api/users/me`, access any `/api/admin/*` endpoint.
- Match history writer (Step 8) checks `isGuest` on each player; if true, stores `{ userId: null, displayName, isGuest: true }`.

**SECURITY:**
- Guest tokens TTL ≤ 2 hours — abandoned guests cannot linger forever.
- `guestLoginValidator` escapes `displayName` to prevent XSS through chat or scoreboards.
- `registeredOnly` middleware on profile/admin routes blocks any guest privilege escalation attempts via crafted tokens.
- Guest `id` is a fresh UUID per session — no replay across guest sessions.
- Rate limit on `/api/auth/guest` prevents guest-token spam.

---

# PHASE 2 — Backend Resources (REST API)

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
  stats?: UserStats;            // omitted when privacy.showStats === false
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

**Implementation pattern (`updateMyPreferences`):**

```ts
const ALLOWED_KEYS: Array<keyof UserPreferences> = [
  'theme', 'fontSize', 'animations', 'sounds', 'soundVolume', 'language',
];

const updates: Record<string, unknown> = {};
for (const [key, value] of Object.entries(req.body)) {
  if (key === 'notifications' || key === 'privacy') {
    // Nested object: validate each leaf
    if (typeof value !== 'object' || value === null) continue;
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      updates[`preferences.${key}.${nestedKey}`] = nestedValue;
    }
  } else if (ALLOWED_KEYS.includes(key as keyof UserPreferences)) {
    updates[`preferences.${key}`] = value;
  }
  // Unknown keys silently ignored (already filtered by validator before reaching here)
}
const user = await User.findByIdAndUpdate(req.user!._id, { $set: updates }, { new: true, runValidators: true });
res.json({ success: true, data: user!.preferences });
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
- Two layers of whitelisting: the express-validator chain rejects unknown/invalid keys, then the controller only writes known keys to MongoDB.
- `runValidators: true` on `findByIdAndUpdate` so Mongoose schema enums (e.g., theme `light/dark/system`) re-validate.
- Privacy preference changes (`showStats`, `showOnLeaderboard`) take effect immediately on the next public profile / leaderboard query — no caching layer to invalidate.
- Notifications preferences are **only** consumed client-side for now (toast suppression); server doesn't push notification emails.

---

## STEP 8 — Match History Model & Stats Tracking

Persist completed games to MongoDB and increment per-user stats atomically.

**`models/Match.ts`** — declare `IMatch` interface (also exported via `shared/types/match.ts` minus Mongoose internals). Fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `gameType` | String | yes | enum: `tictactoe`, `cardgame` |
| `roomCode` | String | yes | UUID-derived short code |
| `players` | Array<Subdoc> | yes | each `{ userId: ObjectId | null, displayName, isGuest, position }` |
| `winnerUserId` | ObjectId | no | null on draw or all-guest game without winning registered user |
| `winnerDisplayName` | String | no | snapshot for leaderboard / history rendering |
| `result` | String | yes | enum: `win`, `draw`, `aborted` |
| `durationMs` | Number | yes | computed in service |
| `moves` | Array | no | game-specific move log (TicTacToe: indexes; CardGame: action log) |
| `createdAt` | Date | timestamp | indexed `-1` |

**Indexes:** `{ 'players.userId': 1, createdAt: -1 }`, `{ winnerUserId: 1, createdAt: -1 }`.

**`services/matchService.ts`:**

| Function | Behavior |
|---|---|
| `recordMatch({ gameType, roomCode, players, winnerUserId, winnerDisplayName, result, durationMs, moves })` | Insert `Match`. For each registered (non-guest) player, atomically update their stats: `{ $inc: { 'stats.gamesPlayed': 1, 'stats.<wins|losses|draws>': 1, 'statsByGame.<game>.gamesPlayed': 1, 'statsByGame.<game>.<wins|losses|draws>': 1 } }`. Use a single `bulkWrite` for the user updates. |
| `abortMatch({ roomCode, gameType, players, reason })` | Insert match with `result: 'aborted'`. No stat increments. |

**`controllers/matchController.ts`:**

| Function | Method/Path | Behavior |
|---|---|---|
| `getMatchById` | GET `/api/matches/:id` | `optionalAuth`. Public read. Returns full match with player display names. |
| `getRecentMatches` | GET `/api/matches` | Public. Pagination, optional `gameType` filter, sort by `createdAt: -1`. |

**Routes (`routes/matchRoutes.ts`):**

| Method | Path | Middleware |
|---|---|---|
| GET | `/` | `optionalAuth`, `paginationValidator`, `gameTypeFilterValidator`, `validate` |
| GET | `/:id` | `optionalAuth`, `mongoIdParamValidator`, `validate` |

**SECURITY:**
- Match write is server-only (called from socket handlers, never via REST).
- `players[].userId` is `null` for guests — no fake user-id injection possible.
- `getMatchById`/`getRecentMatches` are read-only public endpoints; no internal fields leaked.
- Stat increments use atomic `$inc` to prevent race conditions when two games finish simultaneously for the same user.

---

## STEP 9 — Leaderboard API

Compute the leaderboard from `User.stats` with a configurable game filter.

**`controllers/leaderboardController.ts`:**

| Function | Method/Path | Behavior |
|---|---|---|
| `getLeaderboard` | GET `/api/leaderboard` | Query params: `gameType` (optional, enum), `page` (default 1), `limit` (default 25, max 100). Filter `{ isGuest: false, 'preferences.privacy.showOnLeaderboard': true }`. If `gameType` provided, sort by `statsByGame.<game>.wins: -1`; else by `stats.wins: -1`. Project public fields only: `{ username, displayName, avatarUrl, stats, statsByGame.<game> }`. |

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

# PHASE 3 — Socket.io Real-Time Foundation

## STEP 11 — Socket.io Server Setup & JWT Auth Middleware

Attach Socket.io to the HTTP server, gate every handshake with a JWT check, and route incoming events to per-feature handler files. **TypeScript win:** Socket.io 4 supports four generic params on `Server` — `<ListenEvents, EmitEvents, ServerSideEvents, SocketData>`. We use `ClientToServerEvents`, `ServerToClientEvents`, and `SocketData` (where `user: AuthUser` lives) — every `socket.on`, `socket.emit`, `io.to(...).emit` is then **fully typed**.

**`shared/types/events.ts`** — single source of truth for both sides:

```ts
import type { GameType, Card, GameState } from './games';
import type { Room, RoomPlayer } from './room';
import type { AuthUser } from './auth';

export type GameAction =
  | { action: 'play'; payload: { index: number } }              // TicTacToe
  | { action: 'play_card'; payload: { card: Card } };           // CardGame

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
- For registered tokens, fetch user from MongoDB by `_id`; if missing, reject.
- Set `socket.data.user = { _id, displayName, role, isGuest, avatarUrl }` and `socket.join(\`user:${_id}\`)`.
- On error: `next(new Error('UNAUTHORIZED'))`.

`io.use(authSocket)` registered before any `io.on('connection')`.

**`socket/index.ts`** — `registerSocketHandlers(io: TypedServer): void`:
- Apply `io.use(authSocket)`.
- Define `type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>` and `type TypedSocket = Socket<...>` for all handler signatures.
- On `connection`, register handlers from `roomHandlers`, `matchmakingHandlers`, `chatHandlers`, `gameHandlers`, `disconnectHandlers`. Each handler module exports `register(io: TypedServer, socket: TypedSocket): void`.
- On every event handler, wrap in try/catch; emit `error_event { code, message }` to `socket` on failure (never expose stack traces).

**Event reference table** (exact names — all type-checked against `events.ts`):

| Direction | Event | Payload |
|---|---|---|
| C→S | `room:create` | `{ gameType, isPrivate }` |
| C→S | `room:join` | `{ roomCode, asSpectator }` |
| C→S | `room:leave` | `{}` |
| C→S | `matchmaking:join` | `{ gameType }` |
| C→S | `matchmaking:cancel` | `{}` |
| C→S | `game:action` | `{ action, payload }` (game-specific intent only) |
| C→S | `game:rematch_request` | `{}` |
| C→S | `chat:send` | `{ message }` |
| S→C | `room:state` | full sanitized room snapshot |
| S→C | `room:player_joined` | `{ player }` |
| S→C | `room:player_left` | `{ playerId, reason }` |
| S→C | `room:closed` | `{ reason }` |
| S→C | `game:state` | sanitized game state |
| S→C | `game:turn` | `{ currentPlayerId }` |
| S→C | `game:end` | `{ result, winnerId, winnerDisplayName, matchId }` |
| S→C | `chat:message` | `{ from, displayName, message, timestamp }` |
| S→C | `error_event` | `{ code, message }` |

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

**`utils/generateRoomCode.ts`:** `generateRoomCode(): string` → first 8 hex chars from `uuidv4().replace(/-/g, '')`.

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
| `room:create` | Validate `{ gameType ∈ {tictactoe, cardgame}, isPrivate: boolean }`. Refuse if user already in a live room (`user:room:<id>` exists). Determine `maxPlayers` from `GameFactory.getConfig(gameType).maxPlayers`. Call `roomService.createRoom`. `socket.join(\`room:${roomCode}\`)`. Emit `room:state` to socket. |
| `room:join` | Validate `{ roomCode, asSpectator? }`. Fetch room; emit `error_event ROOM_NOT_FOUND` if null. If `asSpectator`, call `addSpectator`; else `addPlayer`. `socket.join(\`room:${roomCode}\`)`. Broadcast `room:player_joined` to others, emit fresh `room:state` to all in the room. If now full and `status === 'waiting'`, transition to `starting` and call `gameHandlers.startGame(roomCode)`. |
| `room:leave` | Resolve room from `socket.user._id`. Call `removePlayer` or `removeSpectator`. Emit `room:player_left` to remaining members. If game was in progress, call `gameHandlers.handleAbortOnLeave(roomCode, userId)` (forfeit logic). If room emptied → `deleteRoom`. |

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
- `game:action` from a spectator → `error_event { code: 'NOT_A_PLAYER' }`.
- `game:rematch_request` from a spectator → ignored.
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
| `tryMatch(gameType)` | While queue length ≥ `GameFactory.getConfig(gameType).maxPlayers`: `LPOP` that many entries, double-check each user is still online (via `mm:lock` existence + connected-socket index), create a new public room via `roomService.createRoom`, `addPlayer` for each, emit `matchmaking:matched { roomCode }` to each socket. |
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
| `chat:send` | Validate `{ message }` (1–300 chars after trim, escape HTML). Verify socket is in a room (player **or** spectator). Build `{ from: userId, displayName: socket.user.displayName, message, timestamp }`. `roomService.appendChat`. Broadcast `chat:message` to `room:<roomCode>`. |

**Per-socket throttle:** in-memory `Map<string, number>` (userId → lastMsgAt). Reject if `< 500ms` since last message; emit `error_event { code: 'CHAT_THROTTLED' }`.

**SECURITY:**
- Message length validated and `escape()` applied — no stored XSS in chat history.
- Server stamps `from` and `timestamp` — clients cannot spoof identity or backdate messages.
- 500 ms per-user throttle prevents spam without needing a heavy rate-limiter library on the socket layer.
- Chat history capped at 50 — bounded memory.

---

# PHASE 4 — Game Logic (Server-Side)

## STEP 17 — GameFactory Pattern & Base Game Class

Encapsulate game rules behind a uniform interface so transport code (handlers, services) stays game-agnostic. **TypeScript win:** `BaseGame` is generic over its own state type, and `GameFactory.create<T>` returns the concrete instance type — so `gameHandlers.ts` knows exactly which state shape it's dealing with at compile time.

**`shared/types/games.ts`:**

```ts
export type GameType = 'tictactoe' | 'cardgame';

export type Cell = null | 'X' | 'O';
export type TicTacToeBoard = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export type Suit = '♠' | '♥' | '♦' | '♣';
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
  myHand?: Card[];                  // present only for the recipient
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
  abstract serialize(): unknown;       // For Redis persistence
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
- Assign symbols: `players[0]` → `X`, `players[1]` → `O`.
- `currentTurnIndex = 0` (X plays first).

**`applyAction(userId, action, payload): ActionResult`** — this step focuses on move validation only:
- Reject if `this.result !== null` → throw `GAME_OVER`.
- Reject if `action !== 'play'` → throw `UNKNOWN_ACTION`.
- Validate payload shape: `typeof payload === 'object' && payload !== null && typeof (payload as any).index === 'number'`. Else throw `INVALID_PAYLOAD`.
- Reject if `userId !== this.players[this.currentTurnIndex].userId` → throw `NOT_YOUR_TURN`.
- Let `index = (payload as { index: number }).index`. Reject if not integer in `0..8` → `INVALID_MOVE`.
- Reject if `this.board[index] !== null` (cell occupied) → `INVALID_MOVE`.
- **Apply:** `this.board[index] = this.players[this.currentTurnIndex].symbol`.
- Append to `this.moves`: `{ userId, index, symbol, t: Date.now() }`.
- Win/draw detection happens in Step 19 (`#checkOutcome` private method).
- If no outcome yet, flip turn: `this.currentTurnIndex = this.currentTurnIndex === 0 ? 1 : 0`.
- Return `{ stateChanged: true, gameOver: this.result !== null, result: this.result ?? undefined, winnerId: this.winner ?? undefined }`.

**Helpers:**
- `getCurrentPlayerId(): string` → `this.players[this.currentTurnIndex].userId`.

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
  [0,1,2], [3,4,5], [6,7,8],   // rows
  [0,3,6], [1,4,7], [2,5,8],   // cols
  [0,4,8], [2,4,6],            // diagonals
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
- `serialize(): unknown` → `{ board, players: players.map(p => ({...})), currentTurnIndex, winner, result, winningLine, moves }`.
- `static deserialize(raw: unknown): TicTacToe` → reconstruct by validating shape, then assigning fields directly.

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
- Player with the most tricks wins. Tie → draw.

**`utils/shuffle.ts`** — Fisher–Yates seeded by `crypto.randomBytes` (cryptographically unpredictable):

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

const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];
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
- Sort each player's hand for stable display: by suit (`♠♥♦♣` order), then rank ascending.
- Determine starting lead: player who has `2 of ♣` plays first (classic rule). Set `currentTurnIndex` accordingly.
- Initialize: `currentTrick = []`, `leadSuit = null`, `tricksWon = { [userId]: 0 } × 4`, `trickNumber = 0`, `moves = []`.

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
- Reject if `this.result !== null` → throw `GAME_OVER`.
- Reject if `action !== 'play_card'` → throw `UNKNOWN_ACTION`.
- Validate payload shape: must be `{ card: { suit: Suit; rank: Rank } }`. Throw `INVALID_PAYLOAD` otherwise.
- Reject if `userId !== this.players[this.currentTurnIndex].userId` → throw `NOT_YOUR_TURN`.
- Find the player: `const player = this.players[this.currentTurnIndex]`.
- Verify card is in `player.hand`: search by exact `suit + rank` match. Throw `INVALID_CARD` if missing.
- **Follow-suit enforcement:** if `this.currentTrick.length > 0` and `this.leadSuit !== null`:
  - Compute `hasLeadSuit = player.hand.some(c => c.suit === this.leadSuit)`.
  - If `hasLeadSuit && card.suit !== this.leadSuit` → throw `MUST_FOLLOW_SUIT`.
- **Apply move:**
  - Remove card from `player.hand` (in place).
  - Push `{ userId, card }` to `this.currentTrick`.
  - If `this.currentTrick.length === 1`, set `this.leadSuit = card.suit` (this player led).
  - Append to `this.moves`: `{ userId, card, trickNumber: this.trickNumber, t: Date.now() }`.
- **Trick complete?** If `this.currentTrick.length === 4`, hand off to `#resolveTrick()` (Step 22). Otherwise, advance turn: `this.currentTurnIndex = ((this.currentTurnIndex + 1) % 4) as 0|1|2|3`.
- Return `{ stateChanged: true, gameOver: this.result !== null }`.

**`getCurrentPlayerId(): string`** → `this.players[this.currentTurnIndex].userId`.

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
  // Update score
  this.tricksWon[winningEntry.userId] = (this.tricksWon[winningEntry.userId] ?? 0) + 1;
  // Winner leads next trick
  this.currentTurnIndex = this.players.findIndex((p) => p.userId === winningEntry.userId) as 0|1|2|3;
  // Reset trick state
  this.currentTrick = [];
  this.leadSuit = null;
  this.trickNumber += 1;
  // Game over after 13 tricks?
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
- `serialize()` → `{ players, currentTrick, leadSuit, currentTurnIndex, tricksWon, trickNumber, result, winner, moves }`.
- `static deserialize(raw)` → validate top-level shape, reconstruct hands as `Card[]`, restore counts/state.
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
- Aborted games still record a row in MongoDB (for admin auditing) but do **not** increment stats.

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

# PHASE 5 — Backend Validation, Security & Logging

## STEP 25 — REST Validators (express-validator chains)

Wire `express-validator` rules to every REST endpoint. Each validator file exports `ValidationChain[]` arrays plus a centralized `validate` middleware that returns `ApiResponse<never>` `{ success: false, errors: [...] }` on failure.

**`validators/*.ts` files:**

| File | Validators |
|---|---|
| `authValidators.ts` | `registerValidator` (username regex `^[a-z0-9_]+$` 3–20, email `isEmail` + `normalizeEmail`, password min 8 + complexity, displayName 2–30 trim+escape), `loginValidator`, `guestLoginValidator` (displayName 3–20 + escape), `changePasswordValidator`, `deleteAccountValidator` |
| `userValidators.ts` | `updateProfileValidator` (displayName, bio escape ≤200, avatarUrl URL), `preferencesValidator` (each key checked against enum/boolean — see below), `usernameParamValidator`, `paginationValidator` |
| `matchValidators.ts` | `mongoIdParamValidator` (`isMongoId()`), `gameTypeFilterValidator` (`isIn(['tictactoe','cardgame'])`) |
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
- All MongoID params validated via `isMongoId()` — invalid ids fail at validator layer, never reach Mongoose.
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
| `validateRoomCreatePayload` | `gameType ∈ ['tictactoe','cardgame']`, `isPrivate: boolean` |
| `validateRoomJoinPayload` | `roomCode` matches `/^[a-f0-9]{8}$/`, `asSpectator` boolean optional |
| `validateChatPayload` | `message` string, length 1–300 after trim, escape HTML chars (use a tiny `escapeHtml` util — no external lib needed) |
| `validateGameActionPayload` | `action` non-empty string, `payload` object — per-game shape checked inside the game class's `applyAction` |
| `validateMatchmakingJoin` | `gameType ∈ allowed list` |

**Handler usage pattern:**

```ts
socket.on('room:create', (raw: unknown) => {
  const v = validateRoomCreatePayload(raw);
  if (!v.ok) return socket.emit('error_event', { code: v.code, message: v.message });
  // From here, v.value is fully typed.
  void roomService.createRoom({ host: socket.data.user, ...v.value });
});
```

**`utils/escapeHtml.ts`** — minimal HTML entity escaper (no `escape-html` dep needed):

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

- [ ] Mass assignment: every controller (auth `register`, `updateProfile`, admin `updateUserRole`) destructures only allowed fields; no `req.body` spread into models.
- [ ] Role protection: `role` is **not** settable via `register`, `updateProfile`, or any non-admin endpoint. Only `adminController.updateUserRole` can change it.
- [ ] User enumeration: identical error message ("Invalid email or password") for wrong email vs. wrong password.
- [ ] Password security: hashed with bcrypt (rounds 12), `select: false`, never returned in any response, change requires current password, deletion requires password confirmation.
- [ ] JWT: secret length ≥ 32 chars enforced at startup in production. Tokens accepted only from `Authorization: Bearer` header (REST) or `socket.handshake.auth.token` (sockets). Guest tokens TTL ≤ 2 hours.
- [ ] Rate limiters: separate instances for global, auth, admin, upload — wired in Step 2.
- [ ] Helmet: enabled with default safe headers.
- [ ] CORS: strict specific origin from `CLIENT_ORIGIN`; never `*` in production. Same origin enforced for Socket.io.
- [ ] Body size limits: `express.json({ limit: '10kb' })` and `express.urlencoded({ limit: '10kb' })`. Socket.io `maxHttpBufferSize: 1e5`.
- [ ] mongo-sanitize: applied via custom middleware on `req.body` and `req.params` only (Express 5 compliant). `app.use(mongoSanitize())` is **not** used.
- [ ] Express 5 compatibility: no code assigns to `req.query`. `hpp` is **not** installed.
- [ ] XSS: `escape()` applied via express-validator on all user text (displayName, bio, chat, search queries).
- [ ] ReDoS: `escapeRegex` used on every regex-based user search (admin search, public profile lookup).
- [ ] Ownership checks: `room:leave`, `game:action`, `game:rematch_request` verify `socket.user._id` is a current player.
- [ ] Spectator restrictions: spectators rejected on `game:action`/`game:rematch_request`; their `getStateFor(null)` view hides hidden info (card hands).
- [ ] Admin self-protection: cannot delete self, cannot change own role, last-admin guarded.
- [ ] Pagination clamp: `limit ≤ 100` (leaderboard), `≤ 50` (matches/users); page coerced to positive integer.
- [ ] File upload: MIME whitelist (`image/jpeg`, `image/png`, `image/webp`), 5 MB cap, server-generated filenames.
- [ ] Cascade rules: deleting a user nulls `Match.players.userId` but preserves displayName.
- [ ] Error handler: never exposes stack traces or internal paths in production.
- [ ] Privacy: `preferences.privacy.showStats` and `showOnLeaderboard` enforced server-side.
- [ ] x-powered-by disabled.
- [ ] `.env.example` synced with all required keys; no real secrets.
- [ ] No `console.log` of tokens, hashes, or PII in production code.
- [ ] Token storage: client uses `localStorage` only; never written to non-secure cookies.
- [ ] Mongoose 9: every `pre`/`post` hook uses `async function()` without `next` parameter — no `next()` calls anywhere.
- [ ] TypeScript strict: `tsconfig.base.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No `any` anywhere except in third-party type shims.
- [ ] Shared types: every wire-crossing payload (Socket.io events, REST responses, JWT claims) sourced from `shared/types/*.ts` — no duplicate type definitions on client and server.
- [ ] Socket.io typed: `Server<ClientToServerEvents, ServerToClientEvents, ..., SocketData>` used on both server and client; payload typos caught at compile time.
- [ ] Socket.io: every `io.on('connection')` is gated by `authSocket`; no unauthenticated connections allowed.
- [ ] Game logic: all rules (turn, validity, winner detection, hand visibility) computed server-side; client `payload` shape validated before reaching the game class.
- [ ] Room TTL: every `room:*` and `user:room:*` key created with `EX <ROOM_TTL_SECONDS>`; abandoned rooms self-clean.
- [ ] Chat throttle: 500 ms per-user; chat history bounded at 50 messages.

---

## STEP 28 — Logging & Observability (pino + structured logs)

Replace ad-hoc `console.log` with a structured logger so production logs are queryable, redact secrets, and integrate cleanly with Render/Sentry.

**Why pino:** fastest Node logger, JSON output by default, native child-logger pattern, redaction support, near-zero overhead in production.

**Install:** `pino` (prod), `pino-pretty` (dev).

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
| HTTP request log | `pino-http` middleware mounted just after helmet/cors. Auto-logs method, url, status, responseTime, requestId. |
| Socket events | `socket.data.logger = childLogger({ socketId: socket.id, userId: socket.data.user._id })` in `authSocket.ts`. Each handler uses `socket.data.logger.info({ event: 'room:create', payload }, 'Creating room')`. |
| Errors | `errorHandler.ts` calls `logger.error({ err, req }, 'Unhandled error')` then sends sanitized response. |
| Game lifecycle | `logger.info({ roomCode, gameType, players: players.length }, 'Game started')`. |
| Match record | `logger.info({ matchId, result, durationMs }, 'Match recorded')`. |
| Disconnects | `logger.warn({ userId, roomCode, reason }, 'Disconnect')`. |

**Env additions:**

| Variable | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | `trace`/`debug`/`info`/`warn`/`error`/`fatal` |

**Render log management:**
- Render captures stdout/stderr; pino's JSON output is automatically structured.
- Optional: forward to Logtail/Better Stack via `pino-logtail` for searchable log retention beyond Render's free-tier window.

**Optional Sentry integration** (mentioned in Step 55):
- `@sentry/node` SDK initialized in `server.ts` before any other middleware.
- `app.use(Sentry.Handlers.requestHandler())` first, `app.use(Sentry.Handlers.errorHandler())` before `errorHandler`.
- DSN from `SENTRY_DSN` env var (optional — if unset, Sentry is no-op).

**Audit hardening:** the `redact.paths` config above is critical — without it, a logged request containing a password field would land in production logs. Verify `password`, `token`, and `authorization` never appear in logs.

**SECURITY:**
- Redaction is enforced at the logger level — even if a developer accidentally logs `req.body`, passwords are stripped before serialization.
- No PII (email, IP) in info-level logs by default; only in debug.
- Stack traces logged server-side only; never sent to client (Step 27 audit item).
- Sentry DSN is read from env, never hardcoded.

---

# PHASE 6 — Backend Testing

## STEP 29 — Unit Tests (Game Logic, Utils, Validators)

Lock down the most-changed and highest-leverage logic with fast unit tests. **No I/O** — pure function tests run in milliseconds.

**Tooling:** `vitest` (faster than Jest, ESM-native, TS out-of-the-box).

**Install (server dev deps):** `vitest`, `@vitest/coverage-v8`.

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
| `games/__tests__/TicTacToe.test.ts` | Move validation (occupied cell, off-turn, out of range), all 8 winning lines, draw detection, `getStateFor` returns identical shape for spectator and players (no hidden info) |
| `games/__tests__/CardGame.test.ts` | Deal: each player gets 13 unique cards, deck has no duplicates after deal. Play: must-follow-suit enforcement, off-suit allowed when player has no lead suit, trick winner is highest of lead suit. End: 13 tricks → score → winner. `getStateFor(userId)` hides other hands. |
| `games/__tests__/GameFactory.test.ts` | `create('tictactoe', ...)` returns `TicTacToe`, `create('cardgame', ...)` returns `CardGame`, unknown type throws. `getConfig` correct per game. |
| `utils/__tests__/escapeRegex.test.ts` | All regex special chars escaped, normal strings untouched |
| `utils/__tests__/escapeHtml.test.ts` | All HTML entities replaced |
| `utils/__tests__/shuffle.test.ts` | Returned array same length and elements as input, order varies across calls (statistical) |
| `utils/__tests__/generateRoomCode.test.ts` | Returns 8-hex-char string, no collisions across 10k iterations |
| `validators/__tests__/socketValidators.test.ts` | Each validator: valid input returns `ok: true`, invalid returns `ok: false` with expected code |
| `services/__tests__/roomService.test.ts` | Mock ioredis with `ioredis-mock`. Test `createRoom`/`addPlayer` capacity, `removePlayer` host transfer, `deleteRoom` cleanup |

**Test fixtures (`src/__fixtures__/`):**

```
__fixtures__/
├── players.ts       # Mock RoomPlayer arrays for 2P and 4P games
├── tokens.ts        # Pre-signed JWT tokens for valid/expired/guest cases
└── matches.ts       # Sample MatchRecord shapes
```

**Coverage gate:** ≥ 85% on `games/`, `utils/`, `validators/`. Lower thresholds OK on `controllers/`/`services/` (covered by integration tests).

**npm scripts (`server/package.json`):**

| Script | Command |
|---|---|
| `test` | `vitest` |
| `test:run` | `vitest run` |
| `test:coverage` | `vitest run --coverage` |
| `test:watch` | `vitest --watch` |

**SECURITY:**
- Tests use deterministic seeds for shuffles (override `crypto.randomBytes` with a fixed buffer in test setup) so card-game test outcomes are reproducible.
- Tests **never** import production secrets; JWT fixtures are signed with a test-only secret declared in `vitest.setup.ts`.
- No real Redis or Mongo connection in unit tests — only in-memory mocks.

---

## STEP 30 — Integration Tests (REST + Socket.io flows)

End-to-end tests that exercise the real Express app and a real Socket.io server, against ephemeral test instances of MongoDB and Redis.

**Tooling:** `vitest`, `supertest` (REST), `socket.io-client` (sockets), `mongodb-memory-server` OR a Docker-Compose-managed test container, `ioredis-mock`.

**Test infrastructure (`src/__tests__/setup.integration.ts`):**

- `beforeAll`: spin up MongoMemoryServer, set `MONGO_URI`, set `REDIS_URL` to `ioredis-mock://`, start the app on a random port via `app.listen(0)`, attach Socket.io.
- `afterEach`: clear all DB collections + Redis keys.
- `afterAll`: close server, close DB, stop MongoMemoryServer.

**Test files:**

| File | Flow tested |
|---|---|
| `__tests__/auth.integration.test.ts` | Register → login → getMe → updateProfile → changePassword → deleteAccount end-to-end. Negative: duplicate username, wrong password, role escalation attempt |
| `__tests__/guest.integration.test.ts` | `loginAsGuest` returns valid token; guest cannot access `/api/users/me`; guest can connect socket and join a room |
| `__tests__/room.integration.test.ts` | Two clients connect with different JWTs → client A creates room → client B joins → both receive `room:state` → second join into a full room rejected |
| `__tests__/tictactoe.integration.test.ts` | Full game: 2 players connect, room created, game starts, alternating valid moves, server emits state after each, opponent receives `game:turn`, win is detected, `game:end` fires, MongoDB has new Match doc, both players' stats incremented |
| `__tests__/cardgame.integration.test.ts` | 4 players connect, room fills, game starts, hand-counts correct, must-follow-suit enforced (off-suit move rejected), trick resolution rotates lead, final scoring matches manually computed expected |
| `__tests__/spectator.integration.test.ts` | Spectator joins, receives `game:state` without `myHand`, `game:action` from spectator returns `error_event` |
| `__tests__/matchmaking.integration.test.ts` | 2 clients queue for tictactoe → both receive `matchmaking:matched` with same roomCode → join the room → game starts |
| `__tests__/chat.integration.test.ts` | Message broadcast, 300-char limit, throttle (second message within 500ms rejected), 50-msg history cap |
| `__tests__/disconnect.integration.test.ts` | Client A disconnects mid-game → other player sees `room:state` with `isConnected: false` → A reconnects within grace → state resumes. A doesn't reconnect → after grace, opponent receives `game:end` with forfeit |
| `__tests__/admin.integration.test.ts` | Admin token required for `/api/admin/*`. Self-protection: admin cannot delete self. Last-admin: cannot demote the only admin |
| `__tests__/security.integration.test.ts` | NoSQL injection attempt blocked, XSS payload escaped, oversized body rejected (10kb limit), no `x-powered-by` header, helmet headers present, role escalation via `PUT /api/auth/me` body fails silently |

**Helper: `createTestClient` factory:**

```ts
export const createTestClient = async (user: { isGuest?: boolean; role?: 'player' | 'admin' } = {}): Promise<{ httpAgent: SuperAgentTest; socket: ClientSocket; token: string }> => {
  // Register a fresh user (or generate guest token), return supertest agent + connected socket
};
```

**Coverage target:** every Socket.io event has at least one happy-path and one rejection-path integration test.

**npm scripts:**

| Script | Command |
|---|---|
| `test:integration` | `vitest run --config vitest.integration.config.ts` |
| `test:all` | `npm run test:run && npm run test:integration` |

**SECURITY:**
- Integration tests assert security guarantees (NoSQL injection, XSS, role escalation) — not just functionality.
- Tests use fresh in-memory Mongo/Redis per run, eliminating test-pollution.
- No production-style Redis or Mongo URLs in test config; URLs are constructed at runtime.

---

# PHASE 7 — Client Foundation

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

**`src/hooks/useSocketEvent.ts`** — generic over event names so the handler param is auto-inferred:

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

**`.env.example` (client):**

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**SECURITY:**
- Token stored in `localStorage` only — never in non-`httpOnly` cookies.
- 401 interceptor clears token and redirects, preventing stale-token usage.
- Socket auth attached via `auth: { token }` (handshake) — never logged anywhere.

---

## STEP 32 — Reusable UI Kit (Button, Input, Modal, Spinner, Card, Badge)

Build the design-system primitives once, then use them across every page. This step **must** come before any page implementation so pages compose primitives instead of duplicating styles.

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
├── StatusBadge.tsx     # Composed: maps room status → Badge variant + icon
├── RoleBadge.tsx       # Composed: player vs admin
├── Card.tsx            # Surface container with consistent padding/border
├── Avatar.tsx          # Image or initials fallback, sizes: xs/sm/md/lg
├── Tooltip.tsx         # Hover/focus tooltip
├── Tabs.tsx            # Headless tabs with keyboard nav
├── EmptyState.tsx      # Icon + heading + description + CTA slot
├── CharacterCounter.tsx
└── index.ts            # Re-export all
```

**Common props pattern** — every component extends native HTML props plus typed variants:

```tsx
// Example: Button.tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, leftIcon, children, className, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...rest}
      >
        {isLoading ? <Spinner size="sm" /> : leftIcon}
        {children}
      </button>
    );
  }
);
```

**`utils/cn.ts`** — tiny `clsx`-style class merger (no dependency):

```ts
export const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');
```

**Modal focus management (`Modal.tsx`):**
- On open: stash the previously focused element, focus the modal's first focusable.
- On close: restore focus to the stashed element.
- Trap Tab/Shift+Tab cycling within the modal.
- Escape key closes (configurable via `closeOnEscape` prop, default true).
- Backdrop click closes (configurable via `closeOnBackdropClick`, default true).
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linked to title id.

**Tailwind variants helper** — keep variant→class mapping in pure objects (not class-variance-authority dep — too heavy):

```ts
const buttonVariants = ({ variant, size }: { variant: Variant; size: Size }): string => {
  const variants: Record<Variant, string> = {
    primary:   'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-surface text-fg hover:bg-surface/80 border border-border',
    ghost:     'bg-transparent text-fg hover:bg-surface/50',
    danger:    'bg-danger text-white hover:bg-danger/90',
  };
  const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' };
  return cn('inline-flex items-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary', variants[variant], sizes[size]);
};
```

**SECURITY:**
- Inputs forward all native HTML props — including `autoComplete`, `inputMode`, `type` — so callers can specify `type="password"` and `autoComplete="new-password"` without UI Kit overrides.
- Modals always render via React portal into `document.body` to avoid being clipped by parent `overflow:hidden`; this also prevents accidental capture of focus by parent containers.
- No component uses `dangerouslySetInnerHTML`. Text content is JSX-escaped by default.

---

## STEP 33 — Contexts: Auth, Socket, Preferences

**`AuthContext.tsx`** typed state: `{ user: AuthUser | null; token: string | null; loading: boolean }`. Methods: `login`, `register`, `loginAsGuest`, `logout`, `updateUser`, `isAdmin(): boolean`, `isGuest(): boolean`. On mount: read token from `localStorage`; if present, call `getMe` (skip for guests — decode token client-side to recover `displayName`/`isGuest`/`role`). Decoding uses a tiny no-deps base64 JSON decoder typed against `JwtPayload`; signature verification stays on the server.

**`SocketContext.tsx`** typed state: `{ socket: AppSocket | null; isConnected: boolean }`. On `AuthContext.token` change, call `connectSocket(token)` if present, else `disconnectSocket()`. Track `connect`/`disconnect`/`connect_error` events to flip `isConnected`. Expose `emit<K extends keyof ClientToServerEvents>(event: K, ...args: Parameters<ClientToServerEvents[K]>)` helper backed by the singleton.

**`PreferencesContext.tsx`** typed state: `{ preferences: UserPreferences }` (from `shared/types/user.ts`). For registered users, hydrate from `getMe` and persist via `updatePreferences`. For guests, persist to `localStorage`. Apply theme (`light`/`dark`/`system` with `matchMedia` listener), font size class on `<html>`, animations toggle (CSS variable), sounds toggle (read by `useSounds`).

**`hooks/useSounds.ts`** — typed `play(name: 'turn' | 'win' | 'lose' | 'click'): void`. Preloads `/sounds/turn.mp3`, `/sounds/win.mp3`, `/sounds/lose.mp3`, `/sounds/click.mp3`. No-op if `preferences.sounds === false`.

**SECURITY:**
- Client-side JWT decode is purely informational; the server still verifies on every request.
- Preferences for guests live only in `localStorage` (no backend write path) — eliminates any guest-write attack surface.

---

## STEP 34 — Layouts, Navbar & Routing

**Layouts:**

| Component | Composition |
|---|---|
| `MainLayout` | `<Navbar /> <Outlet /> <Footer />` |
| `AdminLayout` | sidebar (Dashboard, Users, Active Rooms, Matches) + `<Outlet />`. Mobile collapse to a top dropdown. |
| `SettingsLayout` | side nav (Profile, Account, Appearance, Notifications) + `<Outlet />`. Mobile dropdown. |

**Navbar elements:**
- Logo → `/`.
- Links: Home, Leaderboard.
- Right: if logged in → avatar + display name + dropdown (My Profile, Settings, Admin (if admin), Logout). If logged out → Login, Register, Play as Guest.
- Mobile hamburger.

**Route guards (`components/guards/`):**

| Guard | Behavior |
|---|---|
| `ProtectedRoute` | Wait for `loading=false`; if no `user`, redirect `/login`. |
| `AdminRoute` | `ProtectedRoute` + `user.role === 'admin' && !user.isGuest`, else redirect `/`. |
| `GuestOnlyRoute` | If `user`, redirect `/` (used on `/login`, `/register`, `/guest`). |
| `RegisteredOnlyRoute` | `ProtectedRoute` + `user && !user.isGuest`, else redirect `/` (settings, profile edit). |

**`App.tsx` routes:**

| Path | Element | Guard |
|---|---|---|
| `/` | `HomePage` | `MainLayout` |
| `/login` | `LoginPage` | `GuestOnlyRoute` |
| `/register` | `RegisterPage` | `GuestOnlyRoute` |
| `/guest` | `GuestEntryPage` | `GuestOnlyRoute` |
| `/room/:roomCode` | `GameRoomPage` | `ProtectedRoute` |
| `/leaderboard` | `LeaderboardPage` | — |
| `/u/:username` | `PublicProfilePage` | — |
| `/profile` | `MyProfilePage` | `RegisteredOnlyRoute` |
| `/settings/*` | `SettingsLayout` + nested routes | `RegisteredOnlyRoute` |
| `/admin/*` | `AdminLayout` + nested routes | `AdminRoute` |
| `*` | `NotFoundPage` | — |

**SECURITY:**
- Route guards display a spinner while `loading === true` — no flash of admin or protected content for unauthenticated users.
- Guards enforce client-side gating for UX; server still re-checks on every API/socket call.

---

# PHASE 8 — Client Pages

## STEP 35 — Auth Pages (Login, Register, Guest Entry)

**`LoginPage.tsx`**: typed form state `{ email: string; password: string }`. Submit → `authService.login` → store token → navigate `/`. Show generic error toast on failure ("Invalid email or password").

**`RegisterPage.tsx`**: typed form state `{ username: string; email: string; password: string; displayName: string }`. Client-side regex hints (3–20 chars, lowercase, etc.) but server is the truth. Submit → `register` → auto-login → navigate `/`.

**`GuestEntryPage.tsx`**: typed form state `{ displayName: string }`. Big "Play as Guest" button. Submit → `loginAsGuest` → navigate `/`. Banner: "Guest progress is not saved. Stats and leaderboard require an account."

**Shared form UX:** disabled submit while pending, inline field errors mapped from backend `errors[]`.

**SECURITY:**
- Errors surfaced to UI are exactly the strings returned by the server — no leaking of raw exception data.
- No password autocompleting on the registration form for the displayName field.

---

## STEP 36 — Home / Lobby Page (Create / Join / Matchmake)

**`HomePage.tsx` sections:**

1. **Hero** with display name and CTAs.
2. **Create Room** card: select `gameType` (`TicTacToe` 2P / `Card Game` 4P), private toggle, "Create" → emit `room:create` → on `room:state`, navigate `/room/:roomCode`.
3. **Join Room** card: input `roomCode` → emit `room:join` → on success navigate `/room/:roomCode`.
4. **Matchmaking** card: select gameType → emit `matchmaking:join` → show queue position + spinner → on `matchmaking:matched`, emit `room:join` → navigate.
5. **Recent Public Rooms** (optional, fetched via REST `/api/admin/rooms` if admin, else hidden) — list shows public, non-`isPrivate` rooms with open seats; "Watch" emits join with `asSpectator: true`.

**Cancel queue button** while queued → emit `matchmaking:cancel`.

**SECURITY:**
- Server-emitted `error_event` codes (`ROOM_NOT_FOUND`, `ROOM_FULL`, `ALREADY_IN_ROOM`, `GAME_IN_PROGRESS`) are mapped to user-friendly toasts; codes themselves never displayed verbatim.

---

## STEP 37 — Game Room Page Orchestration

**`GameRoomPage.tsx`** layout. Typed state: `{ room: Room | null; gameState: GameState | null; chat: ChatMessage[]; turnInfo: { currentPlayerId: string } | null }`.

- **Header**: room code (copy button), gameType, status pill (`waiting`/`in_progress`/`ended`), Leave button.
- **Left column**: `PlayerList` (avatar, displayName, position, online dot, your-turn highlight). `SpectatorList`.
- **Center column**: `GameBoardFrame` — renders `<TicTacToeBoard />` or `<CardGameTable />` based on `gameType`. `TurnIndicator` above the board. `RematchPrompt` after `game:end`.
- **Right column**: `ChatPanel` — scrollable history, input with 300-char counter.

**Subscribed socket events:** `room:state`, `room:player_joined`, `room:player_left`, `room:closed`, `game:state`, `game:turn`, `game:end`, `chat:message`, `error_event`.

**On mount:** if not already joined (e.g., direct URL), emit `room:join { roomCode, asSpectator: true }` (defaulting to spectator if game is in progress and not a player; server decides).

**On unmount / navigate away:** emit `room:leave`.

**Visual states:**
- Disconnected player → grayed-out card with "Reconnecting…".
- Game ended → overlay with result, Rematch button (players only), "Back to Home" (everyone).

**SECURITY:**
- All data shown is from server pushes; no derived "you can play here" UI relies on client state.
- Action buttons disabled when `currentTurnUserId !== user._id` — hard-disabled, not just hidden.

---

## STEP 38 — Game Room Sub-Components (PlayerList, SpectatorList, ChatPanel, TurnIndicator, RematchPrompt)

Decompose `GameRoomPage`'s complex layout into focused, individually-testable child components. Each receives only what it needs as typed props; none subscribe to socket events directly (parent does).

**`components/game/PlayerList.tsx`** props: `{ players: RoomPlayer[]; currentTurnUserId: string | null; mySelfUserId: string }`.
- Renders one card per player: avatar, displayName, position badge, online dot (green/red based on `isConnected`), turn highlight ring when `player.userId === currentTurnUserId`.
- Self card has subtle "(you)" suffix.
- Memoized via `React.memo`; re-renders only when player array shape changes (compare via shallow equality on `players.length` + `players.map(p => p.userId + p.isConnected).join()`).

**`components/game/SpectatorList.tsx`** props: `{ spectators: RoomSpectator[] }`.
- Compact horizontal list of avatars with tooltip displayName.
- Counter badge: "{count} watching".
- Hidden entirely when `spectators.length === 0`.

**`components/game/TurnIndicator.tsx`** props: `{ currentPlayerId: string | null; mySelfUserId: string; players: RoomPlayer[] }`.
- Large status text: "Your turn", "Waiting for {displayName}…", "Game in progress" (initial), or "Game over" (post-end).
- `aria-live="polite"` so screen readers announce turn changes (Step 48).
- Subtle pulse animation when it's your turn.

**`components/game/ChatPanel.tsx`** props: `{ messages: ChatMessage[]; onSend: (text: string) => void; throttledUntil: number | null }`.
- Scrollable history (auto-scroll to bottom on new message unless user has scrolled up — track with ref + scroll detection).
- Input field with `<CharacterCounter current={input.length} max={300} />`.
- Submit on Enter; Shift+Enter inserts newline (rejected by validator since 1-line messages only).
- Disabled state with countdown when `throttledUntil > Date.now()`: "Please wait Ns…".
- Each message row uses memoized `<ChatMessageRow>` keyed by `${from}:${timestamp}`.
- Plays `chat` sound when new message arrives AND `document.hidden === true` (Step 47).

**`components/game/RematchPrompt.tsx`** props: `{ visible: boolean; iAmPlayer: boolean; rematchVotes: string[]; players: RoomPlayer[]; onRequest: () => void; onDecline: () => void }`.
- Modal overlay shown when `visible && room.status === 'ended'`.
- Shows result first, then list of players with vote status (✓ if voted, "Pending" otherwise).
- "Rematch" button (disabled if I already voted), "Back to Home" button.
- When all players have voted, modal auto-dismisses; new game starts via fresh `game:state` push.

**`components/game/GameBoardFrame.tsx`** props: `{ gameType: GameType; gameState: GameState; isMyTurn: boolean; mySelfUserId: string; onAction: (action: GameAction) => void }`.
- Discriminated-union switch on `gameState.gameType`:
  - `'tictactoe'` → renders `<TicTacToeBoard />` (Step 39).
  - `'cardgame'` → renders `<CardGameTable />` (Step 40).
- TypeScript exhaustiveness check via `never`-cast on the default branch — adding a new game without a new case fails compile.

**Component composition map (`GameRoomPage`):**

```
<GameRoomPage>
├── <ConnectionBanner />            (from Step 45, mounted in MainLayout)
├── <header> roomCode + status pill + Leave button </header>
├── <PlayerList />
├── <TurnIndicator />
├── <GameBoardFrame />
│   └── <TicTacToeBoard /> | <CardGameTable />
├── <ChatPanel />
├── <SpectatorList />
└── <RematchPrompt />
```

**SECURITY:** Sub-components receive already-sanitized data from `gameState`. They do not perform any independent state derivation that could leak hidden info (e.g., `ChatPanel` never has access to player hands).

---

## STEP 39 — TicTacToe Board Component

**`TicTacToeBoard.tsx` props (typed):** `TicTacToeState & { isMyTurn: boolean; mySymbol: 'X' | 'O' | null; onPlay: (index: number) => void }`.

- 3×3 CSS grid of cells. Empty cell → clickable iff `isMyTurn && !cell && !result`.
- Click → `onPlay(index)` which emits `game:action { action: 'play', payload: { index } }`.
- Winning line cells highlighted post-result.
- Sounds: `click` on play, `turn` on turn-flip, `win`/`lose` on result.

**SECURITY:**
- `index` is the only client input; server validates (Step 18).

---

## STEP 40 — Card Game Component

**`CardGameTable.tsx` props (typed):** `CardGameState & { isMyTurn: boolean; onPlayCard: (card: Card) => void }`.

- Top/left/right player slots show avatar, displayName, `handCount` (number of cards), `tricksWon`.
- Center: `currentTrick` cards animated to a tabletop area, with `leadSuit` indicator.
- Bottom: `myHand` shown as fanned cards. Card hover lifts; click only allowed when `isMyTurn`. Cards that violate "must follow suit" are visually dimmed (computed client-side as a hint only — server still validates).
- Click → `onPlayCard(card)` emits `game:action { action: 'play_card', payload: { card } }`.

**SECURITY:**
- `myHand` is only the cards the **server** sent us; the client never derives or reveals other players' hands.
- Suit-following dimming is UX only — final validation is server-side.

---

## STEP 41 — Leaderboard Page

**`LeaderboardPage.tsx`** filters: `gameType` (All/TicTacToe/CardGame), pagination.

Table columns: Rank, Avatar, Display Name, Wins, Losses, Draws, Games Played, Win Rate. Username links to `/u/:username`.

Empty state: "No players yet. Be the first to win a game!"

**SECURITY:**
- Only fields the API projected — no email, no preferences leakage.

---

## STEP 42 — Profile Pages (Public & Own)

**`PublicProfilePage.tsx`** (`/u/:username`):
- Header: avatar, display name, role badge, member-since.
- Tabs: **Stats** (per-game cards from `statsByGame`), **Recent Matches** (from `getUserMatches`).
- If target user has `privacy.showStats === false`, show "This user has hidden their stats."

**`MyProfilePage.tsx`** (`/profile`): same layout as public, plus "Edit profile" CTA → `/settings/profile`.

**SECURITY:**
- Privacy filtering is rendered conditionally based on what the API returned (which is itself filtered server-side) — UI never displays fields the server didn't send.

---

## STEP 43 — Settings Pages

Auto-save on blur for non-sensitive prefs (theme, fontSize, animations, sounds, notifications, privacy). Confirm modal for destructive actions.

| Page | Fields |
|---|---|
| `ProfileSettings` | displayName (text, 2–30), bio (textarea, 200), avatar upload + remove |
| `AccountSettings` | change password (current + new + confirm), delete account (password confirm + typed phrase) |
| `AppearanceSettings` | theme `light`/`dark`/`system` (radio), fontSize `small`/`medium`/`large`, animations toggle, sounds toggle |
| `NotificationsSettings` | matchInvite toggle, rematch toggle |
| `PrivacySettings` | showStats toggle, showOnLeaderboard toggle |

**Reusable components:** `ToggleSwitch`, `SelectableCard` (for theme/fontSize radio cards), `CharacterCounter`.

**SECURITY:**
- Password fields are `type="password"` with `autoComplete="current-password"` / `"new-password"`.
- Delete account requires both password and a typed confirmation phrase ("DELETE my account").
- Avatar upload progress shows a spinner; no client-side image processing that could mis-report file type.

---

## STEP 44 — Admin Pages (Dashboard, Users, Active Rooms)

| Page | Content |
|---|---|
| `AdminDashboard` | Cards: Total Users, Total Admins, Total Matches, Active Rooms, Queue Size. Chart-style table: matches per game type. |
| `AdminUsers` | Search (debounced 300ms), filter by role, paginated table (avatar, username, email, role, gamesPlayed, lastLoginAt, actions). Actions: change role (modal with current-admin + last-admin guards client-side reflected from server response), delete user (confirm modal). |
| `AdminActiveRooms` | Live list (polled every 10s OR refreshed via admin socket subscription). Columns: roomCode, gameType, status, players, createdAt, actions (Force Close → emits REST DELETE → server emits `room:closed` to room). |
| `AdminMatches` | Recent matches list with filter by game type. Click row → match detail (read-only). |

**Self-protection UI:** in `AdminUsers`, the row representing `req.user` shows disabled "Change Role" and "Delete" actions.

**SECURITY:**
- All server-side guards (admin self-protection, last-admin) re-checked on the backend; UI disabling is purely UX.
- Confirm modals required for destructive actions to prevent accidental clicks.

---

# PHASE 9 — Client Polish

## STEP 45 — Reconnection UX Flow (Banner, Retry, Rejoin Toast)

Make disconnects feel handled rather than scary. The server already keeps a 30-second grace window (Step 24); the client must visually communicate every state of that window.

**State machine on the client:**

| Connection State | Trigger | UI |
|---|---|---|
| `connected` | initial `connect` event | Nothing (default) |
| `disconnected_temporary` | `disconnect` reason ∈ `{ 'transport close', 'transport error', 'ping timeout' }` | Sticky top banner: "Reconnecting…" with animated dots, retry counter ("attempt 3 of ∞") |
| `disconnected_terminal` | `disconnect` reason `'io server disconnect'` (server kicked us) OR `connect_error` with `UNAUTHORIZED` | Banner: "Disconnected: <reason>." with "Reconnect" button + Logout button |
| `reconnected` | `connect` event after a previous `disconnect` | Toast: "Reconnected. Catching up…" then `room:state`/`game:state` push from server replaces stale local state |

**`SocketContext.tsx`** additions:
- Track `reconnectAttempts: number` (incremented on `reconnect_attempt`).
- Track `lastDisconnectReason: string | null`.
- Expose `connectionState: 'connected' | 'disconnected_temporary' | 'disconnected_terminal' | 'connecting'`.

**`components/system/ConnectionBanner.tsx`** typed component reading `useContext(SocketContext)`. Mounted once globally inside `MainLayout` so it spans every route.

**Game-specific UX inside `GameRoomPage.tsx`:**
- When self disconnects: show a translucent overlay on the game board with "Reconnecting… your turn timer is paused server-side."
- When **opponent** disconnects (received via `room:state` with their `isConnected: false`): grey out their player card, show a small countdown ("Forfeits in 28s…") driven by a local interval seeded from the server's last `room:state` timestamp.
- On opponent return (`room:state` with `isConnected: true` again): toast "{displayName} reconnected." Cancel local countdown.

**Reconnection token validation:**
- If the `connect_error` carries `UNAUTHORIZED` (token expired during disconnect window), client clears `localStorage.token`, navigates to `/login`, shows toast "Your session expired. Please log in again."

**SECURITY:**
- The "Forfeits in Ns" countdown is a **visual hint only** — the server is the single source of truth and may forfeit at any moment. Client never decides forfeit.
- Banner messages never include error stack/server internals — only generic states.
- Manual "Reconnect" button on the terminal state forces a fresh `connectSocket(token)` call; if token is stale, the server rejects and the auto-redirect to `/login` kicks in.

---

## STEP 46 — Animations & Game Feel (Transitions, Piece Drop, Card Flip, Win Highlight)

Make the games feel responsive and alive. All animations honor `preferences.animations`; when `false`, a CSS class on `<html>` short-circuits every `transition`/`animation` to `none`.

**Tailwind animation tokens** added in `index.css` `@theme`:

| Token | Use |
|---|---|
| `--animate-piece-drop` | TicTacToe X/O placement (200ms ease-out scale + opacity) |
| `--animate-card-flip` | CardGame card play (300ms 3D rotateY) |
| `--animate-card-deal` | CardGame initial deal (staggered 50ms per card) |
| `--animate-win-pulse` | Winning line / trick highlight (1s pulse, 3 iterations) |
| `--animate-toast-in` / `out` | Toast entry/exit |
| `--animate-modal-in` / `out` | Modal backdrop + content |
| `--animate-page-fade` | Route transition |

**Per-game animation hooks:**

| Component | Animation |
|---|---|
| `TicTacToeBoard` cell | New `X`/`O` enters with `animate-piece-drop`. Identify "new" by comparing previous `board` prop with current via `useRef`. |
| `TicTacToeBoard` win | After `result === 'win'`, derive winning line indexes; apply `animate-win-pulse` to those 3 cells, stronger color. |
| `CardGameTable` deal | On `gameState` first load, stagger card entry into `myHand` with 50ms intervals. |
| `CardGameTable` play | Card moves from hand position to trick area with FLIP technique (measure → animate). |
| `CardGameTable` trick win | The winning card briefly scales up + glows before all 4 cards collapse into the winner's "tricks won" pile. |
| `RematchPrompt` modal | `animate-modal-in` on mount, `animate-modal-out` on dismiss. |
| Page transitions | `App.tsx` wraps `<Outlet />` in a div with `key={location.pathname}` and `animate-page-fade`. |

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

**Reduced motion respect:** also check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` in addition to user preference. Both must be `false` (preference: `true`, system: `no-preference`) for animations to play.

**SECURITY:** Animations are pure presentation; they never gate gameplay. A user who disables them must still be able to play every move and see every state change.

---

## STEP 47 — Sound Design (Preload, Volume, Mute, Contextual Triggers)

A small set of carefully chosen sounds dramatically improves perceived quality.

**Sound assets in `client/public/sounds/`:**

| File | Use |
|---|---|
| `click.mp3` | UI button clicks (kept subtle) |
| `turn.mp3` | "Your turn" notification when `currentTurnUserId` flips to self |
| `move.mp3` | Opponent placed a piece / played a card |
| `win.mp3` | `game:end` with self as winner |
| `lose.mp3` | `game:end` with self losing |
| `draw.mp3` | `game:end` with `result: 'draw'` |
| `chat.mp3` | New chat message (only when window not focused) |
| `match-found.mp3` | `matchmaking:matched` event |

**`hooks/useSounds.ts` enhanced:**

```ts
type SoundName = 'click' | 'turn' | 'move' | 'win' | 'lose' | 'draw' | 'chat' | 'match-found';

export const useSounds = () => {
  const { preferences } = useContext(PreferencesContext);
  const cacheRef = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  const play = useCallback((name: SoundName, volumeOverride?: number): void => {
    if (!preferences.sounds) return;
    let audio = cacheRef.current.get(name);
    if (!audio) {
      audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = 'auto';
      cacheRef.current.set(name, audio);
    }
    audio.currentTime = 0;
    audio.volume = volumeOverride ?? preferences.soundVolume ?? 0.7;
    void audio.play().catch(() => { /* autoplay policy may block — silent fail */ });
  }, [preferences.sounds, preferences.soundVolume]);

  return { play };
};
```

**Trigger map (where to call `play(name)`):**

| Trigger | Sound | Component |
|---|---|---|
| Any `<Button>` click | `click` (volume 0.3) | `ui/Button.tsx` |
| `game:turn` event with `currentPlayerId === self` | `turn` | `GameRoomPage.tsx` |
| Opponent move arrives via `game:state` (board diff or hand-count diff) | `move` | `GameRoomPage.tsx` |
| `game:end` self winner | `win` | `GameRoomPage.tsx` |
| `game:end` opponent winner | `lose` | `GameRoomPage.tsx` |
| `game:end` `result: 'draw'` | `draw` | `GameRoomPage.tsx` |
| `chat:message` and `document.hidden === true` | `chat` | `ChatPanel.tsx` |
| `matchmaking:matched` | `match-found` | `HomePage.tsx` |

**Settings additions:** add `soundVolume` (number 0–1, default 0.7) to `UserPreferences` in `shared/types/user.ts` and to `AppearanceSettings` page (slider).

**SECURITY:** No security implications — sounds are local assets served from `client/public/`.

---

## STEP 48 — Accessibility (Keyboard Nav, ARIA, Focus Management, Screen Reader)

Every interactive element must be reachable and announceable without a mouse.

**Game boards keyboard navigation:**

| Game | Keys |
|---|---|
| TicTacToe | `Tab` enters board → arrow keys move focus across 3×3 grid → `Enter`/`Space` plays the focused cell. Disabled (occupied/not-your-turn) cells skipped via `tabindex="-1"`. |
| CardGame | `Tab` enters hand → arrow keys cycle cards → `Enter`/`Space` plays card. Suit-following hint also announced via `aria-describedby` on dimmed cards. |

**ARIA contracts:**

| Element | Attributes |
|---|---|
| TicTacToe board | `role="grid"`, `aria-label="TicTacToe game board"` |
| TicTacToe cell | `role="gridcell"`, `aria-label="Row {r}, Column {c}, {empty/X/O}"`, `aria-disabled={!canPlay}` |
| Card in hand | `role="button"`, `aria-label="Card: {rank} of {suit}"`, `aria-disabled={!canPlay}` |
| Turn indicator | `role="status"`, `aria-live="polite"` so screen readers announce turn changes |
| Chat panel | new messages container `aria-live="polite"`, `aria-atomic="false"` |
| Toast notifications | `aria-live="assertive"` for errors, `polite` for success |
| Connection banner | `role="alert"` |
| All form inputs | `<label htmlFor>` paired with `id`; error messages `aria-describedby` linked |
| Modal dialogs | `role="dialog"`, `aria-modal="true"`, focus trapped, `Escape` closes, focus returns to trigger on close |
| Buttons with icon only | `aria-label` describing action |

**Focus management:**
- Route change focuses the page's `<h1>` (use `useEffect` + `tabindex="-1"` + `.focus()`).
- Modal open: focus first interactive element. Modal close: restore focus to the trigger button.
- After `game:end`, focus moves to the rematch button automatically.

**Color contrast:** every text/background pair tested against WCAG AA (4.5:1 normal, 3:1 large). Tailwind theme tokens audited; status badges use icon + text, never color alone.

**Screen reader testing checklist:**
- [ ] NVDA on Windows announces board state, turn changes, game end, chat messages.
- [ ] VoiceOver on macOS does the same.
- [ ] All interactive elements have a visible focus ring (Tailwind `focus-visible:ring-2`).
- [ ] No `outline: none` without a custom replacement.

**SECURITY:** Accessibility additions are pure UX and don't expose any new state to the client.

---

## STEP 49 — Performance (React.memo, Code Splitting, Lazy Routes, useCallback Strategy)

Keep first paint fast and interaction smooth even with several active sockets.

**Code splitting via `React.lazy`:**

| Route | Lazy? | Reason |
|---|---|---|
| `/admin/*` | yes | Most users never see admin |
| `/settings/*` | yes | Visited rarely |
| `/leaderboard` | yes | Optional viewing |
| `/u/:username` | yes | Optional viewing |
| `/`, `/login`, `/register`, `/guest`, `/room/:roomCode` | no | Critical path |

Use `<Suspense fallback={<Spinner />}>` per lazy boundary.

**`React.memo` targets** (props rarely change while parent re-renders frequently):

| Component | Why |
|---|---|
| `PlayerList` | Updates only on `room:state` players diff |
| `SpectatorList` | Updates only on spectator joins/leaves |
| `ChatMessage` (single message) | Memoize each row keyed by `id+timestamp` so chat list re-renders only the new row |
| `TicTacToeBoard` cells | Each cell memoized on `(value, isWinningCell, canPlay)` |
| `CardInHand` | Each card memoized on `(card, isPlayable, isSelected)` |

**`useCallback` for event handlers passed deeply:**
- `onPlay`, `onPlayCard`, `onSendChat`, `onRematch` in `GameRoomPage.tsx` all wrapped to keep stable references.

**`useMemo` for derived state:**
- `winningLine` indexes in TicTacToe.
- `myHandSorted` (by suit, then rank) in CardGame.
- Leaderboard row computations.

**Avoiding unnecessary socket re-subscriptions:**
- `useSocketEvent` already cleans up on unmount; ensure handler refs are stable via `useCallback`.

**Bundle analysis:**
- Add `rollup-plugin-visualizer` to `vite.config.ts` (dev only) — produces `stats.html` after `npm run build`. Goal: main chunk < 250 KB gzipped.

**Network optimizations:**
- Preconnect to backend domain via `<link rel="preconnect" href={VITE_SOCKET_URL}>` in `index.html`.
- Image lazy loading: `<img loading="lazy">` on avatar lists (leaderboard, admin users table).

**Server-side perf:**
- `compression` middleware (gzip) added in `server.ts`.
- Mongoose `.lean()` on read-only queries (leaderboard, public profiles, match list).

**SECURITY:** Lazy chunks must still go through the same auth guards; route guards run before the lazy boundary mounts, so unauthenticated users never download admin code.

---

## STEP 50 — Responsive Design (Mobile Game Room, Touch Targets, Adaptive Board)

Game must be playable on phones (≥360px) without compromising desktop layout.

**Breakpoints (Tailwind defaults):** `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`.

**Page-by-page responsive plan:**

| Page | Mobile (<768) | Desktop (≥1024) |
|---|---|---|
| `HomePage` | Single-column stacked cards | 2-column grid (Create + Join, Matchmaking + Recent) |
| `GameRoomPage` | Tab bar at top: `Players` / `Game` / `Chat`. Each tab fills viewport. | 3-column: PlayerList (left), Game (center), Chat (right) |
| `TicTacToeBoard` | Board fills 90vw, max 320px | Fixed 480px |
| `CardGameTable` | Horizontal scroll for hand, opponent slots compress to avatar+count only | Full table layout with all 4 sides visible |
| `LeaderboardPage` | Card-style rows (no table) | Full table |
| `AdminUsers` | Card-style rows | Sortable table |
| `Navbar` | Hamburger → drawer | Inline links |
| `SettingsLayout` | Top dropdown picker for sub-section | Side nav + content |
| `AdminLayout` | Top dropdown for sidebar | Side nav |
| Modals | Full-screen on `<sm` | Centered card |

**Touch target sizes:** every interactive element ≥ 44×44 px on mobile. TicTacToe cells default to 96×96 px; card hand items ≥ 48px tall.

**Viewport meta** in `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">` (allow zoom for accessibility).

**Adaptive tab navigator (`components/game/MobileTabBar.tsx`):**

```tsx
// Only rendered when window width < 768. Tracks active tab in local state.
// Each tab corresponds to a slot inside GameRoomPage; CSS `display: contents` swaps active panel.
```

**Testing matrix:**

| Device | Resolution | Manual test |
|---|---|---|
| iPhone SE | 375×667 | Game playable, chat readable |
| iPhone 14 | 390×844 | Hand cards visible without horizontal scroll |
| iPad | 768×1024 | Layout transitions cleanly to desktop |
| Desktop FHD | 1920×1080 | All 3 columns visible without scroll |

**404 page:** `NotFoundPage.tsx` — large 404, brief copy, "Go Home" button. Final pass on guards: ensure `ProtectedRoute` shows `<Spinner />` while `loading === true`. (This subsumes the dedicated 404 step from earlier drafts.)

**SECURITY:** No security implications for responsive design; all data filtering remains server-side.

---

# PHASE 10 — Client Testing

## STEP 51 — Component Tests (React Testing Library: forms, board, chat)

Lock in critical UI flows so refactors don't silently break gameplay.

**Tooling:** Vitest (already in client, via `vite`), `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw` (mock REST), `vitest-mock-extended`.

**Test config (`client/vitest.config.ts`):** environment `jsdom`, setup file imports `@testing-library/jest-dom/vitest`, mocks `socket.io-client` with a controllable EventEmitter stub.

**Test files (each next to the component):**

| File | What it covers |
|---|---|
| `pages/auth/__tests__/LoginPage.test.tsx` | Form validation, generic error toast on bad credentials, redirect on success |
| `pages/auth/__tests__/RegisterPage.test.tsx` | Username/email validation, mismatch errors, auto-login post-register |
| `pages/auth/__tests__/GuestEntryPage.test.tsx` | DisplayName validation, navigate to `/` on success |
| `components/games/__tests__/TicTacToeBoard.test.tsx` | Board renders 9 cells, click on empty cell when `isMyTurn` calls `onPlay(index)`, click ignored when not my turn, winning line highlighted |
| `components/games/__tests__/CardGameTable.test.tsx` | Hand renders correct cards, click on suit-following card calls `onPlayCard`, off-suit dimmed |
| `components/game/__tests__/ChatPanel.test.tsx` | Message list renders, send button submits, 300-char enforcement, throttle UX |
| `components/game/__tests__/PlayerList.test.tsx` | Connected/disconnected dot, current-turn highlight |
| `components/guards/__tests__/ProtectedRoute.test.tsx` | Spinner during loading, redirect on no user |
| `components/guards/__tests__/AdminRoute.test.tsx` | Redirect for non-admin, allow for admin |
| `context/__tests__/AuthContext.test.tsx` | Login persists token, logout clears, `isGuest`/`isAdmin` derive correctly |
| `pages/__tests__/LeaderboardPage.test.tsx` | Renders rows, filter by gameType, pagination |
| `hooks/__tests__/useSocketEvent.test.ts` | Subscribes on mount, unsubscribes on unmount |

**Mock socket pattern:**

```ts
class MockSocket extends EventEmitter {
  emit = vi.fn();
  on = (ev: string, fn: (...args: unknown[]) => void) => super.on(ev, fn);
  off = (ev: string, fn: (...args: unknown[]) => void) => super.off(ev, fn);
}
vi.mock('../socket/socket', () => ({ getSocket: () => mockSocket, /* ... */ }));
```

**Coverage target:** 70% lines, 80% branches on `components/`, `pages/auth/`, `context/`. (No 100% target — it incentivizes testing the wrong things.)

**npm scripts (`client/package.json`):**

| Script | Command |
|---|---|
| `test` | `vitest` |
| `test:run` | `vitest run` |
| `test:coverage` | `vitest run --coverage` |

**SECURITY:** Tests must not commit real credentials. Use fixture data only.

---

# PHASE 11 — DevOps & Deploy

## STEP 52 — README & Architecture Documentation

Top-level `README.md` with the following sections:

- **Title + tagline + tech badges** (TypeScript, Node, React, Socket.io, Redis, MongoDB, TailwindCSS).
- **Demo link** (filled in after deploy).
- **Features** (real-time multiplayer, room codes, matchmaking queue, spectators, chat, rematches, leaderboard, two games, admin panel, guest mode).
- **Architecture diagram** as a fenced ASCII block:

```
                  ┌─────────────┐
                  │   Client    │  React 19 + Vite + TypeScript
                  │  (Netlify)  │  socket.io-client (typed)
                  └──────┬──────┘
                         │  HTTPS REST + WSS
                         │  (shared/ types ensure contract)
                         ▼
                  ┌─────────────┐
                  │   Server    │  Express 5 + Socket.io 4 + TypeScript
                  │  (Render)   │  Node 20 LTS, compiled to dist/
                  └──┬───────┬──┘
                     │       │
            JWT auth │       │ Mongoose
                     ▼       ▼
              ┌─────────┐ ┌──────────────┐
              │  Redis  │ │   MongoDB    │
              │ (Cloud) │ │   (Atlas)    │
              │ Rooms,  │ │  Users,      │
              │ Queues, │ │  Matches,    │
              │ TTL     │ │  Stats       │
              └─────────┘ └──────────────┘
```

- **Roles & Permissions table:**

| Role | Create Room | Play | Spectate | Chat | Matchmaking | Leaderboard | Admin Panel |
|---|---|---|---|---|---|---|---|
| Guest | yes | yes | yes | yes | yes | no | no |
| Player | yes | yes | yes | yes | yes | yes | no |
| Admin | yes | yes | yes | yes | yes | yes | yes |

- **API Endpoints** table (HTTP method, path, auth, description).
- **Socket Events** table (direction, name, payload).
- **Folder Structure** (server + client + shared trees).
- **Security** section listing all major hardening measures (matches Step 27 audit).
- **Getting Started** (clone, env setup, install, run scripts, run tests).
- **Environment Variables** list (server + client).
- **Deployment** summary referencing Step 55.
- **Architecture sequence diagrams** (login flow, room creation flow, game move flow, disconnect→reconnect flow) using Mermaid blocks.
- **Troubleshooting** common issues (Render cold start, Redis connection refused, JWT secret too short).
- **License** (MIT).

---

## STEP 53 — CI/CD (GitHub Actions: typecheck + lint + test on PR)

Every PR and push to `main` runs an automated quality gate that mirrors the pre-deploy checks. A failed gate blocks merges via branch protection.

**`.github/workflows/ci.yml`** — three parallel jobs:

| Job | Steps |
|---|---|
| `server-ci` | checkout → setup-node@v4 with `node-version: 20` → `npm ci` in `server/` → `npm run typecheck` → `npm run lint` → `npm run test:run` (Step 29) → `npm run test:integration` (Step 30) |
| `client-ci` | checkout → setup-node@v4 → `npm ci` in `client/` → `npm run typecheck` → `npm run lint` → `npm run test:run` (Step 51) → `npm run build` (verifies vite build succeeds) |
| `shared-ci` | checkout → setup-node@v4 → `npm ci` in `shared/` → `npm run typecheck` |

**Caching:** `actions/setup-node@v4` with `cache: 'npm'` and `cache-dependency-path` pointing to each `package-lock.json`.

**Service containers for `server-ci`:**

```yaml
services:
  mongo:
    image: mongo:7
    ports: ['27017:27017']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
```

Integration test env vars set to `mongodb://localhost:27017/test_mpg` and `redis://localhost:6379`.

**`.github/workflows/deploy-preview.yml`** — on PR open/update:
- Build client → deploy to a Netlify deploy preview (uses Netlify GitHub App; no extra workflow needed if app is installed).
- Comment the preview URL on the PR (Netlify does this automatically).

**Branch protection on `main`:**
- Require all three CI jobs to pass.
- Require at least 1 approving review (or 0 for solo projects).
- Require branches to be up to date.
- Disable force pushes.

**Secret management:**
- All real secrets (`MONGO_URI`, `JWT_SECRET`, etc.) live only in Render/Netlify env vars — never in GitHub Actions secrets unless needed by deploy workflows. CI uses local containers and dummy secrets.

**Status badge in README:**

```md
![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)
```

**SECURITY:**
- CI never receives production secrets — only ephemeral test-container credentials.
- `pull_request` trigger uses `pull_request` not `pull_request_target` — forks cannot exfiltrate secrets.
- Dependabot enabled for `npm` ecosystem on both `server/` and `client/` to surface vulnerable dependencies.

---

## STEP 54 — Code Cleanup & Pre-Deploy Review

- Run `npm run typecheck` in **both** `server/` and `client/` — must exit 0 with zero errors. This is the definitive gate before deployment.
- Run `npm run build` in `server/` — verify `dist/` is produced and `node dist/src/server.js` boots locally.
- Run `npm run build` in `client/` — verify `dist/` is produced and `npm run preview` serves the SPA.
- Remove every `console.log` that prints tokens, hashes, or user PII.
- Remove unused imports across all files (`eslint --fix`).
- Search for `any` and `// @ts-ignore` / `// @ts-expect-error` — eliminate or document why each remaining instance is unavoidable.
- Sync `.env.example` (server + client) with the latest set of required keys; verify no real secrets present.
- Run `npm audit --omit=dev` on server and client; address high-severity findings.
- Re-run the Step 27 audit checklist top-to-bottom and mark each item.
- Verify Mongoose 9 hook syntax across `User.ts` and `Match.ts` (no `next` parameter).
- Verify no `req.query` mutations anywhere (Express 5).
- Verify `hpp` is **not** in `package.json`.
- Verify `shared/types/*.ts` is the single source for every wire-crossing payload — no duplicate type declarations on client and server.
- Verify all CI jobs (Step 53) pass on the latest commit.
- Smoke-test: register, login, guest login, create room, join with second account, play a full TicTacToe game, force a disconnect mid-game, check stat increments.

---

## STEP 55 — Deployment (Render + Netlify + Redis Cloud + MongoDB Atlas + optional Sentry)

**MongoDB Atlas:**
- Create free-tier M0 cluster.
- Database user with strong password (16+ chars, generated).
- Network access: temporary `0.0.0.0/0` for setup, then narrow to Render egress IPs once available.
- Connection string → `MONGO_URI`.

**Redis Cloud:**
- Create free-tier 30 MB DB.
- Default user password (or rotate).
- Connection URL → `REDIS_URL`.

**Render (backend service, type = Web Service):**
- Repo connected, root directory `server/`.
- Build command: `npm install && npm run build` (runs `tsc` → emits `dist/`; the `shared/` folder is included via the `tsconfig.json` path mapping so it bundles into compilation).
- Start command: `node dist/src/server.js`.
- **Critical:** Render must have access to the `shared/` folder during build. Since `server/tsconfig.json` references `../shared`, configure Render's root directory as the **repo root** (not `server/`) and override the build/start paths: build = `cd server && npm install && npm run build`, start = `cd server && node dist/src/server.js`. Alternative: keep `server/` as root and copy `shared/` into `server/shared/` via a `prebuild` script.
- Plan that supports **WebSockets** (Render's free Web Service does support WebSockets — confirm).
- Env vars: every key from `.env.example` plus `JWT_SECRET` (generated, ≥ 32 chars), `NODE_ENV=production`, `CLIENT_ORIGIN=https://<your-netlify-domain>`, `MONGO_URI`, `REDIS_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`.
- Health check path: `/api/health`.
- Run admin seed once via Render Shell: `cd server && npx tsx src/seed/seedAdmin.ts` (or after build: `node dist/src/seed/seedAdmin.js`).

**Netlify (frontend):**
- Repo connected, base directory: leave as repo root, then set Netlify build settings explicitly:
  - Build command: `cd client && npm install && npm run build`
  - Publish directory: `client/dist`
- Build automatically runs `tsc --noEmit && vite build` — **type errors fail the deploy**, which is exactly what we want.
- Env vars: `VITE_API_URL=https://<render-domain>/api`, `VITE_SOCKET_URL=https://<render-domain>`.
- `client/public/_redirects` already has `/* /index.html 200` for SPA fallback (committed with the repo, not Netlify-side config).

**Post-deploy verification:**

Functional:
- [ ] Register, login, logout work end-to-end.
- [ ] Guest entry works and guest cannot access `/profile` or `/admin`.
- [ ] Create room, share link with a second tab, join, play TicTacToe to win/draw, stats increment for registered users only.
- [ ] Card Game starts at 4 players, hands hidden from opponents, suit-following enforced.
- [ ] Matchmaking pairs two registered users automatically into TicTacToe.
- [ ] Spectator can join and sees public state only.
- [ ] Chat sends/receives in real time; 300-char limit enforced; throttle works.
- [ ] Disconnect mid-game → 30s grace → forfeit if no reconnect.
- [ ] Leaderboard reflects new wins after a game.
- [ ] Admin panel: dashboard stats render, user role change works, last-admin protection enforced, force-close room kicks all sockets.

Security:
- [ ] CORS blocks requests from an unknown origin (test from another domain).
- [ ] Rate limiter trips after exceeding auth limit (10/15min).
- [ ] `helmet` headers present (`x-frame-options`, `strict-transport-security`, etc.).
- [ ] NoSQL injection attempt (e.g., `email: { "$ne": null }` in JSON body) is sanitized — login still returns generic error.
- [ ] XSS attempt in `displayName`, `bio`, or chat is escaped on render.
- [ ] Role-escalation attempt via `PUT /api/auth/me` with `{ role: "admin" }` is silently dropped (whitelist).
- [ ] WebSocket connection without a token is rejected at handshake.
- [ ] Invalid `gameType` on `room:create` returns `error_event` with no internal details.
- [ ] Production error responses contain no stack traces.
- [ ] `x-powered-by` header is absent.
- [ ] `.env` is not committed; `.env.example` has no real secrets.

Once all checks pass, fill in the `Demo link` placeholder in `README.md`.
