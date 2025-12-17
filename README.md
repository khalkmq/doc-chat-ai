# DocChat AI

A powerful RAG (Retrieval-Augmented Generation) document chat application that lets you upload documents and have intelligent conversations with them using multiple AI providers.

## Features

- **Multi-Provider AI Support**: OpenAI Direct + OpenRouter Models
- **Document Processing**: Upload PDFs or scrape websites for contextual chat
- **Citation System**: Interactive citations with source documents and clickable URLs
- **Session Persistence**: Conversations and documents persist across server restarts

## Tech Stack

**Backend:**

- FastAPI (Python 3.11)
- Milvus Lite (Vector Database)
- LiteLLM (Multi-provider AI routing)
- PyMuPDF (PDF processing)
- Firecrawl (Web scraping)

**Frontend:**

- Next.js 15.5.9
- React 19
- TypeScript 5.7
- Tailwind CSS

## Prerequisites

- Docker (recommended) OR
- Python 3.11+ and Node.js 20+
- API Keys:
  - **OpenAI API key** OR **OpenRouter API key** (at least one required)
  - **Firecrawl API key** (optional, only needed for web scraping)

## Setup

### 1. Configure Environment Variables

**IMPORTANT:** Before running the application, you must create a `.env` file in the project root with your API keys.

1. Copy the example file:

```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:

```bash
OPENAI_API_KEY=sk-proj-your-openai-key-here
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
FIRECRAWL_API_KEY=fc-your-firecrawl-key-here
```

**Note:**

- You need at least one AI provider key (OpenAI OR OpenRouter)
- Firecrawl is optional (only needed for web scraping feature)
- Never commit the `.env` file to git (already in `.gitignore`)

## Running with Docker (Recommended)

### Build the Image

```bash
docker build -t doc-chat .
```

This creates an optimized multi-stage build (~1.9GB).

### Run the Container

```bash
docker run -d \
  -p 8000:8000 \
  --name doc-chat \
  --env-file .env \
  doc-chat
```

The app will be available at **http://localhost:8000**

**Important:** The `--env-file .env` flag loads your API keys into the container. Without this, the app won't work.

**Note:** Due to Milvus Lite limitations with Docker volumes, data persistence in local Docker requires using the container's filesystem. For production deployments (Railway, Render), use their native persistent disk features which work correctly.

### Stop the Container

```bash
docker stop doc-chat
docker rm doc-chat
```

## Running Locally (Development)

### 1. Backend Setup

```bash
# Install Python dependencies
pip install uv
uv sync

# Run backend (port 8000)
uv run uvicorn backend.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server (port 3000)
npm run dev
```

Visit **http://localhost:3000** for local development.

## Using the Application

1. **Open Settings**: Click the settings icon (⚙️) in the top-right
2. **Add API Keys**: Enter your OpenAI and/or OpenRouter API keys
3. **Upload Documents**:
   - Click "Upload" to add PDFs
   - Click "Raw Text" to paste text
   - Click "Website" to scrape a URL
4. **Start Chatting**: Ask questions about your documents
5. **View Citations**: Click citation numbers to see source context

## Architecture

- **Single Port Deployment**: Port 8000 serves both API (`/api/*`) and frontend static files (`/`)
- **Client-Side API Keys**: Keys stored in browser localStorage, never on server
- **Vector Search**: Milvus Lite for fast semantic document retrieval
- **Session Management**: JSON metadata files + Milvus databases for persistence
- **Multi-Stage Docker Build**: Optimized for production (~1.9GB final image)

## File Structure

```
├── backend/             # FastAPI application
│   ├── main.py          # Entry point
│   ├── session.py       # Session management
│   └── routers/         # API endpoints
├── frontend/            # Next.js application
│   └── src/
│       ├── app/         # Pages
│       ├── components/  # React components
│       └── lib/         # API client
├── src/                 # Core Python AI modules
│   ├── document_processing/
│   ├── embeddings/
│   ├── generation/
│   ├── memory/
│   └── vector_database/
├── Dockerfile           # Multi-stage build
└── railway.json         # Railway config
```

## Data Persistence

- **Milvus Databases**: `data/milvus_lite_*.db` (one per session)
- **Session Metadata**: `session_metadata/*.json` (session ID + sources)
- **Volume Mounting**: Required for data survival across restarts

## Security

- No API keys stored on server or in git
- Client-side key management via localStorage
- `.dockerignore` excludes sensitive files
