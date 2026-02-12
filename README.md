# Minicord (MVP local amélioré)

Application de messagerie minimaliste type Discord, auto-hébergée localement, orientée **dark/night only**.

## Stack
- Backend: Node.js, TypeScript, Express, Socket.IO, PostgreSQL, Redis, JWT
- Frontend: React + Vite (UI dark premium)

## Fonctionnalités actuelles
- Authentification email + mot de passe (Argon2)
- Inscription: pseudo, identifiant (`username`), email, mot de passe, avatar
- Profil utilisateur (`/api/users/me`) + recherche utilisateur (`/api/users/search`)
- Messages temps réel via WebSocket avec persistance SQL
- Historique persistant avec pagination (`before`)
- DM + groupes (création + ajout/retrait membre + liste de mes groupes)
- Contrôles d’accès backend sur messages (participant DM ou membre du groupe)
- Présence Redis (`online`, `offline`, `in_call`) + signalisation vocale simplifiée
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
- `GET /api/users/me`
- `GET /api/users/search?q=...`
- `GET /api/groups/mine`
- `POST /api/groups`
- `POST /api/groups/:groupId/members`
- `DELETE /api/groups/:groupId/members/:userId`
- `POST /api/messages`
- `GET /api/messages/:targetType/:targetId?before=<ISO_DATE>`

## Signalisation WebSocket
- `join:dm` (reçoit l'ID utilisateur pair, room DM normalisée côté serveur)
- `join:group`
- `message:send`
- `message:new`
- `voice:state`

## Workflow Git recommandé
- Créer une branche de fonctionnalité: `git checkout -b <type>/<sujet>`
- Commiter avec message clair: `git commit -m "feat: ..."`
- Pousser vers GitHub: `git push -u origin <branche>`

