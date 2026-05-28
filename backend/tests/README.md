# MalaSafe Backend - Test Suite

Comprehensive test suite for the MalaSafe backend API.

---

## 📋 Test Coverage

### Test Modules

| Module | Description | Tests |
|--------|-------------|-------|
| `test_auth.py` | Authentication endpoints | 15+ tests |
| `test_operations.py` | Operations dashboard | 12+ tests |
| `test_cache.py` | Redis caching | 10+ tests |
| `test_analytics.py` | Analytics & maps with caching | 15+ tests |

### Coverage Areas

- ✅ **Authentication**: Login, logout, refresh token, cookie auth
- ✅ **Authorization**: RBAC, role-based access control
- ✅ **Rate Limiting**: Login rate limits
- ✅ **Caching**: Redis caching, cache invalidation
- ✅ **Operations**: Health checks, metrics, queue status
- ✅ **Analytics**: Dashboard, trends, risk maps
- ✅ **Error Handling**: 401, 403, 404, 422, 429, 500 responses

---

## 🚀 Running Tests

### Prerequisites

1. **Install test dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Create test database**:
   ```bash
   createdb malasafe_test
   ```

3. **Optional: Start Redis** (for caching tests):
   ```bash
   docker run -d --name malasafe-redis-test -p 6379:6379 redis:7-alpine
   ```

### Run All Tests

```bash
# Run all tests with coverage
pytest

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html
```

### Run Specific Test Modules

```bash
# Run authentication tests only
pytest tests/test_auth.py

# Run operations tests only
pytest tests/test_operations.py

# Run cache tests only
pytest tests/test_cache.py

# Run analytics tests only
pytest tests/test_analytics.py
```

### Run Specific Test Classes

```bash
# Run login tests only
pytest tests/test_auth.py::TestLogin

# Run health check tests only
pytest tests/test_operations.py::TestHealthCheck
```

### Run Specific Test Functions

```bash
# Run single test
pytest tests/test_auth.py::TestLogin::test_login_success

# Run tests matching pattern
pytest -k "login"
pytest -k "cache"
pytest -k "auth"
```

### Run with Markers

```bash
# Run async tests only
pytest -m asyncio

# Run auth-related tests
pytest -m auth

# Run cache-related tests
pytest -m cache
```

---

## 📊 Coverage Reports

### Generate Coverage Report

```bash
# Terminal report
pytest --cov=app --cov-report=term-missing

# HTML report (opens in browser)
pytest --cov=app --cov-report=html
open htmlcov/index.html

# XML report (for CI/CD)
pytest --cov=app --cov-report=xml
```

### Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| **Authentication** | 90%+ | ✅ |
| **Operations** | 85%+ | ✅ |
| **Caching** | 80%+ | ✅ |
| **Analytics** | 75%+ | ✅ |
| **Overall** | 80%+ | 🎯 |

---

## 🔧 Test Configuration

### pytest.ini

Configuration file for pytest with:
- Test discovery patterns
- Coverage settings
- Asyncio mode
- Custom markers
- Warning filters

### conftest.py

Shared fixtures for all tests:
- `db_session`: Fresh database session per test
- `client`: Async HTTP client
- `test_admin_user`: Admin user fixture
- `test_moh_user`: MOH officer fixture
- `test_public_user`: Public user fixture
- `admin_token`: Admin authentication token
- `admin_headers`: Admin authorization headers

---

## 🧪 Writing New Tests

### Test Structure

```python
import pytest
from httpx import AsyncClient

class TestMyFeature:
    """Tests for my feature."""
    
    @pytest.mark.asyncio
    async def test_feature_success(self, client: AsyncClient, admin_headers: dict):
        """Test successful feature usage."""
        response = await client.get(
            "/api/v1/my-feature",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "expected_field" in data
```

### Using Fixtures

```python
@pytest.mark.asyncio
async def test_with_user(self, client: AsyncClient, test_admin_user: User):
    """Test with user fixture."""
    # test_admin_user is already created in database
    assert test_admin_user.role == UserRole.ADMIN

@pytest.mark.asyncio
async def test_with_auth(self, client: AsyncClient, admin_headers: dict):
    """Test with authentication."""
    response = await client.get(
        "/api/v1/protected-endpoint",
        headers=admin_headers
    )
    assert response.status_code == 200
```

### Testing Authentication

```python
@pytest.mark.asyncio
async def test_requires_auth(self, client: AsyncClient):
    """Test endpoint requires authentication."""
    response = await client.get("/api/v1/protected-endpoint")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_requires_admin(self, client: AsyncClient, moh_headers: dict):
    """Test endpoint requires admin role."""
    response = await client.get(
        "/api/v1/admin-only-endpoint",
        headers=moh_headers
    )
    assert response.status_code == 403
```

### Testing Caching

```python
@pytest.mark.asyncio
async def test_endpoint_caching(self, client: AsyncClient, admin_headers: dict):
    """Test endpoint response is cached."""
    # First request
    response1 = await client.get(
        "/api/v1/cached-endpoint",
        headers=admin_headers
    )
    assert response1.status_code == 200
    
    # Second request (should be cached)
    response2 = await client.get(
        "/api/v1/cached-endpoint",
        headers=admin_headers
    )
    assert response2.status_code == 200
    
    # Responses should be identical
    assert response1.json() == response2.json()
```

---

## 🐛 Debugging Tests

### Run with Debug Output

```bash
# Show print statements
pytest -s

# Show local variables on failure
pytest --showlocals

# Stop on first failure
pytest -x

# Drop into debugger on failure
pytest --pdb
```

### Run Specific Failed Tests

```bash
# Re-run only failed tests
pytest --lf

# Re-run failed tests first, then others
pytest --ff
```

---

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/malasafe_test
          REDIS_HOST: localhost
        run: |
          pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📚 Best Practices

### Test Naming

- Use descriptive test names: `test_login_with_invalid_credentials`
- Group related tests in classes: `TestLogin`, `TestLogout`
- Use markers for categorization: `@pytest.mark.auth`

### Test Independence

- Each test should be independent
- Use fixtures for setup/teardown
- Don't rely on test execution order
- Clean up after tests (fixtures handle this)

### Test Coverage

- Aim for 80%+ overall coverage
- Test happy paths and error cases
- Test authentication and authorization
- Test edge cases and boundary conditions

### Performance

- Use `@pytest.mark.asyncio` for async tests
- Use database transactions for speed
- Mock external services when possible
- Keep tests fast (<1s per test)

---

## 🎯 Test Checklist

When adding new features, ensure tests cover:

- [ ] **Happy path**: Feature works as expected
- [ ] **Authentication**: Requires auth if protected
- [ ] **Authorization**: Correct role requirements
- [ ] **Validation**: Invalid input handled
- [ ] **Error handling**: Errors return correct status codes
- [ ] **Edge cases**: Boundary conditions tested
- [ ] **Caching**: Cache behavior verified (if applicable)
- [ ] **Rate limiting**: Rate limits enforced (if applicable)

---

## 📞 Support

- **Documentation**: See main README.md
- **Issues**: Report test failures with full output
- **Coverage**: Check `htmlcov/index.html` for detailed coverage

---

**Last Updated**: May 28, 2026  
**Test Suite Version**: 1.0
