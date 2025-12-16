"""
Session management and pipeline initialization
"""
import uuid
import logging
import json
import os
from pathlib import Path
from typing import Optional, Dict
from pydantic import BaseModel

from src.document_processing.doc_processor import DocumentProcessor
from src.embeddings.embedding_generator import EmbeddingGenerator
from src.vector_database.milvus_vector_db import MilvusVectorDB
from src.generation.rag import RAGGenerator
from src.web_scraping.web_scraper import WebScraper
from src.memory.memory_layer import NotebookMemoryLayer

logger = logging.getLogger(__name__)

class SessionPipeline(BaseModel):
    """Pipeline for a user session"""
    session_id: str
    doc_processor: Optional[object] = None
    embedding_generator: Optional[object] = None
    vector_db: Optional[object] = None
    rag_generator: Optional[object] = None
    web_scraper: Optional[object] = None
    memory: Optional[object] = None
    sources: list = []
    chat_history: list = []
    
    class Config:
        arbitrary_types_allowed = True

# In-memory session storage (in production, use Redis or DB)
_sessions: Dict[str, SessionPipeline] = {}

# Session metadata directory
SESSION_METADATA_DIR = Path("./session_metadata")
SESSION_METADATA_DIR.mkdir(exist_ok=True)

def _save_session_metadata(session_id: str, sources: list):
    """Save session metadata to disk for persistence (NO API KEYS STORED)"""
    metadata_file = SESSION_METADATA_DIR / f"{session_id[:8]}.json"
    metadata = {
        "session_id": session_id,
        "sources": sources
    }
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved metadata for session {session_id[:8]}")

def _load_session_metadata(session_id: str) -> Optional[dict]:
    """Load session metadata from disk"""
    metadata_file = SESSION_METADATA_DIR / f"{session_id[:8]}.json"
    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            return json.load(f)
    return None

def restore_session(session_id: str, openai_key: str = None, openrouter_key: str = None, firecrawl_key: str = None, zep_key: str = None) -> Optional[SessionPipeline]:
    """Restore a session from existing Milvus database and metadata"""
    # Check if Milvus database exists
    db_path = f"./milvus_lite_{session_id[:8]}.db"
    if not os.path.exists(db_path):
        logger.warning(f"No database found for session {session_id[:8]}")
        return None
    
    logger.info(f"Restoring session {session_id[:8]} from existing database")
    
    try:
        # Initialize core components
        doc_processor = DocumentProcessor()
        embedding_generator = EmbeddingGenerator()
        vector_db = MilvusVectorDB(
            db_path=db_path,
            collection_name=f"collection_{session_id[:8]}"
        )
        
        # Initialize optional components based on API keys
        rag_generator = None
        if (openai_key and openai_key != "<YOUR_OPENAI_API_KEY>") or (openrouter_key and openrouter_key != "<YOUR_OPENROUTER_API_KEY>"):
            rag_generator = RAGGenerator(
                embedding_generator=embedding_generator,
                vector_db=vector_db,
                openai_api_key=openai_key if openai_key and openai_key != "<YOUR_OPENAI_API_KEY>" else None,
                openrouter_api_key=openrouter_key if openrouter_key and openrouter_key != "<YOUR_OPENROUTER_API_KEY>" else None
            )
        
        web_scraper = None
        if firecrawl_key and firecrawl_key != "<YOUR_FIRECRAWL_API_KEY>":
            web_scraper = WebScraper(firecrawl_key)
        
        memory = None
        if zep_key and zep_key != "<YOUR_ZEP_API_KEY>":
            try:
                memory = NotebookMemoryLayer(
                    user_id="api_user",
                    session_id=session_id,
                    create_new_session=False  # Don't create new, try to restore
                )
            except Exception as e:
                logger.warning(f"Could not restore Zep memory: {e}")
        
        # Load sources from metadata if available
        metadata = _load_session_metadata(session_id)
        sources = metadata.get("sources", []) if metadata else []
        
        pipeline = SessionPipeline(
            session_id=session_id,
            doc_processor=doc_processor,
            embedding_generator=embedding_generator,
            vector_db=vector_db,
            rag_generator=rag_generator,
            web_scraper=web_scraper,
            memory=memory,
            sources=sources,
            chat_history=[]
        )
        
        _sessions[session_id] = pipeline
        logger.info(f"Session {session_id[:8]} restored successfully with {len(sources)} sources")
        return pipeline
        
    except Exception as e:
        logger.error(f"Failed to restore session {session_id[:8]}: {e}")
        return None

def create_session(openai_key: str = None, openrouter_key: str = None, firecrawl_key: str = None, zep_key: str = None) -> SessionPipeline:
    """Create a new session with initialized pipeline"""
    session_id = str(uuid.uuid4())
    
    logger.info(f"Creating new session: {session_id}")
    
    try:
        # Initialize core components
        doc_processor = DocumentProcessor()
        embedding_generator = EmbeddingGenerator()
        vector_db = MilvusVectorDB(
            db_path=f"./milvus_lite_{session_id[:8]}.db",
            collection_name=f"collection_{session_id[:8]}"
        )
        
        # Initialize optional components based on API keys
        rag_generator = None
        if (openai_key and openai_key != "<YOUR_OPENAI_API_KEY>") or (openrouter_key and openrouter_key != "<YOUR_OPENROUTER_API_KEY>"):
            rag_generator = RAGGenerator(
                embedding_generator=embedding_generator,
                vector_db=vector_db,
                openai_api_key=openai_key if openai_key and openai_key != "<YOUR_OPENAI_API_KEY>" else None,
                openrouter_api_key=openrouter_key if openrouter_key and openrouter_key != "<YOUR_OPENROUTER_API_KEY>" else None
            )
        
        web_scraper = None
        if firecrawl_key and firecrawl_key != "<YOUR_FIRECRAWL_API_KEY>":
            web_scraper = WebScraper(firecrawl_key)
        
        memory = None
        if zep_key and zep_key != "<YOUR_ZEP_API_KEY>":
            try:
                memory = NotebookMemoryLayer(
                    user_id="api_user",
                    session_id=session_id,
                    create_new_session=True
                )
            except Exception as e:
                logger.warning(f"Could not initialize Zep memory: {e}")
        
        pipeline = SessionPipeline(
            session_id=session_id,
            doc_processor=doc_processor,
            embedding_generator=embedding_generator,
            vector_db=vector_db,
            rag_generator=rag_generator,
            web_scraper=web_scraper,
            memory=memory,
            sources=[],
            chat_history=[]
        )
        
        _sessions[session_id] = pipeline
        
        # Save session metadata for persistence (no API keys)
        _save_session_metadata(session_id, [])
        
        logger.info(f"Session {session_id} created successfully")
        return pipeline
        
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise

def get_session(session_id: str, openai_key: str = None, openrouter_key: str = None, firecrawl_key: str = None, zep_key: str = None) -> Optional[SessionPipeline]:
    """Get an existing session or restore it from disk if available"""
    # Check in-memory first
    if session_id in _sessions:
        return _sessions[session_id]
    
    # Try to restore from disk if not in memory
    logger.info(f"Session {session_id[:8]} not in memory, attempting to restore...")
    return restore_session(session_id, openai_key, openrouter_key, firecrawl_key, zep_key)

def update_session_sources(session_id: str, sources: list):
    """Update session sources and save metadata (NO API KEYS STORED)"""
    if session_id in _sessions:
        _sessions[session_id].sources = sources
        _save_session_metadata(session_id, sources)

def delete_session(session_id: str) -> bool:
    """Delete a session"""
    if session_id in _sessions:
        del _sessions[session_id]
        # Optionally delete metadata file
        metadata_file = SESSION_METADATA_DIR / f"{session_id[:8]}.json"
        if metadata_file.exists():
            metadata_file.unlink()
        logger.info(f"Session {session_id} deleted")
        return True
    return False

def list_sessions() -> list[str]:
    """List all active session IDs"""
    return list(_sessions.keys())
