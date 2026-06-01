# MalaSafe Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Base image with dependencies
FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies (Will now use wheels, avoiding compilation)
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Development image
FROM base AS development

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Development command (with hot reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 3: Production image
FROM base AS production

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 malasafe && \
    chown -R malasafe:malasafe /app

USER malasafe

# Expose port
EXPOSE 8000

# Production command (optimized)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
