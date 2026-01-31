# Auto-Notes Feature - Implementierungshinweise

> Dokumentation für Agenten/Entwickler, die an diesem Feature weiterarbeiten oder Konflikte lösen müssen.

## Überblick

Das Auto-Notes Feature generiert automatisch Ermittlungsnotizen aus Verhören. Die KI analysiert jede Persona-Antwort und extrahiert relevante Hinweise, gruppiert nach Kategorie.

## Geänderte Dateien

### Backend (Laravel)

| Datei | Änderung |
|-------|----------|
| `app/Models/Game.php` | `auto_notes` zu `$fillable` und `casts` hinzugefügt |
| `app/Http/Controllers/GameController.php` | `chat()` gibt `new_auto_notes` und `all_auto_notes` zurück |
| `database/migrations/*_add_auto_notes_to_games_table.php` | JSON-Spalte `auto_notes` |

### AI-Service (Python)

| Datei | Änderung |
|-------|----------|
| `ai-service/agents/state.py` | `AutoNote` TypedDict, `auto_notes` und `new_auto_notes` in `GameState` |
| `ai-service/agents/persona_agent.py` | `_extract_auto_notes()` Methode für LLM-basierte Extraktion |
| `ai-service/main.py` | `AutoNoteResponse` Model, erweiterte `ChatResponse` |

### Frontend (React/TypeScript)

| Datei | Änderung |
|-------|----------|
| `resources/js/types/index.d.ts` | `AutoNote` und `AutoNotesMap` Interfaces |
| `resources/js/Pages/Game.tsx` | `autoNotes` in `GameState`, Verarbeitung in `sendMessage()` |
| `resources/js/Components/Game/CaseInfoPanel.tsx` | INTEL Tab mit klappbaren Persona-Gruppen |

## Datenstrukturen

### AutoNote (TypeScript)

```typescript
interface AutoNote {
    text: string;
    category: 'alibi' | 'motive' | 'relationship' | 'observation' | 'contradiction';
    timestamp: string;
    source_message: string;
}
```

### AutoNote (Python)

```python
class AutoNote(TypedDict):
    text: str
    category: str  # alibi, motive, relationship, observation, contradiction
    timestamp: str
    source_message: str
```

### Kategorien

| Kategorie | Icon | Bedeutung |
|-----------|------|-----------|
| `alibi` | 🕐 | Aufenthaltsort/Zeitangaben |
| `motive` | ⚡ | Motive, Konflikte, Geheimnisse |
| `relationship` | 🔗 | Beziehungen zum Opfer/anderen |
| `observation` | 👁️ | Was gesehen/gehört wurde |
| `contradiction` | ⚠️ | Widersprüche zu bekannten Fakten |

## Frontend-Design (CaseInfoPanel)

### INTEL Tab Struktur

```
▶ ☠ Marcus Weber (OPFER)       [3]    ← Rot hervorgehoben, sammelt alle Opfer-Notizen
  🔗 Hatte Streit mit Elena (Tom)
  👁️ Wurde zuletzt um 21:00 gesehen (Klaus)
  ⚡ Schulden bei der Firma (Lisa)

▶ Tom Berger                   [4]
  🕐 War um 21:15 noch im Büro
  ⚡ Hatte Streit wegen Beförderung
  👁️ Hat Klaus im Flur gesehen

▶ Elena Schmidt                [2]
  (eingeklappt)
```

### Design-Entscheidungen

1. **Opfer-Sektion**: Alle Notizen, die das Opfer erwähnen, werden zusätzlich unter dem Opfer-Namen gruppiert (mit Quellenangabe wer es gesagt hat)
2. **Gruppierung**: Pro Persona → dann nach Kategorie sortiert
3. **Klappbar**: `collapsedPersonas` Set steuert Sichtbarkeit (inkl. `_victim` für Opfer)
4. **Deduplizierung**: Identische Notizen werden gefiltert
5. **Name-Entfernung**: Persona-Name wird aus Notiz-Text entfernt
6. **Kompakt**: Minimales Padding, kleine Schriftgrößen (10-11px)
7. **Opfer-Erkennung**: Sucht nach Opfer-Name, Vorname, "Opfer", "Verstorbene", "Tote"

### Relevante CSS-Klassen

- `cia-bg-dark` - Dunkler Hintergrund
- `cia-text` - Monospace-ähnliche Schrift
- `border-white/10` - Subtile Rahmen

### State Management

```typescript
// In CaseInfoPanel
const [collapsedPersonas, setCollapsedPersonas] = useState<Set<string>>(new Set());

// In Game.tsx - autoNotes wird vom Backend aktualisiert
autoNotes: data.all_auto_notes || prev.autoNotes
```

## API Response Format

### POST /game/chat Response

```json
{
  "persona_slug": "tom",
  "persona_name": "Tom Berger",
  "response": "...",
  "revealed_clue": null,
  "new_auto_notes": [
    {
      "text": "War um 21:15 noch im Büro",
      "category": "alibi",
      "timestamp": "2026-01-31T21:00:00",
      "source_message": "Ich war bis spät..."
    }
  ],
  "all_auto_notes": {
    "tom": [...],
    "elena": [...],
    "lisa": [...],
    "klaus": [...]
  }
}
```

## LLM Extraktion (PersonaAgent)

Die Methode `_extract_auto_notes()` in `persona_agent.py`:

1. Sendet Frage + Antwort an LLM mit Extraktions-Prompt
2. LLM gibt JSON-Array mit Notizen zurück
3. Max 3 Notizen pro Antwort
4. Kategorien werden validiert

### Extraktions-Prompt (Kurzfassung)

```
Analysiere die Aussage von {persona_name} und extrahiere relevante Ermittlungsnotizen.
Kategorien: alibi, motive, relationship, observation, contradiction
Max 2-3 Notizen pro Antwort.
Antworte NUR mit JSON-Array.
```

## Opfer-Sektion Logik

Die Opfer-Sektion sammelt automatisch alle Notizen, die das Opfer erwähnen:

```typescript
// Erkennung ob Notiz das Opfer betrifft
const textLower = note.text.toLowerCase();
if (textLower.includes(victimNameLower) || 
    textLower.includes(victimFirstNameLower) ||
    textLower.includes('opfer') ||
    textLower.includes('verstorbene') ||
    textLower.includes('tote')) {
    // → Zur Opfer-Sektion hinzufügen
}
```

- **Rot hervorgehoben**: `border-red-500/30 bg-red-500/5`
- **Quellenangabe**: Zeigt in Klammern wer die Info gegeben hat
- **Klappbar**: Verwendet `_victim` als Key im `collapsedPersonas` Set

## Potenzielle Konfliktstellen

1. **CaseInfoPanel.tsx** - INTEL Tab UI-Logik (inkl. Opfer-Sektion)
2. **Game.tsx** - `GameState` Interface und `autoNotes` Handling
3. **categoryConfig** - Farben und Icons der Kategorien
4. **Tailwind-Klassen** - Kompaktes Design mit spezifischen Größen
5. **Opfer-Erkennung** - Keywords für Opfer-Bezug (`opfer`, `verstorbene`, `tote`)

## Tests

Noch keine Tests implementiert. Empfohlene Test-Szenarien:

- [ ] AutoNote Deduplizierung
- [ ] Persona-Name Entfernung aus Text
- [ ] Klappbare Gruppen Toggle
- [ ] API Response Parsing
- [ ] LLM JSON Parsing Fehlerbehandlung

---

## Weitere Fixes (während der Entwicklung)

### Szenario-Generator: Mindestens 4 Personas

**Problem**: GPT generierte manchmal nur 3 Personas, was die Validierung fehlschlagen ließ.

**Lösung** (`ai-service/services/scenario_generator.py`):
1. **Retry-Logik**: Bis zu 2 Wiederholungsversuche bei Validierungsfehler
2. **Verstärkter Prompt**: Explizite Warnung im User-Prompt (`⚠️ WICHTIG: Du MUSST GENAU 4 oder mehr Verdächtige erstellen!`)
3. **Fehler-Feedback**: Bei Retry wird der vorherige Fehler mitgeteilt

**Prompt-Änderungen** (`ai-service/SCENARIO_GENERATOR_PROMPT.md`):
- Kommentare im Schema: `# PERSONA 1 von 4`, `# PERSONA 2 von 4`, etc.
- Qualitätskontrolle: Expliziter Check "HAST DU GENAU 4 ODER MEHR PERSONAS?"
- Warnung: "Das Szenario wird ABGELEHNT wenn weniger als 4 Personas vorhanden sind!"
