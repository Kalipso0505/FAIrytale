# Befehle – Installation & Betrieb

Alle Befehle für dieses Projekt. PHP/Composer/NPM laufen **im Docker-Container**; nutze `docker compose exec php …` bzw. `docker compose exec <service> …`.

---

## Voraussetzungen

- [Docker](https://docs.docker.com/engine/install/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

## Installation (erstmalig)

| Schritt | Befehl |
|--------|--------|
| Repo klonen | `git clone <repo-url>` und `cd Hackathlon` |
| Container bauen & starten | `docker compose up -d --build` |
| In PHP-Container wechseln | `docker compose exec php bash` |
| App einrichten (Composer, .env, Key, Migrations, NPM, Build) | `composer setup` |

**Hinweis:** `composer setup` führt aus: `composer install`, `.env` anlegen, `php artisan key:generate`, `php artisan config:cache`, `php artisan migrate`, `npm install`, `npm run build`.

### Umgebung

- `.env` aus `.env.example` anlegen (passiert bei `composer setup`).
- Optional: AI-Service – im Projekt-Root reicht die Laravel-`.env`; für lokale Nutzung des AI-Service: `ai-service/.env` aus `ai-service/.env.example` und `OPENAI_API_KEY` setzen.

---

## Betrieb (ab zweiter Nutzung)

| Aktion | Befehl |
|--------|--------|
| Container starten | `docker compose up -d` |
| Container stoppen | `docker compose stop` |
| Container stoppen & entfernen | `docker compose down` |
| Container neu bauen | `docker compose build` |
| Container neu starten | `docker compose restart` |
| Befehl im PHP-Container ausführen | `docker compose exec php <befehl>` |
| Shell im PHP-Container | `docker compose exec php bash` |

---

## Laravel (im Container)

| Aktion | Befehl |
|--------|--------|
| App-Infos | `docker compose exec php php artisan about` |
| Migrationen ausführen | `docker compose exec php php artisan migrate` |
| Migrationen zurücksetzen | `docker compose exec php php artisan migrate:rollback` |
| Cache leeren (alle) | `docker compose exec php php artisan optimize:clear` |
| Config-Cache leeren | `docker compose exec php php artisan config:clear` |
| Route-Cache leeren | `docker compose exec php php artisan route:clear` |
| View-Cache leeren | `docker compose exec php php artisan view:clear` |
| Queue leeren | `docker compose exec php php artisan queue:clear` |
| Tests ausführen (alle) | `docker compose exec php php artisan test` |
| Tests (eine Datei) | `docker compose exec php php artisan test tests/Feature/BeispielTest.php` |
| Tests (Filter) | `docker compose exec php php artisan test --filter=testName` |

---

## Frontend (im Container)

| Aktion | Befehl |
|--------|--------|
| Dev-Server mit HMR | `docker compose exec php npm run dev` |
| Production-Build | `docker compose exec php npm run build` |
| Tests (falls konfiguriert) | `docker compose exec php npm test` |

### Frontend-Struktur

```
resources/
├── js/
│   ├── Components/      # Wiederverwendbare React-Komponenten
│   │   └── ui/          # shadcn/ui (Button, Card, …)
│   ├── Pages/           # Inertia.js-Seiten (*.tsx)
│   ├── lib/             # Hilfsfunktionen
│   ├── types/           # TypeScript-Typen
│   └── app.tsx          # React-Einstieg
└── css/
    └── app.css          # Tailwind
```

**Neue Seite:** 1) `.tsx` in `resources/js/Pages/` anlegen. 2) Route in `routes/web.php` z.B. `Route::get('/beispiel', fn () => Inertia::render('Beispiel'));`

**Ziggy:** Laravel-Routen in React nutzen: `route('name')`, `route('posts.show', { id: 1 })`. Mit Inertia: `<Link href={route('dashboard')}>…</Link>`.

**shadcn/ui:** Weitere Komponenten von [ui.shadcn.com](https://ui.shadcn.com) nach `resources/js/Components/ui/` hinzufügen.

---

## Code-Qualität & Doku

| Aktion | Befehl |
|--------|--------|
| PHP-Code formatieren (Pint, alle) | `docker compose exec php vendor/bin/pint` |
| Nur geänderte Dateien (Pint) | `docker compose exec php vendor/bin/pint --dirty` |
| Pint nur prüfen | `docker compose exec php vendor/bin/pint --test` |
| OpenAPI aus Code exportieren | `docker compose exec php php artisan scramble:export --path=public/openapi.json` bzw. `docker compose exec php composer openapi` |
| Rector (Dry-Run) | `docker compose exec php vendor/bin/rector process --dry-run` |
| Rector ausführen | `docker compose exec php vendor/bin/rector process` |

---

## AI-Service (Python)

Der AI-Service startet mit `docker compose up -d` automatisch.

| Aktion | Befehl |
|--------|--------|
| Health-Check | `curl http://localhost:8001/health` |
| Im AI-Service-Container befehl ausführen | `docker compose exec ai-service <befehl>` |

---

## URLs (Standard-Setup)

| Dienst | URL |
|--------|-----|
| Laravel-App | http://localhost |
| Vite Dev (HMR) | Port 5173 (via docker-compose) |
| AI-Service | http://localhost:8001 |
| Mailpit | http://localhost:8025 |
| phpMyAdmin | (auskommentiert in docker-compose; Zugangsdaten ggf. in `.env`/docker-compose prüfen) |
| Adminer | (auskommentiert in docker-compose; Zugangsdaten ggf. in `.env`/docker-compose prüfen) |

---

## Alternative Setups

- [Laravel Sail](https://laravel.com/docs/master/sail)
- [Laravel Herd](https://herd.laravel.com/)
- [Laradock](https://laradock.io/)

---

## Composer-Skripte (im Container)

| Skript | Befehl | Bedeutung |
|--------|--------|-----------|
| Setup | `docker compose exec php composer setup` | Ersteinrichtung (install, .env, key, migrate, npm, build) |
| OpenAPI | `docker compose exec php composer openapi` | OpenAPI nach `public/openapi.json` exportieren |
| Dev (Laravel-Starter) | `docker compose exec php composer run dev` | Server + Queue + Vite (für Nutzer ohne Docker-Proxy) – Projekt nutzt normalerweise Docker. |

---

## Kurzreferenz: typischer Ablauf

```bash
# Erstmalig
docker compose up -d --build
docker compose exec php bash
composer setup
exit

# Danach
docker compose up -d
# App: http://localhost
# Frontend-Änderungen: docker compose exec php npm run dev
# Nach API-Änderungen: docker compose exec php composer openapi
```
