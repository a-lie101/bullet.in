# bullet.in

A self-hosted personal kanban board. It's being built in phases: today it's a private board for your own tasks; next it pulls in GitHub issues assigned to you and AI-suggested action items from your email, Slack and GitHub mentions.

**Status:** Phase 1. Sign-in, a four-column board (To do, In progress, Blocked, Done) with drag-and-drop, and full create, edit and delete for your own cards.

## Quick start

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `SESSION_SECRET`: generate one with `openssl rand -hex 32`.
- `MONGODB_URI`: your MongoDB (Atlas or local). No MongoDB? Run `npm run db:dev` in a second terminal and use `mongodb://127.0.0.1:27017`. It keeps data in `.data/mongo` and downloads MongoDB (about 100 MB) the first time.

Then:

```bash
npm run dev
```

Open http://localhost:5180. The first visit asks you to create the owner account. After that, registration is closed unless you set `ALLOW_REGISTRATION=true`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API (port 3000) and web app (port 5180) with live reload |
| `npm run db:dev` | Local MongoDB for development |
| `npm test` | API tests against an in-memory MongoDB |
| `npm run typecheck` | Type-check the server and the web app |
| `npm run build` | Build both for production |
| `npm start` | Run the production build: one server on `PORT` serves the app and the API |

To run in production: `npm run build`, then `NODE_ENV=production npm start`. Behind a reverse proxy that handles HTTPS, also set `TRUST_PROXY=true`.

## Layout

```
src/           Express API (TypeScript)
  routes/      auth, cards, settings
  models/      User, Card
  auth/        password hashing (scrypt) and sessions (stored in MongoDB)
web/           React app (Vite)
  src/components/  Board, columns, cards, card dialog, sign-in
test/          API tests
scripts/       Development helpers
```

## Roadmap

1. ~~Foundation: sign-in, data model, kanban board~~
2. GitHub: issues assigned to you appear on the board automatically
3. AI sidebar: action items from Outlook (personal accounts first) and GitHub mentions, using Claude (Haiku by default; configurable)
4. Slack DMs and mentions as an AI source; work Microsoft 365 mailboxes
5. Self-host packaging (Docker Compose) and a setup guide
