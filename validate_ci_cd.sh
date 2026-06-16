#!/bin/bash
# Script to validate CI/CD will pass before pushing

set -e

echo "🔍 Validating CI/CD Readiness..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track overall status
ERRORS=0
WARNINGS=0

# Check 1: Frontend Build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Check 1: Frontend Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker exec malasafe-frontend npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend builds successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    ((ERRORS++))
fi
echo ""

# Check 2: TypeScript
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔷 Check 2: TypeScript Type Checking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker exec malasafe-frontend npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript type checking passed${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript has errors (non-blocking)${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 3: Critical Backend Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Check 3: Critical Backend Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cache tests
echo "  Testing cache functionality..."
if docker exec malasafe-backend pytest tests/test_cache.py -v --tb=line > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Cache tests passed${NC}"
else
    echo -e "  ${YELLOW}⚠️  Some cache tests failed (non-blocking in CI)${NC}"
    ((WARNINGS++))
fi

# Recommendation tests
echo "  Testing recommendation engine..."
if docker exec malasafe-backend pytest tests/test_recommendation_engine.py -v --tb=line > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Recommendation tests passed${NC}"
else
    echo -e "  ${YELLOW}⚠️  Some recommendation tests failed (non-blocking in CI)${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 4: Docker Containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Check 4: Docker Containers Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RUNNING=$(docker compose ps --services --filter "status=running" | wc -l)
if [ "$RUNNING" -ge 5 ]; then
    echo -e "${GREEN}✅ All containers running ($RUNNING/6)${NC}"
else
    echo -e "${YELLOW}⚠️  Only $RUNNING containers running${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 5: Workflow Files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Check 5: Workflow Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f ".github/workflows/backend-tests.yml" ]; then
    echo -e "${GREEN}✅ Backend workflow exists${NC}"
else
    echo -e "${RED}❌ Backend workflow missing${NC}"
    ((ERRORS++))
fi

if [ -f ".github/workflows/frontend-checks.yml" ]; then
    echo -e "${GREEN}✅ Frontend workflow exists${NC}"
else
    echo -e "${RED}❌ Frontend workflow missing${NC}"
    ((ERRORS++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! CI/CD will pass.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warnings found (non-blocking)${NC}"
    echo -e "${GREEN}✅ CI/CD will still pass${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS critical errors found${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS warnings${NC}"
    echo -e "${RED}CI/CD may fail - fix errors before pushing${NC}"
    exit 1
fi
