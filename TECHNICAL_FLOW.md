# Technischer Ablauf der FAIrytale Murder Mystery Anwendung

## Architektur-Übersicht

Die Anwendung besteht aus zwei Services:

1. **Laravel Backend** (PHP) - Webserver, Frontend, Datenbank
2. **AI Service** (Python FastAPI) - Multi-Agent-System mit LangGraph

## 1. Spielstart - Game Initialization

### 1.1 User startet ein neues Spiel

**Frontend (React)** 
→ POST Request an `/game/start`

**Laravel Backend (`GameController::start`)**
- Erstellt neuen `Game`-Eintrag in der Datenbank:
  - `id`: UUID
  - `user_id`: Optional (wenn eingeloggt)
  - `scenario_slug`: `"office_murder"`
  - `status`: `"active"`
  - `revealed_clues`: `[]` (leeres Array)

**Laravel → AI Service (`AiService::startGame`)**
- HTTP POST Request an `http://ai-service:8000/game/start`
- Body: `{"game_id": "<uuid>"}`

**AI Service (`main.py` - Endpoint `/game/start`)**
- Ruft `GameMasterAgent::initialize_game(game_id)` auf

**GameMasterAgent::initialize_game**
- Erstellt `GameState` via `create_initial_game_state()`:
  - `game_id`: Die UUID
  - `scenario_name`: `"Der Fall InnoTech"`
  - `setting`: Text aus `OFFICE_MURDER_SCENARIO["setting"]`
  - `victim`: `"Marcus Weber (CFO)"`
  - `timeline`: Zeitleiste des Falls
  - `shared_facts`: Öffentliche Fakten die ALLE kennen
  - `personas_public_info`: Dict mit `{slug: {name, role, public_description}}` für alle 4 Personen
  - `agent_states`: Dict für jede Persona mit:
    - `stress_level`: 0.0
    - `lies_told`: 0
    - `interrogation_count`: 0
    - `last_topics`: []
  - `messages`: []
  - `revealed_clues`: []
  - `game_status`: `"active"`
- Speichert diesen State in `gamemaster.game_states[game_id]` (In-Memory Dictionary)

**Response zurück an Laravel**
- JSON mit: `scenario_name`, `setting`, `victim`, `personas` (4 Charaktere), `intro_message`

**Laravel → Frontend**
- Zeigt Intro-Text und 4 auswählbare Personas an

---

## 2. GameMaster und Persona-Agents - Initialisierung

### 2.1 GameMaster Initialisierung (beim Start des AI Service)

**FastAPI Lifespan-Event (`main.py`)**
- Beim Hochfahren wird ausgeführt:

```python
gamemaster = GameMasterAgent(
    scenario=OFFICE_MURDER_SCENARIO,
    model_name="gpt-4o-mini"
)
```

**GameMasterAgent Constructor (`gamemaster_agent.py`)**
- Lädt das `OFFICE_MURDER_SCENARIO` (Python Dict)
- Erstellt ein `ChatOpenAI` LLM-Objekt (OpenAI API Client)
- **Für jede Persona im Scenario:**
  - Erstellt einen `PersonaAgent(persona_data, llm)`
  - Speichert ihn in `self.persona_agents[slug]`

**PersonaAgent Constructor (`persona_agent.py`)**
Jeder Agent erhält:
- `slug`: z.B. `"tom"`, `"elena"`, `"lisa"`, `"klaus"`
- `name`: z.B. `"Tom Berger"`
- `role`: z.B. `"Lead Developer"`
- `private_knowledge`: **NUR dieser Agent kennt diese Informationen**
  - Bei Tom: Er war am Sonntagabend im Büro, er ist der Mörder, hat sich an der Hand geschnitten, etc.
  - Bei Lisa: Sie hat die E-Mail von Tom gesehen, weiß von Marcus' Anschuldigungen
  - Bei Klaus: Er hat Tom am Sonntagabend gesehen
  - Bei Elena: Sie hatte Streit mit Marcus über Investoren
- `personality`: Wie sich die Persona ausdrückt und verhält
- `knows_about_others`: Was diese Person über die anderen weiß
- `clue_keywords`: Liste von Keywords die wichtige Hinweise triggern

**Result:**
- 4 separate PersonaAgent-Instanzen existieren
- Jeder hat sein eigenes privates Wissen
- Alle teilen dasselbe LLM-Objekt

### 2.2 LangGraph Erstellung

**FastAPI Lifespan-Event (`main.py`)**
```python
murder_graph = create_murder_mystery_graph(gamemaster)
```

**create_murder_mystery_graph (`graph.py`)**

Erstellt einen LangGraph `StateGraph` mit Typ `GameState`:

**Nodes (Knoten):**
1. `"router"` - Routing-Node (macht aktuell nichts, leitet nur weiter)
2. `"elena"` - Node für Elena Schmidt Agent
3. `"tom"` - Node für Tom Berger Agent
4. `"lisa"` - Node für Lisa Hoffmann Agent
5. `"klaus"` - Node für Klaus Müller Agent

**Edges (Verbindungen):**
- **Entry Point:** `"router"`
- **Conditional Edges:** Router → passende Persona basierend auf `state["selected_persona"]`
- **End Edges:** Jede Persona → `END`

**Graph-Struktur:**
```
[START] → [router] ─┬→ [elena] → [END]
                     ├→ [tom] → [END]
                     ├→ [lisa] → [END]
                     └→ [klaus] → [END]
```

**Kompilierung:**
- Graph wird kompiliert zu `compiled_graph`
- Gespeichert als globale Variable `murder_graph`

---

## 3. Chat-Flow - User stellt eine Frage

### 3.1 User wählt Persona und sendet Nachricht

**Frontend (React)**
- User wählt z.B. "Tom Berger"
- User tippt: "Wo warst du am Sonntagabend?"
- POST Request an `/game/chat` mit:
  ```json
  {
    "game_id": "<uuid>",
    "persona_slug": "tom",
    "message": "Wo warst du am Sonntagabend?"
  }
  ```

### 3.2 Laravel Backend verarbeitet Request

**GameController::chat**

**Schritt 1: Validierung**
- Validiert: `game_id` existiert, `persona_slug` ist valide, `message` nicht leer

**Schritt 2: Speichert User-Nachricht**
```php
ChatMessage::create([
    'game_id' => $game->id,
    'persona_slug' => null,  // null = User-Nachricht
    'content' => "Wo warst du am Sonntagabend?"
]);
```

**Schritt 3: Lädt Chat-Historie**
- Lädt ALLE Nachrichten für dieses Spiel, die entweder:
  - User-Nachrichten sind (`persona_slug` ist `null`) ODER
  - Von der aktuell ausgewählten Persona stammen (`persona_slug` = `"tom"`)
- **Wichtig:** Nachrichten anderer Personas werden NICHT geladen
- Formatiert zu Array:
  ```php
  [
    ['role' => 'user', 'content' => '...'],
    ['role' => 'assistant', 'content' => '...'],
    ...
  ]
  ```

**Schritt 4: Request an AI Service**
```php
$response = $this->aiService->chat(
    $game->id,           // "123e4567-e89b..."
    "tom",               // persona_slug
    "Wo warst du...",    // message
    $chatHistory         // [...]
);
```

**AiService::chat (`app/Services/AiService.php`)**
- HTTP POST Request an `http://ai-service:8000/chat`
- Body:
  ```json
  {
    "game_id": "...",
    "persona_slug": "tom",
    "message": "Wo warst du am Sonntagabend?",
    "chat_history": [...]
  }
  ```
- Timeout: 60 Sekunden

### 3.3 AI Service verarbeitet Chat

**FastAPI Endpoint `/chat` (`main.py`)**

**Schritt 1: Validierung**
- Prüft ob `gamemaster` und `murder_graph` initialisiert sind
- Prüft ob `persona_slug` valide ist (elena, tom, lisa, klaus)

**Schritt 2: State-Vorbereitung**
```python
state = gamemaster.prepare_state_for_agent(
    game_id=request.game_id,
    persona_slug=request.persona_slug,
    user_message=request.message,
    chat_history=request.chat_history
)
```

**GameMasterAgent::prepare_state_for_agent**
- Lädt existierenden `GameState` aus `self.game_states[game_id]` (oder erstellt neuen)
- Setzt:
  - `state["user_message"]` = `"Wo warst du am Sonntagabend?"`
  - `state["selected_persona"]` = `"tom"`
- Konvertiert `chat_history` zu `Message`-Objekten
- Fügt aktuelle User-Nachricht hinzu
- Setzt `state["messages"]` mit allen Messages

**State enthält jetzt:**
```python
{
    "game_id": "...",
    "scenario_name": "Der Fall InnoTech",
    "setting": "Die InnoTech GmbH...",
    "victim": "Marcus Weber (CFO)",
    "timeline": "Samstag 18:00...",
    "shared_facts": "Marcus wurde...",
    "personas_public_info": {...},  # Öffentliche Info über alle 4
    "user_message": "Wo warst du am Sonntagabend?",
    "selected_persona": "tom",
    "messages": [...],  # Chat-History
    "agent_states": {
        "tom": {"stress_level": 0.1, "interrogation_count": 2, ...},
        "elena": {...},
        "lisa": {...},
        "klaus": {...}
    },
    "revealed_clues": ["Tom erwähnte '21:15'"],
    "game_status": "active",
    "final_response": "",
    "responding_agent": "",
    "detected_clue": None
}
```

**Schritt 3: LangGraph Invocation**
```python
final_state = await murder_graph.ainvoke(state)
```

### 3.4 LangGraph Execution

**Graph Flow:**

**1. Router Node (`graph.py` - `router_node`)**
- Liest `state["selected_persona"]` → `"tom"`
- Loggt: `"Router: directing to tom"`
- Gibt State unverändert zurück

**2. Conditional Edge - `route_to_persona`**
- Liest `state["selected_persona"]` → `"tom"`
- Prüft ob "tom" in `valid_personas` ist → Ja
- **Entscheidung:** Graph geht zu Node `"tom"`

**3. Tom Agent Node (`graph.py` - `make_agent_node`)**
- Ruft `await tom_agent.invoke(state)` auf

### 3.5 PersonaAgent Execution (Tom)

**PersonaAgent::invoke (`persona_agent.py`)**

**Schritt 1: System Prompt erstellen**
```python
system_prompt = self._build_system_prompt(state)
```

**_build_system_prompt:**
- Kombiniert mehrere Informationen zu einem großen System Prompt:

```text
Du bist Tom Berger, Lead Developer bei der InnoTech GmbH.

=== DEINE PERSÖNLICHKEIT ===
Du bist introvertiert und technisch begabt.
Du sprichst eher kurz...
[aus persona_data["personality"]]

=== DEIN PRIVATES WISSEN (nur du weißt das, verrate es nicht direkt!) ===
- Du warst am Sonntagabend im Büro (21:15 laut Zugangskarte)
- Marcus hat dich beschuldigt, Firmengeheimnisse zu verkaufen (FALSCH!)
- Du hast ihn im Affekt mit der Trophäe erschlagen
- Du hast dir dabei an der Hand geschnitten
[aus persona_data["private_knowledge"]]

=== WAS ALLE WISSEN (öffentliche Fakten) ===
- Marcus Weber wurde am Sonntagabend erschlagen
- Das Gebäude hat elektronisches Zugangssystem
[aus state["shared_facts"]]

=== ZEITLEISTE DES FALLS ===
- Samstag 18:00: Marcus verlässt das Büro
- Sonntag 20:00-23:00: Geschätzte Tatzeit
[aus state["timeline"]]

=== WAS DU ÜBER ANDERE WEISST ===
- Elena: "Sie und Marcus hatten auch Stress. Finanzielle Sachen."
- Lisa: "Nett, hilft immer..."
[aus persona_data["knows_about_others"]]

=== VERHALTENSREGELN ===
1. Bleibe IMMER in deiner Rolle als Tom Berger
2. Antworte auf Deutsch
3. Halte Antworten kurz (2-4 Sätze)
4. Verrate deine Geheimnisse NIEMALS direkt, aber:
   - Zeige Nervosität bei heiklen Themen
   - Werde bei wiederholtem Nachfragen offener
5. Du weißt NICHT wer der Mörder ist (außer du bist es selbst)

=== AKTUELLER ZUSTAND ===
Stress-Level: 20%
Du wirst merklich nervöser...
[wenn stress_level > 0.3]
```

**Schritt 2: Chat-Historie extrahieren**
```python
history = self._get_persona_history(state)
```

**_get_persona_history:**
- Durchläuft `state["messages"]` (letzte 10)
- Nimmt NUR Nachrichten die:
  - Vom User sind (`persona_slug` ist `None`) ODER
  - Von Tom selbst sind (`persona_slug` == `"tom"`)
- **Wichtig:** Lisa's, Elena's oder Klaus' Antworten werden NICHT inkludiert
- Formatiert zu LangChain Messages:
  ```python
  [
    HumanMessage(content="Was war am Freitag los?"),
    AIMessage(content="Es gab Stress mit Marcus..."),
    HumanMessage(content="Wo warst du am Sonntagabend?")
  ]
  ```

**Schritt 3: LLM Call**
```python
messages = [
    SystemMessage(content=system_prompt),  # Der große Prompt von oben
    *history,                               # Bisherige Konversation
    HumanMessage(content=state["user_message"])  # Aktuelle Frage
]

response = await self.llm.ainvoke(messages)
response_text = response.content
```

**OpenAI API Call:**
- Model: `gpt-4o-mini`
- Temperature: 0.8
- System Prompt + Historie + User Message
- **LLM generiert Antwort basierend auf:**
  - Tom's Persönlichkeit (nervös, introvertiert)
  - Tom's privatem Wissen (er ist der Mörder, war im Büro, geschnittene Hand)
  - Geteiltem Wissen (Tatzeit, Opfer)
  - Chat-Historie (was wurde schon gefragt/geantwortet)
  - Stress-Level (Tom wird nervöser bei wiederholtem Nachfragen)

**Beispiel-Response:**
```
"Äh... ich war zuhause. Hab Netflix geschaut. Warum fragst du?"
```
*(Tom lügt, weil er der Mörder ist)*

**Schritt 4: Clue Detection**
```python
detected_clue = self._detect_revealed_clue(response_text)
```

**_detect_revealed_clue:**
- Prüft ob Tom's `clue_keywords` in der Response vorkommen
- Tom's Keywords: `["21:15", "zugangskarte", "sonntag abend", "trophäe", "hand", "schnitt", "geschnitten"]`
- Falls z.B. "hand" in Response: `detected_clue = "Tom Berger erwähnte 'hand'"`
- Falls nichts: `detected_clue = None`

**Schritt 5: State Update**
```python
# Update Tom's Agent State
agent_state = state["agent_states"]["tom"]
agent_state["stress_level"] = min(1.0, agent_state["stress_level"] + 0.1)
agent_state["interrogation_count"] = agent_state["interrogation_count"] + 1
state["agent_states"]["tom"] = agent_state

# Update revealed clues
if detected_clue and detected_clue not in state["revealed_clues"]:
    state["revealed_clues"].append(detected_clue)

# Set response
state["final_response"] = response_text
state["responding_agent"] = "tom"
state["detected_clue"] = detected_clue

# Add to messages
new_message = Message(
    role="assistant",
    persona_slug="tom",
    content=response_text
)
state["messages"] = [new_message]  # Wird via Annotated[..., add] akkumuliert
```

**State nach Execution:**
```python
{
    ...  # Alle vorherigen Felder
    "agent_states": {
        "tom": {
            "stress_level": 0.2,  # War 0.1, jetzt +0.1
            "interrogation_count": 3,  # War 2, jetzt +1
            ...
        },
        ...
    },
    "revealed_clues": ["Tom erwähnte '21:15'"],  # Evtl. neue Clues
    "final_response": "Äh... ich war zuhause. Hab Netflix geschaut. Warum fragst du?",
    "responding_agent": "tom",
    "detected_clue": None,
    "messages": [... + neuer Message]
}
```

**Schritt 6: Return State**
- PersonaAgent gibt den modifizierten State zurück

### 3.6 Graph Ende

**Graph-Execution:**
- Tom Node ist fertig
- Graph folgt Edge: `tom → END`
- Graph gibt `final_state` zurück

**Zurück in FastAPI `/chat` Endpoint:**
```python
final_state = await murder_graph.ainvoke(state)  # Execution ist fertig

# Update gespeicherten State
gamemaster.update_game_state(request.game_id, final_state)

# Response erstellen
return ChatResponse(
    persona_slug=final_state["responding_agent"],  # "tom"
    response=final_state["final_response"],        # "Äh... ich war..."
    persona_name="Tom Berger",
    revealed_clue=final_state["detected_clue"],    # None oder "..."
    agent_stress=0.2,
    interrogation_count=3
)
```

### 3.7 Response zurück zu Laravel

**Laravel GameController::chat empfängt:**
```json
{
    "persona_slug": "tom",
    "persona_name": "Tom Berger",
    "response": "Äh... ich war zuhause. Hab Netflix geschaut. Warum fragst du?",
    "revealed_clue": null,
    "agent_stress": 0.2,
    "interrogation_count": 3
}
```

**Laravel speichert Persona-Response:**
```php
ChatMessage::create([
    'game_id' => $game->id,
    'persona_slug' => 'tom',
    'content' => "Äh... ich war zuhause...",
    'revealed_clue' => null
]);
```

**Falls revealed_clue nicht null:**
```php
if (!empty($response['revealed_clue'])) {
    $clues = $game->revealed_clues ?? [];
    $clues[] = $response['revealed_clue'];
    $game->update(['revealed_clues' => array_unique($clues)]);
}
```

**Response an Frontend:**
```json
{
    "persona_slug": "tom",
    "persona_name": "Tom Berger",
    "response": "Äh... ich war zuhause. Hab Netflix geschaut. Warum fragst du?",
    "revealed_clue": null
}
```

### 3.8 Frontend Display

**React**
- Zeigt Tom's Antwort im Chat an
- Zeigt evtl. entdeckten Hinweis an
- User kann nächste Frage stellen oder andere Persona auswählen

---

## 4. Wichtige technische Details

### 4.1 Persona-Isolation

**Jede Persona hat:**
- **Eigenes privates Wissen** (`private_knowledge` im PersonaAgent)
  - Wird NUR diesem Agent im System Prompt gegeben
  - Andere Agents kennen es NICHT
- **Eigene Chat-Historie**
  - Tom sieht nur Konversationen mit Tom
  - Lisa sieht nur Konversationen mit Lisa
  - Keine Cross-Persona-History

**Alle Personas haben Zugang zu:**
- Shared Facts (`state["shared_facts"]`)
- Timeline (`state["timeline"]`)
- Öffentliche Persona-Infos (`state["personas_public_info"]`)
- Victim Info (`state["victim"]`)

### 4.2 State Management

**AI Service (Python):**
- In-Memory Dictionary: `gamemaster.game_states[game_id] = GameState`
- **Problem:** Geht verloren bei Service-Restart
- **Lösung in Zukunft:** Redis oder Datenbank

**Laravel (PHP):**
- Persistente Datenbank:
  - `games` Tabelle: `id`, `status`, `revealed_clues`, etc.
  - `chat_messages` Tabelle: Alle Nachrichten
- Chat-Historie wird bei jedem Request neu geladen

### 4.3 Clue-Detection Mechanismus

**Keyword-basiert:**
- Jeder PersonaAgent hat `clue_keywords` Liste
- Nach LLM-Response wird geprüft ob Keywords vorkommen
- Falls ja: Clue wird zu `state["revealed_clues"]` hinzugefügt
- **Limitation:** Nur einfache Keyword-Suche, keine semantische Analyse

**Beispiel:**
- Tom's Keywords: `["21:15", "zugangskarte", "trophäe", "hand", "schnitt"]`
- Wenn Tom sagt: "Ich hab mir beim Kochen in die Hand geschnitten"
- Keyword "hand" oder "schnitt" getriggert
- Clue: "Tom Berger erwähnte 'hand'"

### 4.4 Stress & Interrogation Tracking

**Pro Befragung:**
- `stress_level` steigt um 0.1 (max 1.0)
- `interrogation_count` steigt um 1

**Verhaltensänderung:**
- Bei `stress > 0.3`: System Prompt ergänzt um "Du wirst nervöser"
- Bei `stress > 0.6`: "Du machst Fehler in deinen Aussagen"
- Bei `interrogation_count > 5`: "Du wirst müde und unvorsichtiger"

**Effekt:**
- LLM passt Antworten an Stress an
- Personas werden bei häufigem Nachfragen offener/widersprüchlicher

### 4.5 LangGraph Rolle

**Aktuell:**
- Sehr einfacher Graph: Router → Persona → End
- Router macht im Grunde nichts (leitet nur weiter)
- Persona-Auswahl kommt vom User

**Zukunftspotential (Kommentare im Code):**
- Intelligentes Routing: Graph entscheidet welche Persona antwortet
- GameMaster Hints Node: Gibt Tipps wenn User feststeckt
- Contradiction Detection: Erkennt Widersprüche in Aussagen
- Group Interrogation: Alle Personas gleichzeitig befragen

**Warum LangGraph trotzdem?**
- Erweiterbarkeit: Einfach neue Nodes hinzufügen
- State Management: Zentrale State-Verwaltung
- Orchestration: Kann komplexe Flows koordinieren

---

## 5. Datenfluss - Zusammenfassung

```
USER
  ↓ (wählt Persona, stellt Frage)
  
REACT FRONTEND
  ↓ POST /game/chat
  
LARAVEL BACKEND (GameController)
  ├─ Speichert User-Message in DB
  ├─ Lädt Chat-Historie (nur diese Persona)
  └─ HTTP POST → AI Service
  
AI SERVICE (FastAPI)
  └─ /chat Endpoint
      ├─ GameMaster.prepare_state_for_agent()
      │   └─ Lädt/erstellt GameState
      │
      └─ murder_graph.ainvoke(state)
          │
          ├─ [Router Node] → leitet zu selected_persona
          │
          └─ [Persona Node] → PersonaAgent.invoke(state)
              │
              ├─ Baut System Prompt:
              │   ├─ Persönlichkeit
              │   ├─ Privates Wissen (NUR dieser Agent!)
              │   ├─ Geteiltes Wissen
              │   ├─ Timeline
              │   └─ Stress-Level
              │
              ├─ Extrahiert Chat-Historie (nur diese Persona)
              │
              ├─ LLM Call (OpenAI GPT-4o-mini)
              │   └─ Generiert Antwort basierend auf Rolle & Wissen
              │
              ├─ Clue Detection (Keyword-basiert)
              │
              ├─ State Update:
              │   ├─ stress_level +0.1
              │   ├─ interrogation_count +1
              │   ├─ revealed_clues (falls Clue gefunden)
              │   └─ final_response
              │
              └─ Return State
          
          └─ [END]
      
      └─ Response zurück
  
LARAVEL BACKEND
  ├─ Speichert Persona-Response in DB
  ├─ Updated revealed_clues (falls vorhanden)
  └─ JSON Response
  
REACT FRONTEND
  └─ Zeigt Antwort im Chat
```

---

## 6. Szenario-Daten (OFFICE_MURDER_SCENARIO)

**Struktur (`scenarios/office_murder.py`):**

```python
OFFICE_MURDER_SCENARIO = {
    "name": "Der Fall InnoTech",
    "setting": "...",  # Beschreibung des Falls
    "victim": {
        "name": "Marcus Weber",
        "role": "CFO",
        "description": "..."
    },
    "solution": {
        "murderer": "tom",
        "motive": "...",
        "weapon": "Bronzene Auszeichnungstrophäe",
        "critical_clues": [...]
    },
    "shared_knowledge": "...",  # Was ALLE wissen
    "timeline": "...",           # Zeitleiste des Falls
    "personas": [
        {
            "slug": "elena",
            "name": "Elena Schmidt",
            "role": "CEO",
            "public_description": "...",  # Öffentlich bekannt
            "personality": "...",          # Wie sie spricht/handelt
            "private_knowledge": "...",    # NUR Elena kennt das
            "knows_about_others": "..."    # Was Elena über andere weiß
        },
        # ... tom, lisa, klaus analog
    ],
    "intro_message": "..."
}
```

**Daten-Nutzung:**

1. **Shared Knowledge** → in `GameState` → alle Agents sehen es
2. **Private Knowledge** → NUR im System Prompt des jeweiligen Agents
3. **Personality** → Steuert wie Agent antwortet
4. **Public Description** → Frontend Display
5. **Solution** → Nur für `accuse` Endpoint, nicht für Agents

---

## 7. Weitere Features

### 7.1 Game Lösung - Accusation

**User klickt "Anklagen":**

**Frontend** → POST `/game/accuse` mit:
```json
{
    "game_id": "...",
    "accused_persona": "tom"
}
```

**GameController::accuse:**
- Prüft ob Spiel aktiv ist
- Hardcoded Lösung: `$correct = ($accused_persona === 'tom')`
- Updatent Game:
  ```php
  $game->update([
      'status' => $correct ? 'solved' : 'failed',
      'accused_persona' => $accused_persona
  ]);
  ```
- Response mit Lösung (Mörder, Motiv, Waffe)

**Wichtig:** Agents kennen die Lösung NICHT (außer Tom weiß dass er es war)

### 7.2 Debug Endpoints

**AI Service:**
- `/debug/personas` - Zeigt privates Wissen aller Personas
- `/debug/graph` - Graph-Struktur für Visualisierung
- `/debug/game/{game_id}/state` - Game State im AI Service
- `/debug/agents` - Info über alle Agents

**Laravel:**
- `/debug` - Debug Dashboard (Frontend)
- `/api/debug/personas` - Persona-Infos

### 7.3 Chat-Historie Reload

**Frontend** → GET `/game/{gameId}/history`

**GameController::history:**
- Lädt Game + alle Messages
- Formatiert zu JSON
- Enthält: Messages, revealed_clues, Status

---

## 8. Key Takeaways

1. **Jeder Persona ist ein eigener Agent** mit eigenem privaten Wissen
2. **LangGraph orchestriert** die Ausführung (aktuell simpel, aber erweiterbar)
3. **GameState fließt durch Graph** und wird von jedem Node modifiziert
4. **State Management ist hybrid:**
   - AI Service: In-Memory (GameState)
   - Laravel: Persistent DB (Messages, Game Status, Clues)
5. **Chat-Historie ist persona-spezifisch** - keine Cross-Contamination
6. **Clue Detection** ist keyword-basiert und simpel
7. **Stress & Interrogation** ändern Agent-Verhalten über Zeit
8. **System Prompts sind riesig** und kombinieren viele Informationsquellen
9. **OpenAI API macht die "Magie"** - Agents sind nur Prompt-Engineering
10. **LangGraph bereitet vor** für komplexere Multi-Agent-Interaktionen

---

## 9. Technologie-Stack

**Backend (Laravel):**
- PHP 8.4
- Laravel 12
- PostgreSQL (Datenbank)
- Inertia.js (Server-Side Rendering Bridge)

**Frontend:**
- React 18
- TypeScript
- Material-UI
- Tailwind CSS
- Vite (Build Tool)

**AI Service:**
- Python 3.11+
- FastAPI (Web Framework)
- LangGraph (Multi-Agent Orchestration)
- LangChain (LLM Integration)
- OpenAI GPT-4o-mini (Language Model)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (Reverse Proxy)
- Redis (geplant für State Management)

---

## 10. Limitierungen & Verbesserungspotential

**Aktuell:**
- State geht bei AI Service Restart verloren
- Router Node ist "dummy" - keine intelligente Auswahl
- Clue Detection sehr simpel (nur Keywords)
- Keine echte Multi-Agent-Interaktion (Personas reden nicht miteinander)
- Keine Widerspruchs-Erkennung

**Zukunft:**
- Redis für persistenten State
- Intelligenter Router (Graph entscheidet welche Persona antwortet)
- Semantic Clue Detection (verstehen statt Keywords)
- Group Interrogation (alle Personas gleichzeitig)
- GameMaster Hints (hilft wenn User feststeckt)
- Contradiction Detection (erkennt Lügen)
