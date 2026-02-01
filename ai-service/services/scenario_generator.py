"""
Scenario Generator Service

Generates new murder mystery scenarios using GPT-4 with Structured Output.
Uses Pydantic models for guaranteed valid JSON output - no parsing errors!
Prompts are loaded from the Laravel database via PromptService.
"""

import os
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from .prompt_service import get_prompt_service

logger = logging.getLogger(__name__)


# === Pydantic Models for Structured Output ===

class VictimModel(BaseModel):
    """The murder victim"""
    name: str = Field(description="Full name of the victim")
    role: str = Field(description="Job title or role")
    description: str = Field(description="Brief description: age, background, personality")


class SolutionModel(BaseModel):
    """The solution to the mystery"""
    murderer: str = Field(description="Slug of the murderer (lowercase, must match a persona slug)")
    motive: str = Field(description="Detailed motive: why did they kill?")
    weapon: str = Field(description="Murder weapon and method")
    critical_clues: list[str] = Field(description="3+ clues that point to the murderer", min_length=3)


class PersonaModel(BaseModel):
    """A suspect in the mystery"""
    slug: str = Field(description="Unique ID: lowercase, no umlauts (e.g., 'elena', 'tom')")
    name: str = Field(description="Full name")
    role: str = Field(description="Job title or relationship to victim")
    public_description: str = Field(description="What everyone knows about this person (1 sentence)")
    personality: str = Field(description="How they speak, behave, react to pressure (2-3 sentences)")
    private_knowledge: str = Field(description="Their secrets, alibi, observations, motives. For the murderer: include 'DU BIST DER MÖRDER' and full confession details")
    knows_about_others: str = Field(description="What they know about other suspects (format: '- Name: knowledge')")


class ScenarioModel(BaseModel):
    """Complete murder mystery scenario"""
    name: str = Field(description="Case name, e.g., 'Der Fall Villa Rosenberg'")
    setting: str = Field(description="2-3 paragraphs: Where? When? What happened? How was the body found?")
    victim: VictimModel
    solution: SolutionModel
    shared_knowledge: str = Field(description="Bullet points of facts everyone knows")
    timeline: str = Field(description="Timeline of events with times")
    personas: list[PersonaModel] = Field(description="4+ suspects (one is the murderer)", min_length=4)
    intro_message: str = Field(description="Welcome message introducing the case to the player")


# Fallback prompt for structured output
STRUCTURED_SCENARIO_PROMPT = """Du bist ein kreativer Autor für Murder Mystery Spiele.

Erstelle ein spannendes, logisch konsistentes Mordfall-Szenario auf Deutsch.

## Regeln:
1. GENAU 4 oder mehr Verdächtige (personas) - einer ist der Mörder
2. Alle Hinweise, Alibis und Zeiten müssen zusammenpassen
3. Der Mörder muss durch geschicktes Befragen überführbar sein
4. Jede Persona braucht eigene Persönlichkeit und Geheimnisse
5. Der Mörder hat in private_knowledge: "DU BIST DER MÖRDER" + volle Tatdetails

## Schwierigkeitsgrade für Mörder-Verhalten:
- EINFACH: Nervös, knickt schnell ein, zeigt Schuldgefühle
- MITTEL: Kontrolliert aber macht Fehler unter Druck
- SCHWER: Perfekter Lügner, nur durch Logik überführbar

## Kreativität:
- Überraschende Settings (Weingut, Kreuzfahrt, Theater, Museum...)
- Komplexe Beziehungen (Affären, Erpressung, Familiengeheimnisse)
- Clevere falsche Fährten"""


class ScenarioGenerator:
    """
    Generates murder mystery scenarios using AI with Structured Output.
    
    Uses Pydantic models to guarantee valid JSON - eliminates parsing errors
    and reduces retries significantly.
    """
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
        base_llm = ChatOpenAI(
            model=model_name,
            temperature=0.9,  # High creativity for scenario generation
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Enable Structured Output with Pydantic model
        self.llm = base_llm.with_structured_output(ScenarioModel)
        
        # Load prompt from database (single source of truth: PromptTemplateSeeder)
        prompt_service = get_prompt_service()
        db_prompt = prompt_service.get_prompt("scenario_generator_prompt_v2")
        
        if db_prompt:
            self.prompt_template = db_prompt
            logger.info("✅ Loaded scenario_generator_prompt_v2 from database")
        else:
            # Use optimized structured output prompt
            self.prompt_template = STRUCTURED_SCENARIO_PROMPT
            logger.info("ℹ️ Using built-in structured output prompt")
        
        logger.info(f"ScenarioGenerator initialized with model: {model_name} (Structured Output enabled)")
    
    def generate(self, user_input: str = "", difficulty: str = "mittel", max_retries: int = 1) -> dict:
        """
        Generate a new murder mystery scenario using Structured Output.
        
        Args:
            user_input: User's scenario preferences (empty for random)
            difficulty: "einfach", "mittel", or "schwer"
            max_retries: Number of retry attempts (reduced due to structured output reliability)
        
        Returns:
            Validated scenario dictionary
        """
        logger.info(f"Generating scenario (Structured Output): difficulty={difficulty}, input='{user_input[:50] if user_input else 'random'}'")
        
        # Build the prompt
        system_prompt = self.prompt_template
        
        # Build user prompt based on input
        if user_input.strip():
            user_prompt = f"""Erstelle ein Murder Mystery Szenario basierend auf diesem Wunsch:

{user_input}

Schwierigkeit: {difficulty.upper()}
Sprache: Deutsch"""
        else:
            user_prompt = f"""Erstelle ein zufälliges, kreatives Murder Mystery Szenario.

Schwierigkeit: {difficulty.upper()}
Sprache: Deutsch

Überrasche mich mit einem ungewöhnlichen Setting!"""
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.warning(f"Retry attempt {attempt}/{max_retries} - previous error: {last_error}")
                
                # Call GPT with Structured Output - returns ScenarioModel directly
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt)
                ]
                
                logger.info(f"Calling GPT with Structured Output (attempt {attempt + 1})...")
                scenario: ScenarioModel = self.llm.invoke(messages)
                
                # Convert Pydantic model to dict
                scenario_dict = scenario.model_dump()
                
                logger.info(f"✅ Received structured response: {scenario.name}")
                
                # Validate additional business rules
                self._validate_scenario(scenario_dict)
                
                logger.info(f"✅ Scenario generated and validated: {scenario_dict['name']}")
                return scenario_dict
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1} failed: {last_error}")
                
                if attempt >= max_retries:
                    logger.error(f"All {max_retries + 1} attempts failed")
                    raise ValueError(f"Scenario generation failed after {max_retries + 1} attempts: {last_error}")
        
        raise ValueError(f"Scenario generation failed: {last_error}")
    
    def _validate_scenario(self, scenario: dict) -> None:
        """
        Validate business rules that Pydantic can't enforce.
        
        Pydantic already validates:
        - All required fields exist
        - Correct types
        - At least 4 personas (min_length=4)
        - At least 3 critical clues (min_length=3)
        
        We validate:
        - Murderer slug exists in personas
        - Slugs are unique
        """
        logger.info("Validating business rules...")
        
        # Collect persona slugs
        persona_slugs = set()
        for persona in scenario["personas"]:
            slug = persona["slug"]
            if slug in persona_slugs:
                raise ValueError(f"Duplicate persona slug: {slug}")
            persona_slugs.add(slug)
        
        # Validate murderer exists in personas
        murderer_slug = scenario["solution"]["murderer"]
        if murderer_slug not in persona_slugs:
            raise ValueError(f"Murderer '{murderer_slug}' not found in personas: {persona_slugs}")
        
        logger.info(f"✅ Scenario valid: {len(scenario['personas'])} personas, murderer={murderer_slug}")
