# CubeVerse — wgranie demo na InfinityFree

## Czy to możliwe?
**Tak — ale tylko część aplikacji (frontend).** InfinityFree to darmowy hosting
**PHP + MySQL**. Nie uruchamia **Node.js**, więc backend z folderu `server/`
(Express + Prisma + Socket.io: logowanie, konta w chmurze, znajomi, Arena online)
**nie zadziała** na InfinityFree.

Na potrzeby dema to nie problem — aplikacja ma **Tryb Gościa**, który trzyma
wszystko w przeglądarce (localStorage). Po wejściu wybierasz „Kontynuuj jako Gość"
i pokazujesz:
- Timer, historia ułożeń, statystyki i wykresy
- Bibliotekę algorytmów, Syntax, wizualizacje 3D kostki
- Konstelację / Dashboard

**Nie zadziała bez backendu:** rejestracja/logowanie na konto, synchronizacja
w chmurze, znajomi i pojedynki online. Przyciski będą, ale zwrócą błąd — to
oczekiwane w wersji demo.

> Jeśli chcesz w pełni działające demo (z kontami i Areną online), potrzebny jest
> hosting Node.js + baza — np. Render, Railway, Fly.io albo VPS. InfinityFree
> nadaje się wyłącznie na statyczny frontend.

---

## Co wgrywasz
Gotowy, zbudowany frontend jest w folderze **`deploy-infinityfree/`** oraz spakowany
jako **`cubeverse-demo-htdocs.zip`**. Zawartość:
```
index.html
404.html          (żeby odświeżenie strony nie dawało 404)
assets/index-*.css
assets/index-*.js
```
Ścieżki są względne (`./assets/...`), więc działa i na głównej domenie, i w podfolderze.

---

## Krok po kroku

1. **Załóż konto** na https://infinityfree.com → „Sign Up".
2. Panel klienta → **Create Account** → wybierz darmową subdomenę
   (np. `cubeverse.rf.gd`) albo podłącz własną domenę. Poczekaj aż konto się
   utworzy (kilka minut).
3. Wejdź w **Control Panel** danego konta → sekcja **Files** → **Online File Manager**
   (albo użyj FTP — dane FTP masz w panelu).
4. Otwórz folder **`htdocs`**. **Usuń** domyślny plik `index2.html` /
   `default.php`, który tam jest.
5. Wgraj **zawartość** paczki:
   - W File Managerze kliknij **Upload** i wrzuć `cubeverse-demo-htdocs.zip`,
     a potem **Extract** (rozpakuj) — albo wgraj pliki pojedynczo.
   - **Ważne:** w `htdocs` mają wylądować `index.html`, `404.html` i folder
     `assets/` — **nie** dodatkowy folder `deploy-infinityfree` w środku.
     (Jeśli rozpakowanie stworzy podfolder, przenieś pliki poziom wyżej.)
6. Wejdź na swój adres (np. `http://cubeverse.rf.gd`). Pierwsze załadowanie
   może chwilę potrwać i wymagać włączenia JS.
7. Na ekranie startowym kliknij **„Kontynuuj jako Gość"** i demo działa.

### FTP (alternatywa dla File Managera)
- Host / user / hasło: zakładka **FTP Details** w Control Panel.
- Klient: FileZilla → połącz → wejdź do `htdocs` → wrzuć `index.html`,
  `404.html`, `assets/`.

---

## Uwagi
- **HTTPS:** darmowy certyfikat na subdomenie `.rf.gd` bywa kapryśny; jak coś nie
  ładuje się po `https://`, spróbuj `http://`. Dla własnej domeny włącz darmowy
  SSL w panelu (Free SSL Certificate).
- **Limity:** InfinityFree ma limity zapytań/dobowe — do pokazania dema wystarczą.
- **Aktualizacja demo:** po zmianach w kodzie zbuduj ponownie (`npm run build`) i
  podmień pliki w `htdocs`.
- Konsola przeglądarki pokaże błędy typu `Failed to fetch http://localhost:4000/...`
  — to próby połączenia z backendem i w trybie Gościa można je zignorować.
