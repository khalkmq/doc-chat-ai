"""
File upload and processing endpoints
"""
import os
import tempfile
import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, List

from backend.session import get_session, update_session_sources
from backend.utils.api_keys import get_api_keys_from_request

logger = logging.getLogger(__name__)
router = APIRouter()

class UploadResponse(BaseModel):
    message: str
    source_info: dict
    session_id: str

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(None),
    request: Request = None
):
    """
    Upload and process a document file (PDF, TXT, MD)
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
    
    # Validate file type
    allowed_extensions = ['.pdf', '.txt', '.md']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            temp_path = tmp_file.name
        
        # Process document
        chunks = session.doc_processor.process_document(temp_path)
        
        # Add source file name to chunks
        for chunk in chunks:
            chunk.source_file = file.filename
        
        # Generate embeddings
        embedded_chunks = session.embedding_generator.generate_embeddings(chunks)
        
        # Create index if first source
        if len(session.sources) == 0:
            session.vector_db.create_index(use_binary_quantization=False)
        
        # Insert into vector DB
        session.vector_db.insert_embeddings(embedded_chunks)
        
        # Track source
        source_info = {
            'name': file.filename,
            'type': 'Document',
            'size': f"{len(content) / 1024:.1f} KB",
            'chunks': len(chunks),
            'uploaded_at': time.strftime("%Y-%m-%d %H:%M")
        }
        session.sources.append(source_info)
        
        # Update session metadata
        update_session_sources(x_session_id, session.sources)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        logger.info(f"Processed {file.filename}: {len(chunks)} chunks")
        
        return UploadResponse(
            message=f"Successfully processed {file.filename}",
            source_info=source_info,
            session_id=session.session_id
        )
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        if 'temp_path' in locals():
            os.unlink(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

class TextUploadRequest(BaseModel):
    text: str
    title: str = "Raw Text"

@router.post("/upload/text", response_model=UploadResponse)
async def upload_text(
    req_body: TextUploadRequest,
    x_session_id: Optional[str] = Header(None),
    request: Request = None
):
    """
    Upload raw text content
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
    
    if not req_body.text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")
    
    try:
        # Save text to temp file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as tmp_file:
            tmp_file.write(req_body.text)
            temp_path = tmp_file.name
        
        # Process as document
        chunks = session.doc_processor.process_document(temp_path)
        
        for chunk in chunks:
            chunk.source_file = req_body.title
        
        embedded_chunks = session.embedding_generator.generate_embeddings(chunks)
        
        if len(session.sources) == 0:
            session.vector_db.create_index(use_binary_quantization=False)
        
        session.vector_db.insert_embeddings(embedded_chunks)
        
        source_info = {
            'name': req_body.title,
            'type': 'Text',
            'size': f"{len(req_body.text)} chars",
            'chunks': len(chunks),
            'uploaded_at': time.strftime("%Y-%m-%d %H:%M")
        }
        session.sources.append(source_info)
        
        # Update session metadata
        update_session_sources(x_session_id, session.sources)
        
        os.unlink(temp_path)
        
        return UploadResponse(
            message=f"Successfully processed text",
            source_info=source_info,
            session_id=session.session_id
        )
        
    except Exception as e:
        logger.error(f"Text upload error: {e}")
        if 'temp_path' in locals():
            os.unlink(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

class URLUploadRequest(BaseModel):
    urls: List[str]

@router.post("/upload/url")
async def upload_urls(
    req_body: URLUploadRequest,
    x_session_id: Optional[str] = Header(None),
    request: Request = None
):
    """
    Upload and scrape website URLs
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
    
    if not session.web_scraper:
        raise HTTPException(status_code=503, detail="Web scraping requires FIRECRAWL_API_KEY")
    
    results = []
    
    for url in req_body.urls:
        try:
            # Scrape website
            chunks = session.web_scraper.scrape_url(url)
            
            if chunks:
                # Add URL to chunk metadata
                for chunk in chunks:
                    chunk.source_file = url
                    if chunk.metadata is None:
                        chunk.metadata = {}
                    chunk.metadata['url'] = url
                
                embedded_chunks = session.embedding_generator.generate_embeddings(chunks)
                
                if len(session.sources) == 0:
                    session.vector_db.create_index(use_binary_quantization=False)
                
                session.vector_db.insert_embeddings(embedded_chunks)
                
                source_info = {
                    'name': url,
                    'type': 'Website',
                    'size': f"{len(chunks)} chunks",
                    'chunks': len(chunks),
                    'uploaded_at': time.strftime("%Y-%m-%d %H:%M"),
                    'url': url
                }
                session.sources.append(source_info)
                
                results.append({"url": url, "status": "success", "chunks": len(chunks)})
            else:
                results.append({"url": url, "status": "failed", "error": "No content extracted"})
                
        except Exception as e:
            logger.error(f"URL scraping error for {url}: {e}")
            results.append({"url": url, "status": "failed", "error": str(e)})
    
    # Update session metadata with all new sources
    update_session_sources(x_session_id, session.sources)
    
    return {"results": results, "session_id": session.session_id}
