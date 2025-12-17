"""
Chat API endpoints
"""
import logging
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional

from backend.session import get_session
from backend.utils.api_keys import get_api_keys_from_request

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    model: Optional[str] = None
    use_conversation_history: bool = True

class ChatResponse(BaseModel):
    response: str
    sources: list
    session_id: str

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    req: Request,
    x_session_id: Optional[str] = Header(None)
):
    """
    Send a chat message and get AI response with sources
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required in X-Session-Id header")
    
    keys = get_api_keys_from_request(req)
    session = get_session(
        x_session_id,
        openai_key=keys["openai"],
        openrouter_key=keys["openrouter"],
        firecrawl_key=keys["firecrawl"],

    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or could not be restored")
    
    if not session.rag_generator:
        raise HTTPException(status_code=503, detail="Chat requires OPENAI_API_KEY")
    
    if not session.sources:
        raise HTTPException(status_code=400, detail="No sources uploaded. Upload documents first.")
    
    try:
        # Log chat history before generating response
        logger.info(f"Chat history length: {len(session.chat_history)}")
        if session.chat_history:
            logger.info(f"Last message in history: {session.chat_history[-1].get('role', 'unknown')}")
        logger.info(f"Use conversation history: {request.use_conversation_history}")
        
        # Generate response using RAG with specified model and chat history
        result = session.rag_generator.generate_response(
            request.query, 
            model=request.model,
            chat_history=session.chat_history if request.use_conversation_history else None
        )
        
        # Add to chat history
        session.chat_history.append({
            'role': 'user',
            'content': request.query
        })
        
        session.chat_history.append({
            'role': 'assistant',
            'content': result.response,
            'sources': result.sources_used
        })
        
        return ChatResponse(
            response=result.response,
            sources=result.sources_used,
            session_id=session.session_id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history")
async def get_chat_history(x_session_id: Optional[str] = Header(None)):
    """
    Get chat history for a session
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    session = get_session(x_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"chat_history": session.chat_history, "session_id": session.session_id}

@router.delete("/chat/history")
async def clear_chat_history(x_session_id: Optional[str] = Header(None)):
    """
    Clear chat history for a session
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    session = get_session(x_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.chat_history = []
    
    return {"message": "Chat history cleared", "session_id": session.session_id}
