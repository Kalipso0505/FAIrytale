# Hackathlon – Makefile für Installation, Start und Wartung
# Voraussetzung: Docker und Docker Compose installiert

.PHONY: default install start stop down openapi update help seed-prompts migrate fresh db-reset

# Standardziel: Hilfe anzeigen, wenn make ohne Ziel aufgerufen wird
default: help

# ------------------------------------------------------------------------------
# Installation (erstmalig)
# ------------------------------------------------------------------------------
install:
	docker compose up -d --build
	docker compose exec php composer setup
	docker compose exec php php artisan db:seed

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
	docker compose exec php php artisan db:wipe --drop-views --force
	docker compose exec php php artisan migrate --seed

db-reset:
	@echo "Kompletter Datenbank-Reset (löscht alle MySQL-Daten)..."
	docker compose stop db
	docker run --rm -v $$(pwd)/.docker/db/data:/data alpine sh -c "rm -rf /data/*"
	docker compose up -d db
	@echo "Warte auf MySQL-Initialisierung..."
	@sleep 15
	docker compose exec db mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS refactorian CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
	docker compose exec php php artisan migrate --seed

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
	docker compose exec php php artisan db:seed
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
	@echo "  make fresh        – Datenbank-Tabellen löschen und neu migrieren (db:wipe + migrate)"
	@echo "  make db-reset     – Kompletter Datenbank-Reset (bei korrupten MySQL-Daten)"
	@echo "  make seed-prompts – Prompt-Templates in Datenbank laden/aktualisieren"
	@echo "  make update       – Projekt aktualisieren (docker build, migrate, seed, npm)"
	@echo "  make help         – Diese Hilfe anzeigen"
	@echo ""
	@echo "Prompt-Management:"
	@echo "  Die Prompt-Templates können über phpMyAdmin oder direkt in der"
	@echo "  Datenbank (Tabelle: prompt_templates) bearbeitet werden."
	@echo "  Nach Änderungen: make seed-prompts oder AI-Service neustarten."
