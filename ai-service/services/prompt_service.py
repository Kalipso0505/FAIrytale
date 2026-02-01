"""
Prompt Service - Fetches prompt templates from Laravel API.

This service allows Content Managers to update prompts via the database
without modifying Python code.
"""

import os
import json
import logging
from typing import Optional
from functools import lru_cache

import httpx
import yaml

logger = logging.getLogger(__name__)


class PromptService:
    """
    Service for fetching prompt templates from the Laravel API.
    
    Provides caching to avoid repeated API calls during a session.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("LARAVEL_API_URL", "http://php:80")
        self._cache: dict[str, str] = {}
        self._prompts_loaded = False
        logger.info(f"PromptService initialized with base URL: {self.base_url}")
    
    def _fetch_all_prompts(self) -> dict[str, str]:
        """Fetch all prompts from the API in a single request."""
        if self._prompts_loaded:
            return self._cache
        
        try:
            url = f"{self.base_url}/api/prompts/all"
            logger.info(f"Fetching all prompts from: {url}")
            
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)
                response.raise_for_status()
                
                self._cache = response.json()
                self._prompts_loaded = True
                
                logger.info(f"✅ Loaded {len(self._cache)} prompt templates from API")
                return self._cache
                
        except httpx.HTTPError as e:
            logger.warning(f"Failed to fetch prompts from API: {e}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error fetching prompts: {e}")
            return {}
    
    def get_prompt(self, key: str, fallback: Optional[str] = None) -> Optional[str]:
        """
        Get a prompt template by its key.
        
        Args:
            key: The unique key of the prompt template
            fallback: Optional fallback value if prompt not found
            
        Returns:
            The prompt body or fallback value
        """
        # Try cache first
        if key in self._cache:
            return self._cache[key]
        
        # Fetch all prompts (they're cached after first call)
        prompts = self._fetch_all_prompts()
        
        if key in prompts:
            return prompts[key]
        
        if fallback:
            logger.warning(f"Prompt '{key}' not found, using fallback")
            return fallback
        
        logger.error(f"Prompt '{key}' not found and no fallback provided")
        return None
    
    def get_scenario(self, key: str = "default_scenario") -> Optional[dict]:
        """
        Get a scenario as a parsed dictionary.
        
        Supports both YAML and JSON formats for backwards compatibility.
        
        Args:
            key: The scenario key (default: 'default_scenario')
            
        Returns:
            Parsed scenario dictionary or None
        """
        scenario_content = self.get_prompt(key)
        
        if not scenario_content:
            return None
        
        # Try YAML first (also handles JSON as YAML is a superset)
        try:
            return yaml.safe_load(scenario_content)
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse scenario YAML: {e}")
            return None
    
    def reload(self) -> None:
        """Force reload prompts from the API."""
        self._cache.clear()
        self._prompts_loaded = False
        self._fetch_all_prompts()
    
    def format_persona_prompt(
        self,
        persona_name: str,
        persona_role: str,
        company_name: str,
        personality: str,
        private_knowledge: str,
        shared_facts: str,
        timeline: str,
        knows_about_others: str,
        stress_modifier: str = ""
    ) -> str:
        """
        Format the persona system prompt with the given values.
        
        Uses the 'persona_system_prompt' template from the database.
        """
        template = self.get_prompt("persona_system_prompt")
        
        if not template:
            logger.error("persona_system_prompt not found in database!")
            # Use a minimal fallback
            template = "You are {persona_name}, {persona_role}. {personality}"
        
        return template.format(
            persona_name=persona_name,
            persona_role=persona_role,
            company_name=company_name,
            personality=personality,
            private_knowledge=private_knowledge,
            shared_facts=shared_facts,
            timeline=timeline,
            knows_about_others=knows_about_others,
            stress_modifier=stress_modifier
        )


# Global singleton instance
_prompt_service: Optional[PromptService] = None


def get_prompt_service() -> PromptService:
    """Get the global PromptService instance."""
    global _prompt_service
    if _prompt_service is None:
        _prompt_service = PromptService()
    return _prompt_service
