# DocChat AI - Technical Architecture

> **For:** Technical and non-technical stakeholders  
> **Purpose:** Understanding how DocChat AI works under the hood

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [RAG Pipeline](#rag-pipeline)
6. [API Key System](#api-key-system)
7. [Session Management](#session-management)
8. [Deployment Architecture](#deployment-architecture)

---

## Overview

DocChat AI is a **Retrieval-Augmented Generation (RAG)** application that lets users chat with their documents. Instead of relying solely on an AI's general knowledge, DocChat combines:

1. **Your documents** (PDFs, text, websites) as the knowledge base
2. **AI language models** (OpenAI, OpenRouter) to generate responses
3. **Vector search** to find relevant information quickly

**In simple terms:** Upload documents → Ask questions → Get AI answers with cited sources

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Next.js UI │  │ Chat Interface│  │ Document Uploads │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Session    │  │  Document   │  │   Chat Router    │   │
│  │  Management  │  │  Processing │  │                  │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Milvus     │  │   External   │  │  File System │
│   Vector DB  │  │     APIs     │  │   Storage    │
│              │  │ OpenAI/      │  │              │
│ (Embeddings) │  │ OpenRouter/  │  │ (Sessions/   │
│              │  │ Firecrawl    │  │  Metadata)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Core Components

### 1. Frontend (Next.js 15 + React 19)

**Technology:** TypeScript, Tailwind CSS, React  
**Location:** `/frontend/`

**Key Features:**

- Single-page application served as static files
- Chat interface with real-time streaming responses
- Document upload UI (files, URLs, raw text)
- Model selection dropdown
- API key configuration (optional)
- Session persistence via localStorage

**How it works:**

- Built with Next.js in **static export mode** (`output: 'export'`)
- Served directly by FastAPI at the root path `/`
- No server-side rendering - pure client-side React
- Communicates with backend via REST API calls

### 2. Backend (FastAPI + Python 3.11)

**Technology:** FastAPI, Python, LiteLLM  
**Location:** `/backend/`

**Key Responsibilities:**

- Session management (create, verify, delete)
- Document ingestion (PDF, text, web scraping)
- Vector database operations (Milvus)
- Chat request handling with RAG
- API key validation and fallback logic
- Model restriction enforcement

**Key Files:**

- `main.py` - Application entry point, static file serving
- `session.py` - Session lifecycle management
- `routers/chat.py` - Chat endpoint with RAG logic
- `routers/upload.py` - Document processing endpoints
- `routers/sources.py` - Session and source management
- `utils/api_keys.py` - API key handling and restrictions

### 3. RAG Pipeline (Core AI Logic)

**Location:** `/src/`

**Components:**

#### a) Document Processing (`/src/document_processing/`)

```python
# Converts documents into chunks
PDFs → Text Extraction → Intelligent Chunking
URLs → Web Scraping → HTML Parsing → Chunks
```

**What happens:**

- PDFs: Extracted with PyMuPDF, split by pages/paragraphs
- Websites: Scraped with Firecrawl API, cleaned HTML
- Text: Direct chunking with overlap for context

#### b) Embeddings (`/src/embeddings/`)

```python
# Converts text chunks into numbers (vectors)
Text Chunk → OpenAI ada-002 → 1536-dimension vector
```

**Why:** AI can't search text directly - it needs numerical representations. Embeddings capture semantic meaning (e.g., "car" and "automobile" have similar vectors).

#### c) Vector Database (`/src/vector_database/`)

```python
# Stores and searches embeddings
Milvus Lite → In-memory database per session
```

**Why Milvus:** Fast similarity search across thousands of document chunks in milliseconds.

#### d) Generation (`/src/generation/`)

```python
# Generates answers using retrieved context
Question → Vector Search → Top K Chunks → LLM Prompt → Answer
```

**The RAG Process:**

1. User asks: "What is the pricing model?"
2. Question is embedded into a vector
3. Vector search finds 3-5 most relevant chunks
4. Chunks + question sent to LLM (GPT-4, etc.)
5. LLM generates answer citing sources
6. Response streamed back to user

### 4. Vector Database (Milvus Lite)

**Technology:** Milvus Lite (SQLite-backed)  
**Storage:** `data/milvus_lite_<session_id>.db`

**How it works:**

- One database file per session
- Stores embeddings + metadata (source, page number, etc.)
- Performs cosine similarity search
- No separate server - embedded in Python process

**Performance:**

- ~1ms search time for 1000s of vectors
- Supports binary quantization for smaller size

---

## Data Flow

### Document Upload Flow

```
User uploads PDF
       ↓
Frontend sends multipart/form-data
       ↓
Backend /upload endpoint
       ↓
PDF processed → chunks created
       ↓
Chunks embedded with OpenAI
       ↓
Embeddings stored in Milvus
       ↓
Source metadata saved to JSON
       ↓
Success response to frontend
```

### Chat Query Flow

```
User asks question
       ↓
Frontend sends POST /chat
       ↓
Backend receives query + session ID
       ↓
Query embedded into vector
       ↓
Milvus searches for top 5 similar chunks
       ↓
Context + query sent to LLM
       ↓
LLM generates answer with citations
       ↓
Response streamed word-by-word to frontend
       ↓
Frontend displays with clickable citations
```

---

## RAG Pipeline

### What is RAG?

**RAG = Retrieval-Augmented Generation**

Traditional LLMs answer from memory → Limited to training data, can hallucinate

RAG-enhanced LLMs:

1. **Retrieve** relevant information from your documents
2. **Augment** the AI's prompt with that context
3. **Generate** an answer based on retrieved facts

**Benefits:**

- ✅ Accurate answers grounded in your documents
- ✅ Always up-to-date (uses current documents, not training data)
- ✅ Transparent citations (shows which document chunk was used)
- ✅ No fine-tuning required

### How Our RAG Works

#### Step 1: Indexing (Document Processing)

```
Document → Split into chunks (500-1000 chars with overlap)
           ↓
Each chunk gets embedded into a vector
           ↓
Vectors stored in Milvus with metadata
```

**Metadata stored:**

- Source file name
- Chunk text
- Page number (for PDFs)
- URL (for websites)
- Chunk index

#### Step 2: Retrieval (Search)

```
User query: "What are the payment terms?"
           ↓
Query embedded into vector
           ↓
Milvus finds top 5 similar chunk vectors (cosine similarity)
           ↓
Retrieved chunks: [...payment terms context...]
```

**Similarity scoring:**

- Cosine similarity: 0.0 (unrelated) to 1.0 (identical)
- Typical threshold: 0.7+ for relevant results
- Top K = 5 chunks by default

#### Step 3: Generation (Answer)

```
Prompt to LLM:
  System: "Answer based only on these documents:"
  Context: [Retrieved chunks 1-5]
  Question: "What are the payment terms?"
           ↓
LLM generates answer: "According to the contract [1], payment terms are..."
           ↓
Citations mapped back to source documents
```

**Why this works:**

- LLM sees actual document text in its context window
- Can cite specific sources with confidence
- Reduces hallucinations (facts come from documents)

---

## API Key System

### Dual-Mode Operation

DocChat supports **two modes**:

#### 1. Server Keys (Limited Usage)

```
User clicks "Start with Limited Usage"
       ↓
No API keys in localStorage
       ↓
Backend uses environment variables
       ↓
Models restricted to budget tier
```

**Restricted Models:**

- OpenAI: `gpt-4o-mini`
- OpenRouter: `deepseek-v3.2`, `qwen3-235b`, `qwen3-32b`, `mimo-v2-flash`

**Why restrict?** Cost control - these models are cheaper or free.

#### 2. User Keys (Full Access)

```
User configures own API keys in Settings
       ↓
Keys stored in browser localStorage
       ↓
Sent as headers: X-OpenAI-Key, X-OpenRouter-Key
       ↓
Backend uses user keys (no restrictions)
```

**All models available:** GPT-4, Claude, Llama, etc.

### Key Validation Flow

```python
Request arrives
    ↓
Extract headers: X-OpenAI-Key, X-OpenRouter-Key
    ↓
If header present → Use user key
    ↓
If header missing → Fallback to os.getenv()
    ↓
Validate: At least one AI key required (OpenAI OR OpenRouter)
    ↓
Check restrictions: If server key → filter models
```

**Security:**

- User keys never stored on server
- Only sent in HTTP headers per request
- Server keys stored in Railway environment variables

---

## Session Management

### Session Lifecycle

```
User starts app
    ↓
Check localStorage for session ID
    ↓
If found → Verify with backend (/api/session/verify)
    ↓
If valid → Restore session (load sources, chat history)
    ↓
If invalid → Show welcome screen → Create new session
```

### Session Storage

**Per session:**

- **Vector Database:** `data/milvus_lite_<session_id>.db` (~10MB per 1000 pages)
- **Metadata:** `metadata/<session_id>.json` (source list, timestamps)

**Metadata JSON structure:**

```json
{
  "session_id": "abc-123",
  "sources": [
    {
      "name": "contract.pdf",
      "type": "PDF",
      "chunks": 45,
      "uploaded_at": "2025-12-18 10:30"
    }
  ]
}
```

### Session Persistence

**Problem:** Docker containers are ephemeral (data lost on restart)

**Solution:**

- Railway automatically provides persistent disk storage
- Milvus databases and metadata survive restarts
- Sessions persist indefinitely (until user clears localStorage or deletes session)

**Volume mounts:**

- Production: Railway persistent disk
- Local: Docker volume or host directory mount

---

## Deployment Architecture

### Production Stack (Railway)

```
Railway Cloud Platform
    ↓
Docker Container (single process)
    ├── Uvicorn ASGI Server (port 8000)
    ├── FastAPI Backend
    ├── Static Frontend Files
    └── Milvus Lite (embedded)
    ↓
Persistent Disk (sessions + vector DBs)
```

**Environment Variables (Railway):**

- `OPENAI_API_KEY` - Server OpenAI key
- `OPENROUTER_API_KEY` - Server OpenRouter key
- `FIRECRAWL_API_KEY` - Web scraping (optional)

**Routing:**

- `/` - Serves Next.js frontend (static files)
- `/api/*` - FastAPI endpoints
- Port: 8000 (auto-detected by Railway)

### Local Development

**Option 1: Docker**

```bash
docker build -t doc-chat .
docker run -p 8000:8000 --env-file .env doc-chat
```

**Option 2: Separate processes**

```bash
# Terminal 1 - Backend
uv run uvicorn backend.main:app --reload

# Terminal 2 - Frontend
cd frontend && npm run dev
```

---

## Key Technologies Explained

### Why These Choices?

| Technology      | Purpose            | Why We Use It                                 |
| --------------- | ------------------ | --------------------------------------------- |
| **Next.js**     | Frontend framework | Static export mode - no server needed         |
| **FastAPI**     | Backend API        | Fast, async Python with automatic API docs    |
| **Milvus Lite** | Vector database    | Embedded SQLite-based, no separate server     |
| **LiteLLM**     | Multi-provider AI  | Single interface for OpenAI, OpenRouter, etc. |
| **Firecrawl**   | Web scraping       | Clean HTML extraction from websites           |
| **Docker**      | Containerization   | Single portable deployment artifact           |

### Performance Characteristics

**Scalability:**

- Single user per session (no multi-tenancy)
- ~1000 documents per session (20K chunks)
- ~100ms response time per query (excluding LLM)
- LLM streaming: 20-50 tokens/second

**Resource Usage:**

- Memory: ~500MB baseline + 10MB per session
- Disk: ~10MB per 1000 document pages
- CPU: Minimal (most work done by external APIs)

---

## Security & Privacy

### Data Handling

**What's stored on server:**

- Document chunks (embedded vectors)
- Session metadata (source list, timestamps)
- Chat history (until user clears)

**What's NOT stored on server:**

- User API keys (only in browser localStorage)
- User identity/accounts
- Cross-session data

### API Key Security

**User keys:**

- Stored in browser `localStorage` only
- Sent as HTTP headers per request
- Never logged or persisted on server

**Server keys:**

- Stored in Railway environment variables
- Never exposed to frontend
- Rate-limited by provider

---

## Future Improvements

### Potential Enhancements

1. **Multi-user support** - Add authentication and user isolation
2. **Cloud storage** - S3/GCS for document backup
3. **Better citations** - Highlight exact sentences used

---

## Summary

DocChat AI is a **RAG-powered document chat application** that:

1.  Processes documents into searchable vector embeddings
2.  Retrieves relevant context for user queries
3.  Generates AI answers with cited sources
4.  Supports flexible API key modes (server or user)
5.  Runs as a single Docker container on Railway

**Core Innovation:** Combining vector search with LLMs to provide accurate, source-backed answers from your documents.

**Best Use Cases:**

- Research: Query large document sets
- Legal: Search contracts and agreements
- Support: Build internal knowledge bases
- Education: Study materials Q&A
