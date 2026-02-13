# Minicord

Minimal local self-hosted messaging app inspired by Discord, with a dark-only UI and real-time chat.

## 🚀 Installation

### Prerequisites
- Node.js 18+
- Docker + Docker Compose
- PostgreSQL 14+ (or via compose)
- Redis 7+ (or via compose)

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment files:
   ```bash
   cp .env.example backend/.env
   cp .env.example frontend/.env
   ```
3. Start infrastructure:
   ```bash
   docker compose up -d
   ```

## 📖 Usage
1. Run backend:
   ```bash
   npm run dev -w backend
   ```
2. Run frontend in another terminal:
   ```bash
   npm run dev -w frontend
   ```
3. Open `http://localhost:5173`.

## 🔌 API

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Users
- `GET /api/users/me`
- `GET /api/users/search?q=...`

### Groups
- `GET /api/groups/mine`
- `POST /api/groups`
- `POST /api/groups/:groupId/members`
- `DELETE /api/groups/:groupId/members/:userId`

### Messages
- `POST /api/messages`
- `PATCH /api/messages/:id`
- `DELETE /api/messages/:id`
- `POST /api/messages/:id/reactions`
- `GET /api/messages/search/query?q=...&conversationId=...&targetType=...`
- `GET /api/messages/:targetType/:targetId?cursor=...&limit=...`

### Upload
- `POST /api/upload`

### WebSocket events
- `voice:state` accepts optional `bitrateKbps` and clamps to backend max (`VOICE_MAX_BITRATE_KBPS`, default `124`).
- `join:dm`, `join:group`
- `message:send` -> `message:new`
- `message:update` -> `message:updated`
- `message:delete` -> `message:deleted`
- `reaction:add` -> `reaction:added`
- `typing` -> `user:typing`
- `presence:update`

## 🛠️ Tech stack
- Backend: Node.js, TypeScript, Express, Socket.IO
- Frontend: React, Vite, TypeScript
- Data: PostgreSQL + Redis
- Auth: JWT + Argon2

## ⚙️ Voice bitrate
- Max voice bitrate is configurable with `VOICE_MAX_BITRATE_KBPS` (default: `124`).

## 🔒 Security highlights
- Helmet and CORS restricted to `CLIENT_URL`.
- Global rate limiting on HTTP APIs.
- Strict Zod validation for payloads.
- Access token + Redis-backed refresh token flow.

## 🧪 Tests
- Backend type/perms tests: `npm run test -w backend`

## 📝 License
MIT (`LICENSE`).
