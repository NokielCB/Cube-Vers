# 🧊 CubeVerse

Aplikacja webowa dla speedcuberów: **timer z historią i statystykami, biblioteka algorytmów (OLL/PLL) z wizualizacją 3D, trening algorytmów oraz pojedynki online na żywo**. Działa w przeglądarce, także na telefonie.

> Projekt edukacyjny / portfolio. Kod jest obficie komentowany po polsku — tłumaczy *dlaczego*, nie tylko *co*.

## Funkcje

- **Timer** — generator scrambli, podgląd scrambla na kostce, historia ułożeń, sesje, statystyki (best, ao5, ao12…) i wykresy.
- **Biblioteka algorytmów** — wszystkie 57 OLL i pełne PLL, diagramy liczone symulatorem kostki, filtry, notatki i wybór „głównego" algorytmu per przypadek.
- **Trening algorytmów** — rekord osobisty per wariant, postęp nauki (statusy: uczę się / umiem…).
- **Syntax** — interaktywna ściąga notacji ruchów z animowaną kostką 3D.
- **Arena** — pojedynki 1 vs 1: lokalnie na jednym urządzeniu albo **online w czasie rzeczywistym** (WebSockety).
- **Konta i znajomi** — rejestracja, logowanie, lista znajomych, status online, wyzwania na pojedynek.
- **Tryb Gościa** — pełny timer i biblioteka bez konta (dane w `localStorage`); po rejestracji można zaimportować historię do chmury.
- **Osiągnięcia** i dashboard z postępami.

## Stack

| Warstwa | Technologie |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Three.js (`@react-three/fiber`, `drei`), Recharts, TanStack Query |
| Backend | Node.js, Express, Socket.io, Zod (walidacja), JWT w ciasteczku `httpOnly`, bcryptjs, Helmet |
| Baza | PostgreSQL + Prisma ORM (migracje w `server/prisma/migrations`) |

## Uruchomienie lokalne

Wymagania: **Node.js 18+** i **Docker** (dla bazy PostgreSQL).

```bash
# 1. Baza danych (PostgreSQL + panel Adminer na :8080)
docker compose up -d

# 2. Backend
cd server
cp .env.example .env        # potem wpisz własny JWT_SECRET (instrukcja w pliku)
npm install
npx prisma migrate deploy
npm run seed                # opcjonalnie: dane startowe
npm run dev                 # API + WebSocket na http://localhost:4000

# 3. Frontend (drugi terminal, katalog główny repo)
npm install
npm run dev                 # http://localhost:5173
```

Szczegóły bazy: [BAZA-DANYCH-DOCKER.md](BAZA-DANYCH-DOCKER.md).

## Struktura repozytorium

```
src/                 frontend (pages, components, hooks, lib — m.in. symulator kostki)
server/src/
  routes/ controllers/ services/   REST API (warstwy: trasa → kontroler → serwis)
  socket/                          pojedynki i obecność znajomych (Socket.io)
  validators/                      schematy Zod
  lib/ middleware/                 konfiguracja, CSRF/CORS, limiter logowania
server/prisma/       schemat bazy i migracje
render.yaml          konfiguracja wdrożenia (Render)
```

## Bezpieczeństwo (w skrócie)

- Sesja w ciasteczku `httpOnly` + `Secure` na produkcji (token niedostępny dla JavaScriptu).
- Ochrona CSRF przez sprawdzanie nagłówka `Origin` oraz CORS z listą zaufanych adresów.
- Limiter prób logowania, limity rozmiaru body, walidacja wejścia (Zod), nagłówki Helmet.
- Serwer **nie wystartuje** z przykładowym lub za krótkim `JWT_SECRET`.

## Wdrożenie (darmowe)

Backend wydaje też zbudowany frontend, więc całość to **jedna usługa** — bez CORS i problemów z ciasteczkami na Safari.

1. **Baza:** załóż darmowy projekt na [Neon](https://neon.tech) i skopiuj connection string.
2. **Render:** *New → Blueprint*, wskaż to repozytorium (plik `render.yaml`). Przy tworzeniu wklej `DATABASE_URL`. Build sam stosuje migracje.
3. Gotowe — adres `https://<nazwa>.onrender.com`.

Darmowy plan Rendera usypia usługę po ~15 min bez ruchu (pierwsze wejście trwa wtedy 30–60 s).

Alternatywa z podziałem: frontend na Vercel/Netlify (`vercel.json`), backend na Renderze; wtedy ustaw `VITE_API_URL`, `VITE_SOCKET_URL`, `CLIENT_ORIGIN` i `COOKIE_SAMESITE=none`.

## Licencja

Projekt prywatny / portfolio — wszelkie prawa zastrzeżone, o ile autor nie zdecyduje inaczej.
