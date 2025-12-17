"""
Sources management endpoints
"""
import logging
from fastapi import APIRouter, HTTPException, Header, Request
from typing import Optional, List, Dict, Any

from backend.session import get_session, create_session, delete_session, update_session_sources
from backend.utils.api_keys import get_api_keys_from_request, get_enabled_features, validate_required_keys, get_allowed_models, get_key_sources

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/session")
async def create_new_session(request: Request):
    """
    Create a new session with initialized pipeline.
    Requires: At least one AI key (OpenAI or OpenRouter), and Firecrawl.
    """
    keys = get_api_keys_from_request(request)
    
    # Validate required keys
    is_valid, error_msg = validate_required_keys(keys)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        session = create_session(
            openai_key=keys["openai"],
            openrouter_key=keys["openrouter"],
            firecrawl_key=keys["firecrawl"]
        )
        return {
            "session_id": session.session_id,
            "features": get_enabled_features(keys)
        }
    except Exception as e:
        logger.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sources")
async def get_sources(request: Request, x_session_id: Optional[str] = Header(None)):
    """
    Get all sources for a session
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    keys = get_api_keys_from_request(request)
    session = get_session(
        x_session_id,
        openai_key=keys["openai"],
        openrouter_key=keys["openrouter"],
        firecrawl_key=keys["firecrawl"]
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or could not be restored")
    
    return {
        "sources": session.sources,
        "total": len(session.sources),
        "session_id": session.session_id
    }

@router.delete("/sources/{index}")
async def delete_source(
    index: int,
    request: Request,
    x_session_id: Optional[str] = Header(None)
):
    """
    Delete a source by index
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    keys = get_api_keys_from_request(request)
    session = get_session(
        x_session_id,
        openai_key=keys["openai"],
        openrouter_key=keys["openrouter"],
        firecrawl_key=keys["firecrawl"]
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or could not be restored")
    
    if index < 0 or index >= len(session.sources):
        raise HTTPException(status_code=404, detail="Source not found")
    
    removed = session.sources.pop(index)
    
    # Update metadata
    update_session_sources(x_session_id, session.sources)
    
    return {
        "message": f"Removed {removed['name']}",
        "session_id": session.session_id
    }

@router.post("/session/verify")
async def verify_session(request: Request, x_session_id: Optional[str] = Header(None)):
    """
    Verify if a session exists or can be restored from disk
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    keys = get_api_keys_from_request(request)
    session = get_session(
        x_session_id,
        openai_key=keys["openai"],
        openrouter_key=keys["openrouter"],
        firecrawl_key=keys["firecrawl"]
    )
    
    if session:
        return {
            "valid": True,
            "session_id": session.session_id,
            "sources_count": len(session.sources),
            "features": get_enabled_features(keys)
        }
    else:
        return {
            "valid": False,
            "message": "Session not found and could not be restored"
        }

@router.delete("/session")
async def delete_current_session(x_session_id: Optional[str] = Header(None)):
    """
    Delete the current session
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    if delete_session(x_session_id):
        return {"message": "Session deleted", "session_id": x_session_id}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@router.get("/models")
async def get_available_models(request: Request) -> Dict[str, Any]:
    """
    Get available models based on configured API keys and key source.
    Server keys: restricted to budget models
    User keys: unrestricted access to all models
    """
    keys = get_api_keys_from_request(request)
    key_sources = get_key_sources(request)
    allowed_models = get_allowed_models(request)
    
    return {
        "key_sources": key_sources,
        "allowed_models": allowed_models,
        "has_restrictions": (
            (keys["openai"] and key_sources["openai"] == "server") or
            (keys["openrouter"] and key_sources["openrouter"] == "server")
        )
    }
