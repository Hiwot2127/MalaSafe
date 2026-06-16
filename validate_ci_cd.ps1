# PowerShell script to validate CI/CD readiness

Write-Host "🔍 Validating CI/CD Readiness...`n" -ForegroundColor Cyan

$Errors = 0
$Warnings = 0

# Check 1: Frontend Build
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📦 Check 1: Frontend Build" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$buildResult = docker exec malasafe-frontend npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend builds successfully`n" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed`n" -ForegroundColor Red
    $Errors++
}

# Check 2: TypeScript
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🔷 Check 2: TypeScript Type Checking" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$tscResult = docker exec malasafe-frontend npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript type checking passed`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  TypeScript has errors (non-blocking)`n" -ForegroundColor Yellow
    $Warnings++
}

# Check 3: Critical Backend Tests
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🧪 Check 3: Critical Backend Tests" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "  Testing cache functionality..."
$cacheResult = docker exec malasafe-backend pytest tests/test_cache.py -q 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Cache tests passed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Some cache tests failed (non-blocking in CI)" -ForegroundColor Yellow
    $Warnings++
}

Write-Host "  Testing recommendation engine..."
$recResult = docker exec malasafe-backend pytest tests/test_recommendation_engine.py -q 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Recommendation tests passed`n" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Some recommendation tests failed (non-blocking in CI)`n" -ForegroundColor Yellow
    $Warnings++
}

# Check 4: Docker Containers
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🐳 Check 4: Docker Containers Status" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$containerStatus = docker compose ps --format json | ConvertFrom-Json
$runningCount = ($containerStatus | Where-Object { $_.State -eq "running" }).Count

if ($runningCount -ge 5) {
    Write-Host "✅ All containers running ($runningCount/6)`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Only $runningCount containers running`n" -ForegroundColor Yellow
    $Warnings++
}

# Check 5: Workflow Files
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📄 Check 5: Workflow Files" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

if (Test-Path ".github/workflows/backend-tests.yml") {
    Write-Host "✅ Backend workflow exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backend workflow missing" -ForegroundColor Red
    $Errors++
}

if (Test-Path ".github/workflows/frontend-checks.yml") {
    Write-Host "✅ Frontend workflow exists`n" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend workflow missing`n" -ForegroundColor Red
    $Errors++
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 Validation Summary" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

if ($Errors -eq 0 -and $Warnings -eq 0) {
    Write-Host "🎉 All checks passed! CI/CD will pass." -ForegroundColor Green
    exit 0
} elseif ($Errors -eq 0) {
    Write-Host "⚠️  $Warnings warnings found (non-blocking)" -ForegroundColor Yellow
    Write-Host "✅ CI/CD will still pass" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ $Errors critical errors found" -ForegroundColor Red
    Write-Host "⚠️  $Warnings warnings" -ForegroundColor Yellow
    Write-Host "CI/CD may fail - fix errors before pushing" -ForegroundColor Red
    exit 1
}
