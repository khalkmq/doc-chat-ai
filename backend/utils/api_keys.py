"""
Utility functions for extracting and managing user-provided API keys
"""
import os
from typing import Optional, Dict
from fastapi import Request
import logging

logger = logging.getLogger(__name__)

def get_api_keys_from_request(request: Request) -> Dict[str, Optional[str]]:
    """
    Extract API keys from request headers.
    Falls back to environment variables if not provided.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Dictionary with openai, openrouter, firecrawl, and zep keys
    """
    # Try to get keys from headers first
    openai_key = request.headers.get('X-OpenAI-Key') or os.getenv("OPENAI_API_KEY")
    openrouter_key = request.headers.get('X-OpenRouter-Key') or os.getenv("OPENROUTER_API_KEY")
    firecrawl_key = request.headers.get('X-Firecrawl-Key') or os.getenv("FIRECRAWL_API_KEY")
    zep_key = request.headers.get('X-Zep-Key') or os.getenv("ZEP_API_KEY")
    
    # Log which keys are being used (without revealing the actual keys)
    logger.info(f"API Keys - OpenAI: {'user' if request.headers.get('X-OpenAI-Key') else 'server'}, "
                f"OpenRouter: {'user' if request.headers.get('X-OpenRouter-Key') else 'server'}, "
                f"Firecrawl: {'user' if request.headers.get('X-Firecrawl-Key') else 'server'}, "
                f"Zep: {'user' if request.headers.get('X-Zep-Key') else 'server'}")
    
    return {
        "openai": openai_key,
        "openrouter": openrouter_key,
        "firecrawl": firecrawl_key,
        "zep": zep_key
    }

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
        "web_scraping_enabled": validate_api_key(keys.get("firecrawl")),
        "memory_enabled": validate_api_key(keys.get("zep"))
    }
