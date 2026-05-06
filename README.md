# Multiplayer Game Backend

Real-time multiplayer oyun platformu. TypeScript tabanlı monorepo: Express + Socket.io backend, React + Vite frontend.

## Proje Yapısı

```
multiplayer-game/
├── server/    # Node.js + Express + Socket.io backend
├── client/    # React + Vite frontend
├── shared/    # Ortak TypeScript tipleri
└── README.md
```

## Başlangıç

### Gereksinimler

- Node.js 18+
- MongoDB
- Redis

### Kurulum

```bash
# Server bağımlılıkları
cd server && npm install

# Client bağımlılıkları
cd client && npm install
```

### Çalıştırma

```bash
# Server (development)
cd server && npm run dev

# Client (development)
cd client && npm run dev
```
