<div align="center">
  <h1>Multiplayer Game Backend</h1>

  <p><em>A full-stack, real-time multiplayer game platform featuring WebSocket-powered gameplay, room management, matchmaking, spectator mode, in-game chat, leaderboard, and a comprehensive admin panel — built with React 19, Express 5, Socket.io, PostgreSQL, and Redis.</em></p>

  <p>
    <img src="https://img.shields.io/badge/license-PolyForm_NC_1.0-blue?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat-square" alt="Node.js version" />
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 6" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" alt="Express 5" />
    <img src="https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.io 4" />
    <img src="https://img.shields.io/badge/Postgres-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL Neon" />
    <img src="https://img.shields.io/badge/Redis-Cloud-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis Cloud" />
    <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
    <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/API-Render-46E3B7?style=flat-square&logo=render&logoColor=white" alt="API on Render" />
    <img src="https://img.shields.io/badge/Web-Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Web on Vercel" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs welcome" />
  </p>

  <p>
    <a href="https://multiplayer-game-backend-nu.vercel.app/">Live Demo</a> •
    <a href="#features">Features</a> •
    <a href="#installation">Quick Start</a> •
    <a href="#api-endpoints">API Docs</a> •
    <a href="#screenshots">Screenshots</a>
  </p>

  <a href="https://multiplayer-game-backend-nu.vercel.app/">
    <img src="./assets/screenshots/landing.png" alt="Multiplayer Game landing page" />
  </a>
</div>

---

## Features

- **Real-Time Multiplayer** — WebSocket-powered gameplay with sub-second latency via Socket.io
- **Room Codes** — Create private or public rooms with unique 6-character codes and configurable TTL
- **Matchmaking Queue** — Automatic opponent matching with estimated wait times and Redis-backed queues
- **Spectator Mode** — Watch live games without interfering; hidden info (card hands) is never exposed
- **In-Game Chat** — Throttled real-time messaging with system announcements and HTML escaping
- **Rematch System** — Vote-based rematch flow after game ends with accept/decline mechanics
- **Leaderboard** — Global rankings with privacy-respecting stat display and pagination
- **Two Games** — Tic-Tac-Toe and a Card Game, extendable via `GameFactory` pattern
- **Admin Panel** — Dashboard stats, user management, room oversight, and match history
- **Guest Mode** — Play instantly without registration with limited features and short-lived JWT
- **Profile & Avatar** — Customizable profiles with avatar upload (MIME whitelist, 5 MB cap) and match history
- **Reconnection** — Automatic rejoin on disconnect with full state recovery via grace period timer
- **Shared Type Safety** — Monorepo `shared/` package with typed Socket.io events and API contracts
- **Comprehensive Testing** — Unit and integration tests with Vitest, Supertest, Testing Library, and Testcontainers

---

## Live Demo

[🚀 View Live Demo](https://multiplayer-game-backend-nu.vercel.app/)

> **Note:** The backend runs on Render's free tier — the first request after idle may take 30–60 seconds to cold-start. Use the `/api/health` endpoint to warm up the service.

---

## Screenshots

All screenshots are captured from the [live deployment](https://multiplayer-game-backend-nu.vercel.app/).

<table>
  <tr>
    <td align="center" width="33%">
      <a href="./assets/screenshots/landing.png"><img src="./assets/screenshots/landing.png" alt="Landing" /></a>
      <sub><b>Landing</b><br/>Hero with Create Room, Join & Quick Match</sub>
    </td>
    <td align="center" width="33%">
      <a href="./assets/screenshots/login.png"><img src="./assets/screenshots/login.png" alt="Login" /></a>
      <sub><b>Login</b><br/>JWT-based authentication form</sub>
    </td>
    <td align="center" width="33%">
      <a href="./assets/screenshots/register.png"><img src="./assets/screenshots/register.png" alt="Register" /></a>
      <sub><b>Register</b><br/>Account creation with validation</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <a href="./assets/screenshots/home-lobby.png"><img src="./assets/screenshots/home-lobby.png" alt="Home Lobby" /></a>
      <sub><b>Home Lobby</b><br/>Authenticated view with game options</sub>
    </td>
    <td align="center" width="33%">
      <a href="./assets/screenshots/game-room.png"><img src="./assets/screenshots/game-room.png" alt="Game Room" /></a>
      <sub><b>Game Room</b><br/>Player list, room code & live chat</sub>
    </td>
    <td align="center" width="33%">
      <a href="./assets/screenshots/leaderboard.png"><img src="./assets/screenshots/leaderboard.png" alt="Leaderboard" /></a>
      <sub><b>Leaderboard</b><br/>Global rankings with game filter</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <a href="./assets/screenshots/guest-entry.png"><img src="./assets/screenshots/guest-entry.png" alt="Guest Entry" /></a>
      <sub><b>Guest Entry</b><br/>Instant play without registration</sub>
    </td>
    <td align="center" width="33%">
      <a href="./assets/screenshots/profile.png"><img src="./assets/screenshots/profile.png" alt="Profile" /></a>
      <sub><b>Profile</b><br/>User stats, avatar & match history</sub>
    </td>
    <td align="center" width="33%">
      <a href="./assets/screenshots/card-game-select.png"><img src="./assets/screenshots/card-game-select.png" alt="Card Game" /></a>
      <sub><b>Card Game</b><br/>4-player card game selection</sub>
    </td>
  </tr>
</table>

---

## Architecture

A high-level visual map of the system. Both diagrams render natively on GitHub thanks to Mermaid support.

### Domain Model

How the core entities relate to each other and how real-time delivery fans out.

```mermaid
graph LR
  User(("User"))
  Room(["Room"])
  Match(["Match"])
  GameState(["GameState"])
  Chat(["Chat Message"])
  Leaderboard(["Leaderboard"])

  User -- "creates / joins" --> Room
  Room -- "starts" --> GameState
  GameState -- "produces" --> Match
  User -- "plays" --> Match
  Match -- "updates" --> Leaderboard
  User -- "sends" --> Chat
  Chat -- "belongs to" --> Room
  User -- "spectates" --> Room
  User -. "reconnects to" .-> Room
```

### Request Lifecycle

How a single browser action travels through the stack.

```mermaid
flowchart LR
  Browser["React 19 SPA<br/>(Vite 8 + Tailwind 4)"]
  API["Express 5 API<br/>(REST + JWT)"]
  WS["Socket.io 4<br/>(typed events)"]
  DB[("PostgreSQL<br/>Neon + Drizzle")]
  Cache[("Redis<br/>rooms, queues, TTL")]

  Browser -- "Axios + JWT (Bearer)" --> API
  Browser <-. "WebSocket (JWT handshake)" .-> WS
  API --> DB
  API -- "read/write sessions" --> Cache
  WS -- "room state, matchmaking" --> Cache
  WS -. "game:state-updated" .-> Browser
  API -- "match results" --> DB
```

---

## Technologies

### Frontend

- **React 19**: Modern UI library with hooks, context, and concurrent features
- **Vite 8**: Lightning-fast build tool and HMR dev server
- **TypeScript 6**: Full type safety across the entire codebase
- **Tailwind CSS 4**: Utility-first CSS framework for rapid styling
- **Socket.io Client 4**: Real-time bidirectional communication with typed events
- **React Router DOM 7**: Client-side routing with protected and role-based guards
- **Axios**: HTTP client with JWT interceptor for REST API calls
- **Lucide React**: Beautiful, consistent icon set
- **React Hot Toast**: Lightweight toast notifications
- **Vitest + Testing Library + MSW**: Unit testing with mock service worker

### Backend

- **Node.js 20 LTS**: Server-side JavaScript runtime
- **Express 5**: Minimal and flexible web application framework
- **TypeScript 6**: Compile-time type safety for the entire server
- **Socket.io 4**: Real-time WebSocket server with room management
- **Drizzle ORM 0.45**: Type-safe SQL ORM with migration support
- **PostgreSQL (Neon)**: Serverless Postgres with JSONB stats storage
- **Redis (ioredis)**: In-memory store for rooms, matchmaking queues, and TTL sessions
- **JWT (jsonwebtoken)**: Stateless authentication with guest and registered tokens
- **bcryptjs**: Secure password hashing (12 rounds)
- **Helmet**: Safe HTTP headers by default
- **express-rate-limit**: Separate limiters for global, auth, admin, and upload routes
- **express-validator**: Input validation and XSS sanitization
- **Multer**: File upload handling with MIME whitelist
- **Pino**: Structured JSON logging with pino-http
- **Swagger UI Express**: Interactive API documentation
- **Vitest + Supertest + Testcontainers**: Integration testing with real Postgres containers

### Shared

- **@mpg/shared**: Monorepo package with TypeScript types for auth, user, room, games, match, events, and API contracts — ensuring compile-time safety across client and server

---

## Roles & Permissions

| Role   | Create Room | Play | Spectate | Chat | Matchmaking | Leaderboard | Admin Panel |
| ------ | ----------- | ---- | -------- | ---- | ----------- | ----------- | ----------- |
| Guest  | yes         | yes  | yes      | yes  | yes         | no          | no          |
| Player | yes         | yes  | yes      | yes  | yes         | yes         | no          |
| Admin  | yes         | yes  | yes      | yes  | yes         | yes         | yes         |

---

## Installation

### Prerequisites

- **Node.js** v20 LTS or higher
- **PostgreSQL** — [Neon](https://neon.tech) (free tier) or local instance
- **Redis** — local (`redis-server`) or cloud provider (Upstash, Redis Cloud)
- **Git**

### Local Development

**1. Clone the repository:**

```bash
git clone https://github.com/Serkanbyx/s5.1_Multiplayer-Game-Backend.git
cd s5.1_Multiplayer-Game-Backend
```

**2. Set up environment variables:**

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**server/.env**

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multiplayer_game
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace_with_a_secret_of_at_least_32_chars
JWT_EXPIRES_IN=7d
GUEST_JWT_EXPIRES_IN=2h
CLIENT_ORIGIN=http://localhost:5173
ROOM_TTL_SECONDS=7200
MATCHMAKING_TTL_SECONDS=300
BCRYPT_SALT_ROUNDS=12
UPLOAD_MAX_BYTES=5242880
LOG_LEVEL=debug
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password_here
```

**client/.env**

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**3. Install dependencies:**

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install

# Shared types
cd ../shared && npm install
```

**4. Set up the database:**

```bash
cd server

# Generate migration files (if schema changed)
npm run db:generate

# Run migrations
npm run db:migrate

# Seed admin user
npm run seed:admin
```

**5. Run the application:**

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

---

## Usage

1. **Register** a new account or **continue as guest** for instant play
2. **Create a room** by selecting a game type (Tic-Tac-Toe or Card Game) and visibility (public/private)
3. **Share the room code** with a friend or wait for someone to join
4. **Game starts automatically** as soon as the room is full (no ready/start handshake)
5. **Play in real time** — moves, turn indicators, and timers are synchronized via WebSocket
6. **Chat** with your opponent during the game using the built-in chat panel
7. **Request a rematch** after the game ends or return to lobby
8. **Check the leaderboard** for global rankings (registered users only)
9. **Customize your profile** with an avatar, bio, and privacy preferences
10. **Admins** can manage users, monitor rooms, and view match history from the admin panel

---

## How It Works?

### Authentication Flow

The server supports two authentication modes: **registered** (email + password → JWT, 7-day expiry) and **guest** (anonymous → short-lived JWT, 2-hour expiry). Tokens are stored in `localStorage` on the client and sent as `Authorization: Bearer <token>` for REST calls. Socket.io connections authenticate via the `auth.token` handshake option, verified by `authSocket` middleware before any event handler fires.

```typescript
// Client-side Axios interceptor (simplified)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Real-Time Game Architecture

Each game room is backed by a Redis hash with a configurable TTL. When a player emits `game:action`, the server validates ownership and turn order, delegates to the appropriate `GameEngine` (resolved via `GameFactory`), updates the Redis state, and broadcasts `game:state-updated` to all room members. When the game ends, a `Match` record is persisted to PostgreSQL with JSONB player stats.

### Reconnection Strategy

On disconnect, the server starts a grace period timer. The player's `user:room:{userId}` mapping in Redis is preserved. When the client auto-reconnects with the same JWT, `authSocket` re-verifies the token, looks up the room mapping, re-joins the Socket.io room, cancels the grace timer, and emits the full room state back to the player.

---

## API Endpoints

### Auth — `/api/auth`

| Method   | Endpoint               | Auth       | Description                         |
| -------- | ---------------------- | ---------- | ----------------------------------- |
| `POST`   | `/api/auth/register`   | —          | Register a new user account         |
| `POST`   | `/api/auth/login`      | —          | Login with email & password         |
| `POST`   | `/api/auth/guest`      | —          | Login as a guest user               |
| `GET`    | `/api/auth/me`         | Registered | Get authenticated user info         |
| `PUT`    | `/api/auth/me`         | Registered | Update profile (displayName, bio)   |
| `PUT`    | `/api/auth/me/password`| Registered | Change password                     |
| `DELETE` | `/api/auth/me`         | Registered | Delete account (requires password)  |

### Users — `/api/users`

| Method   | Endpoint                          | Auth       | Description                                 |
| -------- | --------------------------------- | ---------- | ------------------------------------------- |
| `GET`    | `/api/users/me`                   | Registered | Get own detailed profile                    |
| `PATCH`  | `/api/users/me`                   | Registered | Update own profile                          |
| `POST`   | `/api/users/me/avatar`            | Registered | Upload avatar image                         |
| `DELETE` | `/api/users/me/avatar`            | Registered | Remove avatar                               |
| `PATCH`  | `/api/users/me/preferences`       | Registered | Update privacy/notification preferences     |
| `GET`    | `/api/users/:username`            | Optional   | Get public profile by username              |
| `GET`    | `/api/users/:username/matches`    | Optional   | Get user's match history (paginated)        |

### Matches — `/api/matches`

| Method | Endpoint            | Auth     | Description                                |
| ------ | ------------------- | -------- | ------------------------------------------ |
| `GET`  | `/api/matches`      | Optional | List recent matches (paginated, filterable)|
| `GET`  | `/api/matches/:id`  | Optional | Get match details by ID                    |

### Leaderboard — `/api/leaderboard`

| Method | Endpoint              | Auth     | Description                        |
| ------ | --------------------- | -------- | ---------------------------------- |
| `GET`  | `/api/leaderboard`    | Optional | Get global leaderboard (paginated) |

### Admin — `/api/admin`

| Method   | Endpoint                         | Auth  | Description                      |
| -------- | -------------------------------- | ----- | -------------------------------- |
| `GET`    | `/api/admin/stats`               | Admin | Get dashboard statistics         |
| `GET`    | `/api/admin/users`               | Admin | List all users (search, paginate)|
| `GET`    | `/api/admin/users/:id`           | Admin | Get user details by ID           |
| `PATCH`  | `/api/admin/users/:id/role`      | Admin | Update user role                 |
| `DELETE` | `/api/admin/users/:id`           | Admin | Delete a user                    |
| `GET`    | `/api/admin/rooms`               | Admin | List active rooms                |
| `DELETE` | `/api/admin/rooms/:roomCode`     | Admin | Force-close a room               |
| `GET`    | `/api/admin/matches`             | Admin | List recent matches (admin view) |

### Health

| Method | Endpoint       | Auth | Description                      |
| ------ | -------------- | ---- | -------------------------------- |
| `GET`  | `/api/health`  | —    | Health check (DB + Redis status) |

> All authenticated endpoints require `Authorization: Bearer <token>` header.

---

## Socket Events

### Client → Server

| Event                  | Payload                      | Description                  |
| ---------------------- | ---------------------------- | ---------------------------- |
| `room:create`          | `{ gameType, isPrivate }`    | Create a new game room       |
| `room:join`            | `{ roomCode, asSpectator? }` | Join an existing room        |
| `room:leave`           | —                            | Leave the current room       |
| `room:spectate`        | `{ roomCode }`               | Join room as spectator       |
| `game:action`          | `GameAction`                 | Submit a game move           |
| `game:rematch-request` | —                            | Request a rematch            |
| `game:rematch-accept`  | —                            | Accept rematch request       |
| `game:rematch-decline` | —                            | Decline rematch request      |
| `chat:message`         | `{ message }`                | Send a chat message          |
| `matchmaking:join`     | `{ gameType }`               | Enter matchmaking queue      |
| `matchmaking:leave`    | —                            | Leave matchmaking queue      |

### Server → Client

| Event                    | Payload                                        | Description                  |
| ------------------------ | ---------------------------------------------- | ---------------------------- |
| `room:updated`           | `Room`                                         | Full room state update       |
| `room:player-joined`     | `RoomPlayer`                                   | A player joined the room     |
| `room:player-left`       | `{ playerId, newHostId? }`                     | A player left the room       |
| `room:kicked`            | `{ reason }`                                   | You were kicked from the room|
| `room:closed`            | —                                              | The room has been closed     |
| `game:started`           | `{ roomCode, gameState }`                      | Game has started             |
| `game:state-updated`     | `{ roomCode, gameState }`                      | Game state changed           |
| `game:turn`              | `{ roomCode, currentPlayerId }`                | It's someone's turn          |
| `game:ended`             | `{ roomCode, result, winnerId, … }`            | Game finished                |
| `game:rematch-requested` | `{ userId, votes }`                            | Someone requested rematch    |
| `game:rematch-accepted`  | `{ userId, votes }`                            | Someone accepted rematch     |
| `game:rematch-declined`  | `{ userId }`                                   | Someone declined rematch     |
| `game:timer-update`      | `{ playerId, remainingMs }`                    | Turn timer tick              |
| `chat:message`           | `{ senderId, senderName, message, timestamp }` | Chat message received        |
| `chat:system`            | `{ message, timestamp }`                       | System announcement          |
| `matchmaking:searching`  | `{ gameType, estimatedWait }`                  | Entered matchmaking queue    |
| `matchmaking:found`      | `{ roomCode }`                                 | Match found, room created    |
| `matchmaking:cancelled`  | —                                              | Matchmaking cancelled        |
| `user:online-status`     | `{ userId, isOnline }`                         | User online/offline update   |
| `error`                  | `{ message, code? }`                           | Error notification           |

---

## Project Structure

A clean monorepo layout with an explicit backend / frontend / shared split. Each panel below is collapsible — expand the one you care about.

<details open>
<summary><b>Server</b> — Express 5 + Socket.io API</summary>

```
server/
├── src/
│   ├── config/          # env validation, redis, corsOptions
│   ├── controllers/     # auth, user, admin, match, leaderboard
│   ├── db/              # Drizzle client, migrate script
│   │   └── schema/      # Drizzle table definitions
│   ├── games/           # BaseGame, TicTacToe, CardGame, GameFactory
│   ├── middleware/      # auth, errorHandler, rateLimiters, sanitize, upload, validate
│   ├── routes/          # auth, user, admin, match, leaderboard routes
│   ├── seed/            # seedAdmin script
│   ├── services/        # roomService, matchService, matchmakingService, userService
│   ├── socket/          # io setup, authSocket, room/game/chat/matchmaking/disconnect handlers
│   ├── types/           # express.d.ts augmentation
│   ├── utils/           # logger, apiResponse, constants, generateRoomCode, escapeHtml…
│   ├── validators/      # auth, user, admin, match, leaderboard, socket validators
│   ├── __fixtures__/    # test fixtures (matches, tokens, players)
│   ├── __tests__/       # integration tests (auth, room, game, chat, matchmaking…)
│   └── server.ts        # Express + Socket.io bootstrap
├── drizzle/             # generated SQL migration files
├── .env.example
├── package.json
└── tsconfig.json
```

</details>

<details>
<summary><b>Client</b> — React 19 + Vite 8 SPA</summary>

```
client/
├── src/
│   ├── api/             # Axios instance, authService, userService, matchService…
│   ├── components/
│   │   ├── game/        # ChatPanel, PlayerList, SpectatorList, RematchPrompt, TurnIndicator…
│   │   ├── games/       # TicTacToeBoard, CardGameTable
│   │   ├── guards/      # ProtectedRoute, AdminRoute, GuestOnlyRoute, RegisteredOnlyRoute
│   │   ├── layout/      # Navbar, MainLayout, AdminLayout, SettingsLayout, Footer
│   │   ├── profile/     # ProfileHeader, GameStatsCard, MatchList
│   │   ├── system/      # ConnectionBanner
│   │   └── ui/          # Button, Input, Modal, Card, Badge, Spinner, Avatar, Tooltip…
│   ├── context/         # AuthContext, SocketContext, PreferencesContext
│   ├── hooks/           # useSocketEvent, useLocalStorage, useDebounce, useSounds…
│   ├── pages/
│   │   ├── admin/       # AdminDashboard, AdminUsers, AdminMatches, AdminRooms
│   │   ├── settings/    # Profile, Account, Privacy, Notification, Appearance
│   │   ├── HomePage, LoginPage, RegisterPage, GuestEntryPage
│   │   ├── GameRoomPage, LeaderboardPage
│   │   ├── MyProfilePage, PublicProfilePage
│   │   └── NotFoundPage
│   ├── socket/          # socket instance, typed events
│   ├── utils/           # cn, constants, helpers, formatDate, flipAnimation
│   ├── App.tsx          # Router & route definitions
│   └── main.tsx         # React entry point
├── .env.example
├── package.json
└── tsconfig.json
```

</details>

<details>
<summary><b>Repository root</b> — shared types, docs & governance</summary>

```
s5.1_Multiplayer-Game-Backend/
├── client/              # → see Client panel above
├── server/              # → see Server panel above
├── shared/
│   └── types/           # auth, user, room, games, match, events, api contracts
├── docs/
│   └── build-guide.md   # step-by-step development guide
├── assets/
│   └── screenshots/     # README screenshots
├── .github/
│   ├── ISSUE_TEMPLATE/  # bug report & feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODE_OF_CONDUCT.md
│   ├── CONTRIBUTING.md
│   └── SECURITY.md
├── LICENSE              # PolyForm Noncommercial 1.0.0
└── README.md
```

</details>

---

## Security

- **Mass Assignment Protection** — Controllers destructure only allowed fields; no `req.body` spread
- **Role Protection** — `role` field not settable via public endpoints; only admin can change roles
- **User Enumeration Prevention** — Identical error messages for wrong email vs. wrong password
- **Password Security** — bcrypt hashing (12 rounds), `select: false`, change requires current password
- **JWT Hardening** — Secret length ≥ 32 chars enforced in production; guest tokens TTL ≤ 2 h
- **Rate Limiting** — Separate limiters for global, auth, admin, and upload routes
- **Helmet** — Default safe HTTP headers enabled
- **CORS** — Strict specific origin from `CLIENT_ORIGIN`; never `*` in production
- **Body Size Limits** — `express.json({ limit: '10kb' })`, Socket.io `maxHttpBufferSize: 1e5`
- **SQL Injection Prevention** — Drizzle ORM + parameterized queries; zero raw string interpolation
- **Prototype Pollution Protection** — `sanitizeMiddleware` strips `__proto__` / `constructor` / `prototype` keys
- **XSS Protection** — `escape()` via express-validator on all user text inputs
- **ReDoS Prevention** — `escapeRegex` used on all regex-based user searches
- **Ownership Checks** — Game actions verify socket user is a current player
- **Spectator Restrictions** — Spectators blocked from game actions; hidden info (card hands) not exposed
- **Admin Self-Protection** — Cannot delete self, cannot change own role, last-admin guard
- **Pagination Clamping** — `limit ≤ 100` (leaderboard), `≤ 50` (matches/users)
- **File Upload Safety** — MIME whitelist (jpeg/png/webp), 5 MB cap, server-generated filenames
- **Error Handler** — Never exposes stack traces or internal paths in production
- **Privacy Controls** — `showStats` and `showOnLeaderboard` preferences enforced server-side
- **`x-powered-by` Disabled** — Express default header removed
- **No Secret Logging** — No `console.log` of tokens, hashes, or PII in production
- **Typed Sockets** — `Server<ClientToServerEvents, ServerToClientEvents>` ensures payload safety at compile time

---

## Deployment

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository and set the root directory to `server/`
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add the following environment variables:

| Variable                  | Value                              |
| ------------------------- | ---------------------------------- |
| `NODE_ENV`                | `production`                       |
| `PORT`                    | `5000`                             |
| `DATABASE_URL`            | Your Neon Postgres connection string |
| `REDIS_URL`               | Your Redis cloud connection string |
| `JWT_SECRET`              | A random string ≥ 32 characters    |
| `JWT_EXPIRES_IN`          | `7d`                               |
| `GUEST_JWT_EXPIRES_IN`    | `2h`                               |
| `CLIENT_ORIGIN`           | Your Vercel deployment URL         |
| `ROOM_TTL_SECONDS`        | `7200`                             |
| `MATCHMAKING_TTL_SECONDS` | `300`                              |
| `BCRYPT_SALT_ROUNDS`      | `12`                               |
| `UPLOAD_MAX_BYTES`        | `5242880`                          |

> After deploy, run `npm run db:migrate` and `npm run seed:admin` via Render Shell.

### Frontend — Vercel

1. Import the repository on [Vercel](https://vercel.com)
2. Set the root directory to `client/`
3. Framework preset: **Vite**
4. Add the following environment variables:

| Variable          | Value                                |
| ----------------- | ------------------------------------ |
| `VITE_API_URL`    | `https://your-render-service.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://your-render-service.onrender.com`     |

### Database — Neon

Use [Neon](https://neon.tech) serverless Postgres (free tier). Copy the connection string (with `?sslmode=require`) to `DATABASE_URL`.

### Redis — Cloud Provider

Use a managed Redis provider ([Upstash](https://upstash.com), [Redis Cloud](https://redis.com/cloud/), etc.). Copy the connection string to `REDIS_URL`.

---

## Environment Variables

### Server (`server/.env`)

| Variable                  | Description                                    | Default                  |
| ------------------------- | ---------------------------------------------- | ------------------------ |
| `NODE_ENV`                | Environment (`development` / `production` / `test`) | `development`       |
| `PORT`                    | Server port                                    | `5000`                   |
| `DATABASE_URL`            | PostgreSQL connection string                   | —                        |
| `REDIS_URL`               | Redis connection string                        | `redis://localhost:6379` |
| `JWT_SECRET`              | JWT signing secret (≥ 32 chars in prod)        | —                        |
| `JWT_EXPIRES_IN`          | JWT token expiry                               | `7d`                     |
| `GUEST_JWT_EXPIRES_IN`    | Guest token expiry                             | `2h`                     |
| `CLIENT_ORIGIN`           | Allowed CORS origin                            | `http://localhost:5173`  |
| `ROOM_TTL_SECONDS`        | Room TTL in Redis                              | `7200`                   |
| `MATCHMAKING_TTL_SECONDS` | Matchmaking queue TTL                          | `300`                    |
| `BCRYPT_SALT_ROUNDS`      | bcrypt hash rounds                             | `12`                     |
| `UPLOAD_MAX_BYTES`        | Max avatar upload size                         | `5242880`                |
| `LOG_LEVEL`               | Pino log level                                 | `debug`                  |
| `ADMIN_USERNAME`           | Initial admin username                         | `admin`                  |
| `ADMIN_EMAIL`             | Initial admin email                            | —                        |
| `ADMIN_PASSWORD`          | Initial admin password                         | —                        |

### Client (`client/.env`)

| Variable          | Description                | Default                      |
| ----------------- | -------------------------- | ---------------------------- |
| `VITE_API_URL`    | Server REST API base URL   | `http://localhost:5000/api`  |
| `VITE_SOCKET_URL` | Server WebSocket URL       | `http://localhost:5000`      |

---

## Testing

The project includes comprehensive test suites for both server and client.

```bash
# Server unit tests
cd server && npm run test:run

# Server integration tests (requires Docker for Testcontainers)
npm run test:integration

# All server tests
npm run test:all

# Client unit tests
cd client && npm run test:run

# Coverage report
npm run test:coverage
```

**Server tests cover:** authentication, room management, game logic, chat, matchmaking, spectator mode, disconnect/reconnect, security, admin operations, and guest flows.

**Client tests cover:** component rendering, user interactions, and API service mocking via MSW.

---

## Troubleshooting

### Render Cold Start

Render free-tier services spin down after inactivity. The first request after idle may take 30–60 seconds. Use the `/api/health` endpoint to warm up the service, or upgrade to a paid plan for always-on.

### Redis Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

Make sure Redis is running locally (`redis-server`) or your `REDIS_URL` points to a valid cloud instance. On Windows, consider using WSL or Docker for Redis.

### JWT Secret Too Short

```
Error: JWT_SECRET must be at least 32 characters in production
```

The server enforces a minimum secret length in production. Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Database Connection Failed

Verify your `DATABASE_URL` is correct and the Postgres instance is accessible. For Neon, ensure the connection string includes `?sslmode=require`.

### Port Already in Use

```
Error: listen EADDRINUSE :::5000
```

Another process is using port 5000. Kill it or change the `PORT` in your `.env`.

### Socket.io CORS Error

Ensure `CLIENT_ORIGIN` in your server `.env` exactly matches the client URL (including protocol and port). No trailing slash.

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](.github/CONTRIBUTING.md) before submitting a pull request.

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes using semantic messages
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Message Format

| Prefix      | Description                        |
| ----------- | ---------------------------------- |
| `feat:`     | New feature                        |
| `fix:`      | Bug fix                            |
| `refactor:` | Code refactoring                   |
| `docs:`     | Documentation changes              |
| `style:`    | Code style changes (formatting)    |
| `test:`     | Adding or updating tests           |
| `chore:`    | Maintenance and dependency updates |

---

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — Free for non-commercial use. See [LICENSE](./LICENSE) for details.

---

## Developer

**Serkanby**

- 🌐 Website: [serkanbayraktar.com](https://serkanbayraktar.com/)
- 🐙 GitHub: [@Serkanbyx](https://github.com/Serkanbyx)
- 📧 Email: [serkanbyx1@gmail.com](mailto:serkanbyx1@gmail.com)

---

## Acknowledgments

- [Socket.io](https://socket.io/) — Real-time engine powering the multiplayer experience
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe SQL toolkit for PostgreSQL
- [Neon](https://neon.tech/) — Serverless Postgres hosting
- [Render](https://render.com/) — Backend hosting platform
- [Vercel](https://vercel.com/) — Frontend deployment platform
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Lucide](https://lucide.dev/) — Beautiful icon set

---

## Contact

- [Open an Issue](https://github.com/Serkanbyx/s5.1_Multiplayer-Game-Backend/issues)
- Email: [serkanbyx1@gmail.com](mailto:serkanbyx1@gmail.com)
- Website: [serkanbayraktar.com](https://serkanbayraktar.com/)

---

⭐ If you like this project, don't forget to give it a star!
