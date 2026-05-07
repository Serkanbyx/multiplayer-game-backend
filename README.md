# Multiplayer Game Backend

Real-time multiplayer oyun platformu. TypeScript tabanlı monorepo: Express + Socket.io backend, React + Vite frontend, paylaşılan tip katmanı.

## Tech Stack

- **Backend:** Node.js 20 · Express 5 · Socket.io 4 · TypeScript 5
- **Frontend:** React 19 · Vite · TypeScript · TailwindCSS v4
- **Database:** Neon (serverless PostgreSQL) + Drizzle ORM
- **Cache / Realtime State:** Redis (ioredis)
- **Auth:** JWT (registered + guest), bcryptjs
- **Deployment:** Render (backend, WebSocket destekli) · Vercel (frontend SPA) · Redis Cloud · Neon

## Proje Yapısı

```
multiplayer-game/
├── server/    # Node.js + Express + Socket.io backend
├── client/    # React + Vite frontend (Vercel deploy)
├── shared/    # Ortak TypeScript tipleri (wire contract)
├── STEPS.md   # Adım adım build rehberi
└── README.md
```

## Başlangıç

### Gereksinimler

- Node.js 20+
- PostgreSQL 16 (lokal Docker veya Neon dev branch)
- Redis 7 (lokal Docker veya Redis Cloud)

### Kurulum

```bash
# Server bağımlılıkları
cd server && npm install

# Client bağımlılıkları
cd ../client && npm install

# Shared tip paketi (workspace değilse type-check için)
cd ../shared && npm install
```

### Ortam Değişkenleri

```bash
# server/.env.example → server/.env
cp server/.env.example server/.env

# client/.env.example → client/.env
cp client/.env.example client/.env
```

`server/.env` içinde en azından `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` ve `CLIENT_ORIGIN` doldurulmalı.

### Veritabanı Hazırlığı

```bash
cd server
npm run db:generate   # şema değiştiyse migration üret
npm run db:migrate    # migration'ları uygula
```

### Çalıştırma

```bash
# Server (development, tsx watch)
cd server && npm run dev

# Client (development, Vite HMR)
cd client && npm run dev
```

## Deploy

- **Backend:** Render Web Service — WebSocket destekli plan, predeploy = `npm --prefix server run db:migrate`
- **Frontend:** Vercel — Root Directory `client/`, framework auto-detect (Vite). SPA rewrite + cache header'ları `client/vercel.json` ile commit edilmiştir
- **DB:** Neon Postgres — pooled connection string kullan (`-pooler` ön ekli)
- **Cache:** Redis Cloud free tier (30 MB)

Detaylı adımlar için `STEPS.md` (Step 55).

## Lisans

MIT
