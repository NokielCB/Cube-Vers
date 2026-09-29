# 🧊 CubeVerse

🇵🇱 [Wersja polska](README.pl.md)

A web app for speedcubers: **a timer with history and statistics, an OLL/PLL algorithm library with 3D visualisation, algorithm training, and live online duels**. Runs in the browser, phone included.

> Educational / portfolio project. The source is heavily commented (in Polish) and explains *why*, not just *what*.

## Features

- **Timer** – scramble generator, scramble preview on a cube, solve history, sessions, statistics (best, ao5, ao12…) and charts.
- **Algorithm library** – all 57 OLL and the full PLL set, case diagrams computed by a cube simulator, filters, notes, and a "primary algorithm" per case.
- **Algorithm training** – personal best per variant and learning progress (learning / known…).
- **Syntax** – an interactive notation cheat sheet with an animated 3D cube.
- **Arena** – 1v1 duels: locally on one device, or **online in real time** over WebSockets.
- **Accounts and friends** – sign-up, login, friend list, online presence, duel challenges.
- **Guest mode** – the full timer and library without an account (data kept in `localStorage`); after signing up you can import your history to the cloud.
- **Achievements** and a progress dashboard.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Three.js (`@react-three/fiber`, `drei`), Recharts, TanStack Query |
| Backend | Node.js, Express, Socket.io, Zod (validation), JWT in an `httpOnly` cookie, bcryptjs, Helmet |
| Database | PostgreSQL + Prisma ORM (migrations in `server/prisma/migrations`) |

## Running locally

Requirements: **Node.js 18+** and **Docker** (for PostgreSQL). For guest mode only, the frontend alone is enough.

```bash
# 1. Database (PostgreSQL + Adminer panel on :8080)
docker compose up -d

# 2. Backend
cd server
cp .env.example .env        # then set your own JWT_SECRET (instructions inside the file)
npm install
npx prisma migrate deploy
npm run seed                # optional: seed data
npm run dev                 # API + WebSocket on http://localhost:4000

# 3. Frontend (second terminal, repo root)
npm install
npm run dev                 # http://localhost:5173
```

Database details (in Polish): [BAZA-DANYCH-DOCKER.md](BAZA-DANYCH-DOCKER.md).

## Repository layout

```
src/                 frontend (pages, components, hooks, lib — incl. the cube simulator)
server/src/
  routes/ controllers/ services/   REST API (route → controller → service)
  socket/                          duels and friend presence (Socket.io)
  validators/                      Zod schemas
  lib/ middleware/                 config, CSRF/CORS, login rate limiter
server/prisma/       database schema and migrations
render.yaml          full deployment config (Render)
vercel.json          static frontend deployment config (Vercel)
```

## Security notes

- Session lives in an `httpOnly` cookie, `Secure` in production (the token is unreachable from JavaScript).
- CSRF protection by checking the `Origin` header, plus CORS with an allow-list.
- Login attempt rate limiter, request body size limits, input validation (Zod), Helmet headers.
- The server **refuses to start** with a placeholder or too-short `JWT_SECRET`.

## Deployment (free)

### Frontend only (e.g. to showcase the project)
The frontend is a plain static site, so it can be deployed with no backend and no database, e.g. on [Vercel](https://vercel.com) (*Add New → Project* → this repository → *Deploy*; `vercel.json` is ready) or Netlify / Cloudflare Pages (`npm run build`, output `dist`).

Without a backend, **guest mode** works (timer, algorithm library, training, Syntax, local duel – data in `localStorage`). Login, accounts, friends and online duels need the backend.

### Full version with accounts and online duels
The backend also serves the built frontend, so everything is **one service**, with no CORS and no cross-site cookie problems on Safari.

1. **Database:** a free [Neon](https://neon.tech) project (use the *direct* connection string).
2. **Render:** *New → Blueprint* → this repository (`render.yaml`), paste `DATABASE_URL`. The build applies migrations itself.

Render's free plan sleeps the service after ~15 minutes idle (the first hit takes 30–60 s).

## License

Private / portfolio project – all rights reserved unless the author decides otherwise.
