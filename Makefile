# Hackathlon – Makefile für Installation, Start und Wartung
# Voraussetzung: Docker und Docker Compose installiert

.PHONY: default install start stop openapi update help seed-prompts migrate fresh

# Standardziel: Hilfe anzeigen, wenn make ohne Ziel aufgerufen wird
default: help

# ------------------------------------------------------------------------------
# Installation (erstmalig)
# ------------------------------------------------------------------------------
install:
	docker compose up -d --build
	docker compose exec php composer setup
	docker compose exec php php artisan db:seed --class=PromptTemplateSeeder

# ------------------------------------------------------------------------------
# Start / Stop
# ------------------------------------------------------------------------------
start:
	docker compose up -d

stop:
	docker compose stop

down:
	docker compose down

# ------------------------------------------------------------------------------
# OpenAPI-Generierung
# ------------------------------------------------------------------------------
openapi:
	docker compose exec php composer openapi

# ------------------------------------------------------------------------------
# Datenbank-Operationen
# ------------------------------------------------------------------------------
migrate:
	docker compose exec php php artisan migrate

fresh:
	docker compose exec php php artisan migrate:fresh --seed

seed-prompts:
	docker compose exec php php artisan db:seed --class=PromptTemplateSeeder

# ------------------------------------------------------------------------------
# Projekt-Update (Composer, Docker-Build, NPM)
# ------------------------------------------------------------------------------
update:
	docker compose build
	docker compose up -d
	docker compose exec php composer update
	docker compose exec php php artisan migrate
	docker compose exec php php artisan db:seed --class=PromptTemplateSeeder
	docker compose exec php npm install
	docker compose exec php npm run build

# ------------------------------------------------------------------------------
# Hilfe
# ------------------------------------------------------------------------------
help:
	@echo "Hackathlon – verfügbare Ziele:"
	@echo ""
	@echo "  make install      – Ersteinrichtung (docker build, composer setup, seed prompts)"
	@echo "  make start        – Container starten"
	@echo "  make stop         – Container stoppen"
	@echo "  make down         – Container stoppen und entfernen"
	@echo "  make openapi      – OpenAPI-Spezifikation aus Code generieren"
	@echo "  make migrate      – Datenbank-Migrationen ausführen"
	@echo "  make fresh        – Datenbank neu aufsetzen (migrate:fresh --seed)"
	@echo "  make seed-prompts – Prompt-Templates in Datenbank laden/aktualisieren"
	@echo "  make update       – Projekt aktualisieren (docker build, migrate, seed, npm)"
	@echo "  make help         – Diese Hilfe anzeigen"
	@echo ""
	@echo "Prompt-Management:"
	@echo "  Die Prompt-Templates können über phpMyAdmin oder direkt in der"
	@echo "  Datenbank (Tabelle: prompt_templates) bearbeitet werden."
	@echo "  Nach Änderungen: make seed-prompts oder AI-Service neustarten."
