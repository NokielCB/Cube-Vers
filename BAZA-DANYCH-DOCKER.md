# CubeVerse — prawdziwa baza danych (PostgreSQL w Dockerze)

Poradnik przełącza backend z pliku SQLite (`dev.db`) na **PostgreSQL** działający
w kontenerze Docker. To ta sama baza, której użyjesz później na produkcji.

## Co już za Ciebie zrobiłem
- **`docker-compose.yml`** (katalog główny projektu) — PostgreSQL 16 + Adminer (panel WWW).
- **`server/prisma/schema.prisma`** — `provider` zmieniony z `sqlite` na `postgresql`.
- **`server/.env`** — nowy `DATABASE_URL` wskazujący na bazę w Dockerze
  (stary zapisany jako `server/.env.sqlite.bak`).
- **`server/.env.example`** — zaktualizowany wzór.
- **`server/prisma/migrations/`** — stare migracje SQLite usunięte (zostały w historii
  gita, w pierwszym commicie). Na ich miejscu jest migracja bazowa **`0_init`** pod
  PostgreSQL, wygenerowana z `schema.prisma`. **Nie kasuj tego folderu** — to historia
  schematu bazy, commitowana razem z kodem.

Plik `server/prisma/dev.db` (stara baza SQLite) nie jest już używany — możesz go usunąć.

---

## Wymagania
- Zainstalowany **Docker Desktop** (masz) — musi być **uruchomiony** (ikona wieloryba w zasobniku).
- Node.js + zależności backendu zainstalowane: w `server/` wykonaj raz `npm install`.

---

## Krok po kroku

### 1. Uruchom bazę w Dockerze
W terminalu, w **katalogu głównym** projektu (tam gdzie `docker-compose.yml`):
```bash
docker compose up -d
```
- `-d` = w tle. Pierwszy raz Docker pobierze obrazy (chwilę potrwa).
- Sprawdź, że działa:
```bash
docker compose ps
```
Status `db` powinien być `healthy`.

### 2. Zbuduj klienta Prisma i utwórz tabele
W folderze **`server/`**:
```bash
npx prisma generate          # generuje klienta na nowo (provider = postgresql)
npx prisma migrate deploy    # tworzy tabele, wykonując migracje z prisma/migrations
```
`migrate deploy` wykonuje tylko te migracje, których baza jeszcze nie ma (historię
trzyma w tabeli `_prisma_migrations`). Na aktualnej bazie nic nie robi, więc można
go bezpiecznie powtarzać.

### 3. (Opcjonalnie) Wypełnij dane testowe
```bash
npm run seed
```
Tworzy 5 kont testowych, hasło dla wszystkich: `Test1234!`.

### 4. Uruchom backend
W `server/`:
```bash
npm run dev
```
Powinno wypisać: `🧊 CubeVerse API + WebSocket na http://localhost:4000`.

### 5. Uruchom frontend
W katalogu głównym (osobny terminal):
```bash
npm run dev
```
Wejdź na `http://localhost:5173` i zarejestruj konto — dane trafią już do PostgreSQL.

---

## Podgląd bazy (dwie opcje)

**Adminer** (uruchamia się z Dockerem): `http://localhost:8080`
- System: `PostgreSQL`
- Serwer: `db`
- Użytkownik: `cubeverse`
- Hasło: `cubeverse`
- Baza: `cubeverse`

**Prisma Studio** (z folderu `server/`):
```bash
npx prisma studio
```
Otworzy `http://localhost:5555` z wygodną tabelką do przeglądania rekordów.

---

## Codzienne komendy Dockera
| Cel | Komenda (katalog główny) |
|---|---|
| Start bazy | `docker compose up -d` |
| Stan / logi | `docker compose ps` / `docker compose logs -f db` |
| Stop (dane zostają) | `docker compose down` |
| **Reset** (kasuje wszystkie dane) | `docker compose down -v` |

Dane bazy żyją w wolumenie `cubeverse_pgdata`, więc przetrwają restart komputera
i `docker compose down`. Znikają dopiero przy `down -v`.

---

## Dane dostępowe (parametry połączenia)
```
Host:     localhost
Port:     5432
Użytkownik: cubeverse
Hasło:      cubeverse
Baza:       cubeverse
URL:  postgresql://cubeverse:cubeverse@localhost:5432/cubeverse?schema=public
```
> To dane do nauki/dev. Na produkcji ustaw mocne, losowe hasło i inny `JWT_SECRET`
> (`.env` jest w `.gitignore`, więc nie trafi do repo).

---

## Zmiany schematu bazy (migracje)
Schemat bazy jest wersjonowany **migracjami** — każda zmiana to folder w
`server/prisma/migrations/` z plikiem SQL, commitowany razem z kodem. Po zmianie
`schema.prisma`, w `server/`:
```bash
npx prisma migrate dev --name krotki_opis_zmiany
```
Prisma porówna schemat z bazą, zapisze nową migrację, wykona ją i wygeneruje klienta.
Na serwerze produkcyjnym stosuje się potem `npx prisma migrate deploy`.

> **Nie używaj już `db push`.** Zmienia bazę bez wpisu w historii migracji, więc przy
> następnym `migrate dev` Prisma wykryje rozjazd („drift") i zaproponuje
> **reset bazy, czyli utratę wszystkich danych**.

---

## Najczęstsze problemy
- **`❌ Niepoprawna konfiguracja serwera` przy starcie backendu** — w `server/.env`
  brakuje `JWT_SECRET` albo jest to przykładowa wartość z `.env.example` (serwer
  celowo nie startuje — z publicznym sekretem każdy mógłby podrobić logowanie).
  Wygeneruj własny: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
  i wklej jako `JWT_SECRET="..."`. Zmiana sekretu wylogowuje wszystkich.
- **`Can't reach database server at localhost:5432`** — Docker Desktop nie jest
  uruchomiony albo kontener nie wstał. Sprawdź `docker compose ps`.
- **`port 5432 already in use`** — masz już lokalnego Postgresa. W `docker-compose.yml`
  zmień mapowanie na `"5433:5432"` i w `DATABASE_URL` port na `5433`.
- **`Drift detected` i pytanie o reset przy `migrate dev`** — baza zmieniła się poza
  migracjami (np. przez `db push`). Jeśli zależy Ci na danych, **odpowiedz „nie"**.
  Tak było z tą bazą na starcie: tabele powstały przez `db push`, więc zamiast je
  odtwarzać, migrację bazową oznaczono jako wykonaną:
  `npx prisma migrate resolve --applied 0_init` (tylko gdy baza = `schema.prisma`).
- **Zmiany w `schema.prisma` nie widać** — po każdej zmianie schematu:
  `npx prisma migrate dev --name opis_zmiany` (zmienia bazę i generuje klienta).

---

## A hosting?
Ta baza jest **lokalna** (na Twoim komputerze). InfinityFree jej nie obsłuży
(brak Node.js i Postgresa). Gdy zechcesz wystawić pełną aplikację online z tą bazą,
potrzebny jest hosting z Node.js + PostgreSQL — np. Render, Railway, Fly.io albo VPS.
Wtedy zmienia się tylko `DATABASE_URL` na adres bazy w chmurze; reszta zostaje.
