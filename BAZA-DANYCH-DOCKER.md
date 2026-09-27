# CubeVerse — prawdziwa baza danych (PostgreSQL w Dockerze)

Poradnik przełącza backend z pliku SQLite (`dev.db`) na **PostgreSQL** działający
w kontenerze Docker. To ta sama baza, której użyjesz później na produkcji.

## Co już za Ciebie zrobiłem
- **`docker-compose.yml`** (katalog główny projektu) — PostgreSQL 16 + Adminer (panel WWW).
- **`server/prisma/schema.prisma`** — `provider` zmieniony z `sqlite` na `postgresql`.
- **`server/.env`** — nowy `DATABASE_URL` wskazujący na bazę w Dockerze
  (stary zapisany jako `server/.env.sqlite.bak`).
- **`server/.env.example`** — zaktualizowany wzór.

## Co musisz zrobić Ty (raz)
Usuń stare migracje SQLite — są niekompatybilne z PostgreSQL, a ja nie mogłem ich
skasować z tego środowiska. W eksploratorze plików skasuj **cały folder**:
```
server/prisma/migrations
```
(jeśli pojawił się też `server/prisma/migrations_sqlite_backup` — jego również).
Plik `server/prisma/dev.db` możesz zostawić lub usunąć, nie jest już używany.

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
npx prisma generate      # generuje klienta na nowo (provider = postgresql)
npx prisma db push       # tworzy tabele w Postgresie wg schema.prisma
```
`db push` to najprostsza droga w dev — synchronizuje schemat z bazą **bez plików
migracji**. (Alternatywa produkcyjna niżej.)

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
> (nie commituj `.env` do repo — dodaj go do `.gitignore`).

---

## Migracje „na poważnie" (opcjonalnie, zamiast `db push`)
`db push` jest świetny w dev, ale nie zapisuje historii zmian schematu. Gdy zechcesz
wersjonować zmiany (i wdrażać je na produkcję), użyj migracji:
```bash
# w server/ — najpierw skasuj stary folder migrations (patrz wyżej)
npx prisma migrate dev --name init
```
Prisma utworzy świeży folder `migrations/` już pod PostgreSQL. Na serwerze
produkcyjnym stosuje się potem `npx prisma migrate deploy`.

---

## Najczęstsze problemy
- **`Can't reach database server at localhost:5432`** — Docker Desktop nie jest
  uruchomiony albo kontener nie wstał. Sprawdź `docker compose ps`.
- **`port 5432 already in use`** — masz już lokalnego Postgresa. W `docker-compose.yml`
  zmień mapowanie na `"5433:5432"` i w `DATABASE_URL` port na `5433`.
- **`P3018 / provider mismatch` przy migrate** — nie usunąłeś starego folderu
  `migrations` (z lockiem `sqlite`). Skasuj go i spróbuj ponownie.
- **Zmiany w `schema.prisma` nie widać** — po każdej zmianie schematu:
  `npx prisma generate` + `npx prisma db push` (lub `migrate dev`).

---

## A hosting?
Ta baza jest **lokalna** (na Twoim komputerze). InfinityFree jej nie obsłuży
(brak Node.js i Postgresa). Gdy zechcesz wystawić pełną aplikację online z tą bazą,
potrzebny jest hosting z Node.js + PostgreSQL — np. Render, Railway, Fly.io albo VPS.
Wtedy zmienia się tylko `DATABASE_URL` na adres bazy w chmurze; reszta zostaje.
