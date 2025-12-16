FROM python:3.11-slim

# Install Node.js and system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy Python project files
COPY pyproject.toml ./
COPY src/ ./src/
COPY backend/ ./backend/

# Install Python dependencies
RUN uv sync

# Copy frontend
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Back to app root
WORKDIR /app

# Create directories for persistent data
RUN mkdir -p /app/data /app/metadata

# Expose only backend port (serves both API and frontend static files)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start script - only need backend since frontend is static export
CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
