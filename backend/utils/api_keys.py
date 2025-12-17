"""
Utility functions for extracting and managing user-provided API keys
"""
import os
from typing import Optional, Dict, List
from fastapi import Request
import logging

logger = logging.getLogger(__name__)

# Model restrictions when using server-provided keys (cost control)
SERVER_ALLOWED_MODELS = {
    "openai": ["gpt-4o-mini"],
    "openrouter": [
        "deepseek/deepseek-v3.2",
        "qwen/qwen3-235b-a22b-2507",
        "qwen/qwen3-32b",
        "xiaomi/mimo-v2-flash:free"
    ]
}

def get_api_keys_from_request(request: Request) -> Dict[str, Optional[str]]:
    """
    Extract API keys from request headers.
    Falls back to environment variables if not provided.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Dictionary with openai, openrouter, and firecrawl keys
    """
    # Try to get keys from headers first
    openai_key = request.headers.get('X-OpenAI-Key') or os.getenv("OPENAI_API_KEY")
    openrouter_key = request.headers.get('X-OpenRouter-Key') or os.getenv("OPENROUTER_API_KEY")
    firecrawl_key = request.headers.get('X-Firecrawl-Key') or os.getenv("FIRECRAWL_API_KEY")
    
    # Log which keys are being used (without revealing the actual keys)
    logger.info(f"API Keys - OpenAI: {'user' if request.headers.get('X-OpenAI-Key') else 'server'}, "
                f"OpenRouter: {'user' if request.headers.get('X-OpenRouter-Key') else 'server'}, "
                f"Firecrawl: {'user' if request.headers.get('X-Firecrawl-Key') else 'server'}")
    
    return {
        "openai": openai_key,
        "openrouter": openrouter_key,
        "firecrawl": firecrawl_key
    }

def get_key_sources(request: Request) -> Dict[str, str]:
    """
    Determine whether keys are user-provided or server-provided.
    
    Returns:
        Dictionary mapping provider to 'user' or 'server'
    """
    return {
        "openai": "user" if request.headers.get('X-OpenAI-Key') else "server",
        "openrouter": "user" if request.headers.get('X-OpenRouter-Key') else "server",
        "firecrawl": "user" if request.headers.get('X-Firecrawl-Key') else "server"
    }

def get_allowed_models(request: Request) -> Dict[str, List[str]]:
    """
    Get allowed models based on key source.
    If using server keys, restrict to budget models.
    If using user keys, allow all models.
    
    Returns:
        Dictionary with 'openai' and 'openrouter' lists of allowed model IDs
    """
    key_sources = get_key_sources(request)
    keys = get_api_keys_from_request(request)
    
    result = {
        "openai": [],
        "openrouter": []
    }
    
    # OpenAI models
    if keys["openai"]:
        if key_sources["openai"] == "server":
            result["openai"] = SERVER_ALLOWED_MODELS["openai"]
        else:
            result["openai"] = None  # None means all models allowed
    
    # OpenRouter models
    if keys["openrouter"]:
        if key_sources["openrouter"] == "server":
            result["openrouter"] = SERVER_ALLOWED_MODELS["openrouter"]
        else:
            result["openrouter"] = None  # None means all models allowed
    
    return result

def validate_api_key(key: Optional[str], placeholder: str = "<YOUR_") -> bool:
    """
    Check if an API key is valid (not None, not empty, not placeholder)
    
    Args:
        key: The API key to validate
        placeholder: String that indicates a placeholder value
        
    Returns:
        True if key is valid, False otherwise
    """
    if not key:
        return False
    if placeholder in key:
        return False
    if len(key) < 10:  # Basic sanity check
        return False
    return True

def get_enabled_features(keys: Dict[str, Optional[str]]) -> Dict[str, bool]:
    """
    Determine which features are enabled based on available API keys
    
    Args:
        keys: Dictionary of API keys
        
    Returns:
        Dictionary of feature flags
    """
    return {
        "chat_enabled": validate_api_key(keys.get("openai")) or validate_api_key(keys.get("openrouter")),
        "web_scraping_enabled": validate_api_key(keys.get("firecrawl"))
    }

def validate_required_keys(keys: Dict[str, Optional[str]]) -> tuple[bool, str]:
    """
    Validate that at least one AI provider key is available (user or server).
    Firecrawl is optional (for web scraping only).
    
    Required:
    - At least one of: OpenAI or OpenRouter (user-provided OR server env var)
    
    Args:
        keys: Dictionary of API keys (already includes fallback to env vars)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if at least one AI provider key is available (user or server)
    has_ai_key = validate_api_key(keys.get("openai")) or validate_api_key(keys.get("openrouter"))
    if not has_ai_key:
        return False, "At least one AI provider key is required (OpenAI or OpenRouter). Configure keys in Railway environment or provide your own."
    
    # Firecrawl is optional (only needed for web scraping)
    return True, ""

