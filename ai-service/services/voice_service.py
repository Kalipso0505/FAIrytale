"""
VoiceService - ElevenLabs Text-to-Speech Integration

Manages voice assignment and audio generation for personas.
"""

import os
import logging
import base64
from typing import Optional
from elevenlabs import ElevenLabs, VoiceSettings

logger = logging.getLogger(__name__)


class VoiceService:
    """
    Service for managing ElevenLabs voice assignments and audio generation.
    
    Features:
    - Assigns voices to personas based on gender/role
    - Generates audio from text using ElevenLabs API
    - Manages voice pool (4 female, 4 male voices)
    """
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.enabled = bool(self.api_key and self.api_key != "sk_your_elevenlabs_api_key_here")
        
        if not self.enabled:
            logger.warning("ElevenLabs API key not configured - voice generation disabled")
            self.client = None
        else:
            try:
                self.client = ElevenLabs(api_key=self.api_key)
                logger.info("ElevenLabs client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize ElevenLabs client: {e}")
                self.enabled = False
                self.client = None
        
        # Load voice IDs from environment
        self.female_voices = [
            os.getenv("ELEVENLABS_VOICE_FEMALE_1", ""),
            os.getenv("ELEVENLABS_VOICE_FEMALE_2", ""),
            os.getenv("ELEVENLABS_VOICE_FEMALE_3", ""),
            os.getenv("ELEVENLABS_VOICE_FEMALE_4", ""),
        ]
        self.male_voices = [
            os.getenv("ELEVENLABS_VOICE_MALE_1", ""),
            os.getenv("ELEVENLABS_VOICE_MALE_2", ""),
            os.getenv("ELEVENLABS_VOICE_MALE_3", ""),
            os.getenv("ELEVENLABS_VOICE_MALE_4", ""),
        ]
        
        # Remove empty voice IDs
        self.female_voices = [v for v in self.female_voices if v and not v.startswith("voice_id_placeholder")]
        self.male_voices = [v for v in self.male_voices if v and not v.startswith("voice_id_placeholder")]
        
        logger.info(f"Loaded {len(self.female_voices)} female and {len(self.male_voices)} male voices")
    
    def assign_voices_to_personas(self, personas: list[dict], fixed_mapping: Optional[dict] = None) -> dict[str, str]:
        """
        Assign voices to personas based on their characteristics.
        
        Args:
            personas: List of persona dictionaries with 'slug', 'name', 'role', etc.
            fixed_mapping: Optional dict with fixed slug -> voice_id mappings (for default scenario)
        
        Returns:
            Dictionary mapping persona slugs to voice IDs
        """
        if not self.enabled:
            logger.warning("Voice service disabled - returning empty assignments")
            return {}
        
        # Use fixed mapping if provided (for default scenario)
        if fixed_mapping:
            logger.info(f"Using fixed voice mapping: {fixed_mapping}")
            return fixed_mapping
        
        voice_assignments = {}
        female_index = 0
        male_index = 0
        
        for persona in personas:
            slug = persona.get("slug", "")
            name = persona.get("name", "")
            
            # Determine gender based on name or role
            # Simple heuristic: common female names or role indicators
            is_female = self._is_likely_female(name, persona.get("role", ""))
            
            # Assign voice from appropriate pool
            if is_female and self.female_voices:
                voice_id = self.female_voices[female_index % len(self.female_voices)]
                female_index += 1
            elif not is_female and self.male_voices:
                voice_id = self.male_voices[male_index % len(self.male_voices)]
                male_index += 1
            elif self.female_voices:
                # Fallback to female voices if male pool is empty
                voice_id = self.female_voices[female_index % len(self.female_voices)]
                female_index += 1
            elif self.male_voices:
                # Fallback to male voices if female pool is empty
                voice_id = self.male_voices[male_index % len(self.male_voices)]
                male_index += 1
            else:
                logger.warning(f"No voices available for persona {slug}")
                continue
            
            voice_assignments[slug] = voice_id
            logger.info(f"Assigned voice {voice_id[:20]}... to {name} ({slug})")
        
        return voice_assignments
    
    def _is_likely_female(self, name: str, role: str) -> bool:
        """Simple heuristic to guess gender from name/role"""
        name_lower = name.lower()
        role_lower = role.lower()
        
        # Common female name patterns
        female_indicators = [
            'elena', 'lisa', 'maria', 'anna', 'sarah', 'julia',
            'frau', 'mrs', 'ms', 'miss', 'she', 'her'
        ]
        
        for indicator in female_indicators:
            if indicator in name_lower or indicator in role_lower:
                return True
        
        return False
    
    async def text_to_speech(self, text: str, voice_id: str) -> Optional[bytes]:
        """
        Convert text to speech using ElevenLabs API.
        
        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID
        
        Returns:
            Audio data as bytes (MP3 format), or None if generation failed
        """
        if not self.enabled or not self.client:
            logger.debug("Voice generation skipped - service disabled")
            return None
        
        if not voice_id:
            logger.warning("No voice ID provided for TTS")
            return None
        
        try:
            logger.info(f"Generating audio for text (length: {len(text)}) with voice {voice_id[:20]}...")
            
            # Call ElevenLabs API
            audio_generator = self.client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_multilingual_v2",  # Multilingual model for better language support
                language_code="en",  # English language for correct pronunciation
                voice_settings=VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=True
                )
            )
            
            # Collect audio bytes
            audio_bytes = b""
            for chunk in audio_generator:
                audio_bytes += chunk
            
            logger.info(f"Generated audio: {len(audio_bytes)} bytes")
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Failed to generate audio: {e}", exc_info=True)
            return None
    
    def audio_to_base64(self, audio_bytes: bytes) -> str:
        """Convert audio bytes to base64 string for JSON transport"""
        return base64.b64encode(audio_bytes).decode('utf-8')
    
    def get_voice_for_persona(self, persona_slug: str, voice_assignments: dict[str, str]) -> Optional[str]:
        """Get the voice ID assigned to a persona"""
        return voice_assignments.get(persona_slug)
