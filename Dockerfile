# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python dependencies
FROM python:3.11-slim AS backend-builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml ./
COPY src/ ./src/
COPY backend/ ./backend/
RUN uv sync

# Stage 3: Final runtime image
FROM python:3.11-slim
WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy Python app and dependencies from builder
COPY --from=backend-builder /app/.venv /app/.venv
COPY --from=backend-builder /app/src /app/src
COPY --from=backend-builder /app/backend /app/backend
COPY --from=backend-builder /app/pyproject.toml /app/pyproject.toml

# Copy frontend static build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create directories for persistent data
RUN mkdir -p /app/data /app/metadata

# Expose only backend port (serves both API and frontend static files)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start backend (serves both API and frontend static files)
CMD ["/app/.venv/bin/uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
