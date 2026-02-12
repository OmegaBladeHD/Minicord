# Minicord (MVP local)

Application de messagerie minimaliste type Discord, auto-hébergée localement.

## Stack
- Backend: Node.js, TypeScript, Express, Socket.IO, PostgreSQL, Redis, JWT
- Frontend: React + Vite

## Fonctionnel dans ce MVP
- Authentification email + mot de passe (Argon2)
- Inscription simple: pseudo, identifiant (`username`), email, mot de passe, avatar
- Messages temps réel via WebSocket avec persistance SQL
- DM + groupes (création + ajout membre)
- Pagination de messages côté API
- Présence Redis (`online`, `offline`, `in_call`)
- Permissions de groupe basées sur bitmask (modèle fourni)
- Rate limit pour endpoint messages

## Démarrage local
1. Installer dépendances:
   ```bash
   npm install
   ```
2. Démarrer Postgres + Redis:
   ```bash
   docker compose up -d
   ```
3. Copier les variables d'environnement:
   ```bash
   cp .env.example backend/.env
   ```
4. Lancer backend:
   ```bash
   npm run dev -w backend
   ```
5. Lancer frontend:
   ```bash
   npm run dev -w frontend
   ```

## Endpoints clés
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/groups`
- `POST /api/groups/:groupId/members`
- `POST /api/messages`
- `GET /api/messages/:targetType/:targetId?before=<ISO_DATE>`

## Signalisation WebSocket
- `join:dm` (`dm:{user1}:{user2}`)
- `join:group` (`group:{groupId}`)
- `message:send`
- `message:new`
- `voice:state`
