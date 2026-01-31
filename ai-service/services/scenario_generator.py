"""
Scenario Generator Service

Generates new murder mystery scenarios using GPT-4 and a detailed prompt.
Prompts are loaded from the Laravel database via PromptService.
"""

import os
import re
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from .prompt_service import get_prompt_service

logger = logging.getLogger(__name__)

# Fallback prompt in case database is not available
FALLBACK_SCENARIO_PROMPT = """Du bist ein kreativer Autor für Murder Mystery Spiele.
Erstelle ein spannendes Mordfall-Szenario mit mindestens 4 Verdächtigen.
Gib das Ergebnis als Python Dictionary aus."""


class ScenarioGenerator:
    """
    Generates murder mystery scenarios using AI.
    
    Loads the prompt template from the database via PromptService.
    Falls back to local file if database is unavailable.
    """
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.9,  # High creativity for scenario generation
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Load prompt from database (single source of truth: PromptTemplateSeeder)
        prompt_service = get_prompt_service()
        self.prompt_template = prompt_service.get_prompt("scenario_generator_prompt")
        
        if self.prompt_template:
            logger.info("✅ Loaded scenario_generator_prompt from database")
        else:
            logger.warning("⚠️ Prompt not in database, using minimal fallback. Run: php artisan db:seed --class=PromptTemplateSeeder")
            self.prompt_template = FALLBACK_SCENARIO_PROMPT
        
        logger.info(f"ScenarioGenerator initialized with model: {model_name}")
    
    def generate(self, user_input: str = "", difficulty: str = "mittel", max_retries: int = 2) -> dict:
        """
        Generate a new murder mystery scenario.
        
        Args:
            user_input: User's scenario preferences (empty for random)
            difficulty: "einfach", "mittel", or "schwer"
            max_retries: Number of retry attempts if validation fails
        
        Returns:
            Validated scenario dictionary
        """
        logger.info(f"Generating scenario: difficulty={difficulty}, input='{user_input[:50] if user_input else 'random'}'")
        
        # Build the prompt
        system_prompt = self.prompt_template
        
        # Emphasize the 4 persona requirement
        persona_reminder = "\n\n⚠️ WICHTIG: Du MUSST GENAU 4 oder mehr Verdächtige (personas) erstellen! Nicht weniger als 4!"
        
        if user_input.strip():
            user_prompt = f"Der User möchte folgendes Szenario:\n\n{user_input}\n\nSchwierigkeit: {difficulty}{persona_reminder}\n\nErstelle das Szenario!"
        else:
            user_prompt = f"Erstelle ein zufälliges, kreatives Murder Mystery Szenario.\n\nSchwierigkeit: {difficulty}{persona_reminder}\n\nÜberrasche mich!"
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                # Modify prompt on retry to be more explicit
                if attempt > 0:
                    logger.warning(f"Retry attempt {attempt}/{max_retries} - previous error: {last_error}")
                    retry_prompt = user_prompt + f"\n\n🚨 VORHERIGER VERSUCH FEHLGESCHLAGEN: {last_error}\nBitte stelle sicher, dass du MINDESTENS 4 vollständige Personas erstellst!"
                else:
                    retry_prompt = user_prompt
                
                # Call GPT
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=retry_prompt)
                ]
                
                logger.info(f"Calling GPT-4 for scenario generation (attempt {attempt + 1})...")
                response = self.llm.invoke(messages)
                
                raw_output = response.content
                logger.info(f"Received response: {len(raw_output)} characters")
                
                # Parse the Python dictionary from the response
                scenario_dict = self._parse_scenario(raw_output)
                
                # Validate the scenario
                self._validate_scenario(scenario_dict)
                
                logger.info(f"✅ Scenario generated: {scenario_dict['name']}")
                return scenario_dict
                
            except ValueError as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1} failed: {last_error}")
                
                if attempt >= max_retries:
                    logger.error(f"All {max_retries + 1} attempts failed")
                    raise ValueError(f"Scenario generation failed after {max_retries + 1} attempts: {last_error}")
        
        # Should never reach here, but just in case
        raise ValueError(f"Scenario generation failed: {last_error}")
    
    def _parse_scenario(self, raw_output: str) -> dict:
        """
        Parse the Python dictionary from GPT's response.
        
        Uses regex to extract the dictionary and then exec() to evaluate it.
        """
        logger.info("Parsing scenario dictionary...")
        
        # Extract Python code block (between ```python and ``` or just the dict)
        # Try to find code block first
        code_block_pattern = r"```(?:python)?\s*([\s\S]*?)\s*```"
        matches = re.findall(code_block_pattern, raw_output)
        
        if matches:
            code = matches[0]
        else:
            # No code block, try to find dictionary directly
            # Look for pattern: SOMETHING = {
            dict_pattern = r"(\w+)\s*=\s*\{"
            match = re.search(dict_pattern, raw_output)
            if match:
                # Extract from the = sign to the end
                code = raw_output[match.start():]
            else:
                logger.error("Could not find scenario dictionary in response")
                raise ValueError("GPT response does not contain a valid scenario dictionary")
        
        # Execute the Python code to get the dictionary
        local_vars = {}
        try:
            exec(code, {}, local_vars)
        except Exception as e:
            logger.error(f"Failed to execute scenario code: {e}")
            logger.debug(f"Code:\n{code[:500]}")
            raise ValueError(f"Invalid Python syntax in scenario: {e}")
        
        # Find the dictionary (should be the first assignment)
        if not local_vars:
            raise ValueError("No variables defined in scenario code")
        
        scenario_dict = list(local_vars.values())[0]
        
        if not isinstance(scenario_dict, dict):
            raise ValueError(f"Expected dict, got {type(scenario_dict)}")
        
        logger.info(f"✅ Parsed scenario: {scenario_dict.get('name', 'Unknown')}")
        return scenario_dict
    
    def _validate_scenario(self, scenario: dict) -> None:
        """
        Validate that the scenario has all required fields.
        
        Raises ValueError if invalid.
        """
        logger.info("Validating scenario structure...")
        
        required_keys = [
            "name", "setting", "victim", "solution",
            "shared_knowledge", "timeline", "personas", "intro_message"
        ]
        
        for key in required_keys:
            if key not in scenario:
                raise ValueError(f"Missing required key: {key}")
        
        # Validate victim structure
        if not isinstance(scenario["victim"], dict):
            raise ValueError("victim must be a dict")
        for key in ["name", "role", "description"]:
            if key not in scenario["victim"]:
                raise ValueError(f"victim missing key: {key}")
        
        # Validate solution structure
        if not isinstance(scenario["solution"], dict):
            raise ValueError("solution must be a dict")
        for key in ["murderer", "motive", "weapon", "critical_clues"]:
            if key not in scenario["solution"]:
                raise ValueError(f"solution missing key: {key}")
        
        # Validate personas
        if not isinstance(scenario["personas"], list):
            raise ValueError("personas must be a list")
        
        if len(scenario["personas"]) < 4:
            raise ValueError(f"Need at least 4 personas, got {len(scenario['personas'])}")
        
        persona_slugs = set()
        for i, persona in enumerate(scenario["personas"]):
            # Check required keys
            required_persona_keys = [
                "slug", "name", "role", "public_description",
                "personality", "private_knowledge", "knows_about_others"
            ]
            for key in required_persona_keys:
                if key not in persona:
                    raise ValueError(f"Persona {i} missing key: {key}")
            
            persona_slugs.add(persona["slug"])
        
        # Validate murderer exists
        murderer_slug = scenario["solution"]["murderer"]
        if murderer_slug not in persona_slugs:
            raise ValueError(f"Murderer '{murderer_slug}' not found in personas: {persona_slugs}")
        
        logger.info(f"✅ Scenario valid: {len(scenario['personas'])} personas, murderer={murderer_slug}")
