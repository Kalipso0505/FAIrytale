# Hackathlon – FAIrytale Murder Mystery

Laravel-basierte Murder-Mystery-Anwendung mit React-Frontend und einem separaten Python/FastAPI AI-Service (LangGraph, Multi-Agent).

**Stack (Auszug):** Laravel 12, PHP 8.4, React 18, TypeScript, Inertia.js, shadcn/ui, Tailwind v4, Vite 5 · AI-Service: Python, FastAPI, LangGraph, OpenAI.

---

## Installation & Betrieb

Voraussetzungen: [Docker](https://docs.docker.com/engine/install/) und [Docker Compose](https://docs.docker.com/compose/install/).

| Schritt | Aktion |
|--------|--------|
| Erstmalig | Repo klonen → `docker compose up -d --build` → `docker compose exec php bash` → `composer setup` |
| Danach | `docker compose up -d` |

**Dokumentation:** Alle Befehle (Laravel, Frontend, AI-Service, Pint, Rector, OpenAPI, URLs), Frontend-Struktur (neue Seite, Ziggy, shadcn/ui) und alternative Setups (Sail, Herd, Laradock) sind in **[BEFEHLE.md](BEFEHLE.md)** beschrieben.

- **AI-Service** (Python/FastAPI, eigenes Setup/Env): siehe **[ai-service/README.md](ai-service/README.md)**.

---

## Technische Dokumentation

- **[TECHNICAL_FLOW.md](TECHNICAL_FLOW.md)** – Technischer Ablauf: Architektur, Spielstart, Chat-Flow, LangGraph, GameState, Persona-Isolation, Clue-Detection, Datenfluss, Szenario-Daten, Limitierungen.
- **[PROJEKT.md](PROJEKT.md)** – Projektweite Konzepte, Architektur-Entscheidungen, Domänenregeln (wird bei Bedarf ergänzt).

---

## Mitmachen

Commit-Konventionen und Changelog-Regeln: **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## Schnellreferenz

| Thema | Datei |
|-------|--------|
| Installation, Docker, Laravel/Frontend/AI-Befehle, URLs, Frontend-Struktur, alternative Setups | [BEFEHLE.md](BEFEHLE.md) |
| Technischer Ablauf, Architektur, AI-Flow | [TECHNICAL_FLOW.md](TECHNICAL_FLOW.md) |
| Projektkonzepte & Invarianten | [PROJEKT.md](PROJEKT.md) |
| AI-Service Setup & API | [ai-service/README.md](ai-service/README.md) |
| Commits & Changelog | [CONTRIBUTING.md](CONTRIBUTING.md) |
