#!/bin/bash
# Script to run tests properly in CI/CD or locally

set -e

echo "Setting up test environment..."

# Set environment variables for testing
export DATABASE_URL="${TEST_DATABASE_URL:-postgresql+asyncpg://postgres:postgres@localhost:5432/malasafe_test}"
export DATABASE_URL_SYNC="${TEST_DATABASE_URL_SYNC:-postgresql://postgres:postgres@localhost:5432/malasafe_test}"
export ENVIRONMENT=development
export SECRET_KEY=ci-test-secret-key-0123456789-abcdef-32plus
export RATE_LIMIT_ENABLED=false
export CACHE_ENABLED=false
export MONTHLY_CLOSE_ENABLED=false

echo "Running tests..."
pytest --cov=app --cov-report=term-missing --cov-report=xml --cov-report=html -v

echo "Tests completed!"
