#!/bin/sh
# MalaSafe Backend Docker Entrypoint Script
# This script runs database migrations before starting the application

set -e

echo "=========================================="
echo "MalaSafe Backend Starting..."
echo "=========================================="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h "${DATABASE_URL#*@}" -U "${DATABASE_URL#*://}" 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - continuing"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done

echo "Redis is up - continuing"

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

echo "Migrations complete"

# Create necessary directories
echo "Creating application directories..."
mkdir -p /app/uploads
mkdir -p /app/logs
mkdir -p /app/models

echo "=========================================="
echo "Starting application..."
echo "=========================================="

# Execute the main command
exec "$@"
