# ElevenLabs Voice Integration

Diese Branch implementiert Text-to-Speech für Persona-Antworten mit ElevenLabs.

## Setup

### 1. ElevenLabs API Key erhalten
1. Gehe zu [elevenlabs.io](https://elevenlabs.io) und erstelle einen Account
2. Navigiere zu deinem API-Dashboard
3. Kopiere deinen API Key

### 2. Voice IDs auswählen
1. Besuche die [Voice Library](https://elevenlabs.io/voice-library)
2. Wähle 8 Stimmen aus (4 weiblich, 4 männlich)
3. Kopiere die Voice IDs

### 3. Environment-Variablen konfigurieren

Bearbeite `ai-service/.env`:

```bash
# ElevenLabs Voice API Configuration
ELEVENLABS_API_KEY=sk_your_actual_api_key_here

# Female Voices (4 voices)
ELEVENLABS_VOICE_FEMALE_1=actual_voice_id_1
ELEVENLABS_VOICE_FEMALE_2=actual_voice_id_2
ELEVENLABS_VOICE_FEMALE_3=actual_voice_id_3
ELEVENLABS_VOICE_FEMALE_4=actual_voice_id_4

# Male Voices (4 voices)
ELEVENLABS_VOICE_MALE_1=actual_voice_id_5
ELEVENLABS_VOICE_MALE_2=actual_voice_id_6
ELEVENLABS_VOICE_MALE_3=actual_voice_id_7
ELEVENLABS_VOICE_MALE_4=actual_voice_id_8
```

### 4. Dependencies installieren

```bash
cd ai-service
pip install -r requirements.txt
```

### 5. Docker neu builden

```bash
docker compose build ai-service
docker compose up -d
```

## Features

### Automatische Voice-Zuordnung
- Bei Scenario-Generation ordnet der GameMaster automatisch passende Stimmen zu
- Basiert auf Gender-Erkennung aus Namen/Rollen
- Für den Default-Case (Villa Sonnenhof) sind feste Stimmen zugeordnet

### Play-Button UI
- 🔊 Icon neben jeder Persona-Antwort
- Klick zum Abspielen der Stimme
- Visual Feedback während der Wiedergabe (⏸)
- Nur sichtbar wenn Audio verfügbar ist

### Graceful Degradation
- Wenn ElevenLabs API nicht verfügbar: Chat funktioniert ohne Audio
- Fehlende API Keys: Service wird automatisch deaktiviert
- Play-Button wird nur angezeigt wenn Audio vorhanden

## Architektur

```
Frontend (React)
    ↓ POST /game/chat
Laravel Backend
    ↓ POST /chat
AI-Service (Python)
    ↓ Persona Agent generiert Text
    ↓ VoiceService → ElevenLabs API
    ↓ Audio (MP3) → Base64
    ← Response: {response, audio_base64, ...}
Laravel
    ← Durchleitung
Frontend
    → Audio-Wiedergabe
```

## Files Changed

### Backend (AI-Service)
- `ai-service/requirements.txt` - ElevenLabs SDK hinzugefügt
- `ai-service/.env.example` - Voice-Konfiguration
- `ai-service/services/voice_service.py` - NEU: Voice-Management
- `ai-service/agents/state.py` - Voice-Zuordnung im State
- `ai-service/agents/gamemaster_agent.py` - Voice-Zuordnung bei Init
- `ai-service/agents/persona_agent.py` - Audio-Generierung
- `ai-service/main.py` - Response-Model erweitert

### Frontend
- `resources/js/Components/Game/ChatWindow.tsx` - Play-Button UI
- `resources/js/Pages/Game.tsx` - Audio-Daten in Messages

### Backend (Laravel)
- Keine Änderungen nötig - transparente Durchleitung

## Testing

### Ohne echte API Keys
Der Service funktioniert auch ohne ElevenLabs-Konfiguration:
- Play-Button wird nicht angezeigt
- Chat funktioniert normal

### Mit echten API Keys
1. Starte das Spiel über "Quick Start"
2. Stelle eine Frage an Sophie
3. Klicke auf 🔊 neben der Antwort
4. Audio sollte abgespielt werden

## Troubleshooting

### "Voice generation disabled"
- Prüfe ob `ELEVENLABS_API_KEY` gesetzt ist
- Prüfe ob Voice IDs konfiguriert sind

### "Audio playback error"
- Browser-Konsole öffnen für Details
- MP3-Support im Browser prüfen

### "Failed to generate audio"
- AI-Service Logs prüfen: `docker compose logs ai-service`
- ElevenLabs API-Limits prüfen
- API Key validieren

## Kosten

ElevenLabs kostet Credits pro generiertem Character:
- Free Tier: 10.000 Zeichen/Monat
- Starter: $5/Monat für 30.000 Zeichen
- Typische Antwort: ~200 Zeichen = $0.03

Schätzung: 100 Antworten = ~$3
