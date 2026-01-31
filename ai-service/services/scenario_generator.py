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
        
        # Try to load prompt from database
        prompt_service = get_prompt_service()
        self.prompt_template = prompt_service.get_prompt("scenario_generator_prompt")
        
        if self.prompt_template:
            logger.info("✅ Loaded scenario_generator_prompt from database")
        else:
            # Fallback to local file
            logger.warning("⚠️ Could not load prompt from database, trying local file...")
            try:
                prompt_path = os.path.join(
                    os.path.dirname(__file__),
                    "..",
                    "SCENARIO_GENERATOR_PROMPT.md"
                )
                with open(prompt_path, "r", encoding="utf-8") as f:
                    self.prompt_template = f.read()
                logger.info("✅ Loaded scenario prompt from local file")
            except FileNotFoundError:
                logger.error("❌ No prompt available, using minimal fallback")
                self.prompt_template = FALLBACK_SCENARIO_PROMPT
        
        logger.info(f"ScenarioGenerator initialized with model: {model_name}")
    
    def generate(self, user_input: str = "", difficulty: str = "mittel") -> dict:
        """
        Generate a new murder mystery scenario.
        
        Args:
            user_input: User's scenario preferences (empty for random)
            difficulty: "einfach", "mittel", or "schwer"
        
        Returns:
            Validated scenario dictionary
        """
        logger.info(f"Generating scenario: difficulty={difficulty}, input='{user_input[:50]}'")
        
        # Build the prompt
        system_prompt = self.prompt_template
        
        if user_input.strip():
            user_prompt = f"The user wants the following scenario:\n\n{user_input}\n\nDifficulty: {difficulty}\n\nCreate the scenario in English!"
        else:
            user_prompt = f"Create a random, creative Murder Mystery scenario in English.\n\nDifficulty: {difficulty}\n\nSurprise me!"
        
        # Call GPT
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        logger.info("Calling GPT-4 for scenario generation...")
        response = self.llm.invoke(messages)
        
        raw_output = response.content
        logger.info(f"Received response: {len(raw_output)} characters")
        
        # Parse the Python dictionary from the response
        scenario_dict = self._parse_scenario(raw_output)
        
        # Validate the scenario
        self._validate_scenario(scenario_dict)
        
        logger.info(f"✅ Scenario generated: {scenario_dict['name']}")
        return scenario_dict
    
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
