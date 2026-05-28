# MalaSafe E2E Tests

End-to-end tests for MalaSafe using Playwright.

## Test Coverage

### 1. Authentication (`auth.spec.ts`)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials (error handling)
- ✅ Logout functionality

### 2. Dashboard (`dashboard.spec.ts`)
- ✅ Display summary cards (Total Cases, Alerts, High Risk Districts)
- ✅ Display regional breakdown table
- ✅ Display trend chart
- ✅ Refresh data functionality

### 3. Data Upload (`upload.spec.ts`)
- ✅ Display upload form
- ✅ Validation for invalid files
- ✅ CSV preview before upload
- ✅ Success message after upload

### 4. Risk Map (`map.spec.ts`)
- ✅ Display map container (Leaflet)
- ✅ Display map controls (zoom, etc.)
- ✅ Display district polygons with risk colors
- ✅ Show district details on click
- ✅ Filter map by region

### 5. Predictions (`predictions.spec.ts`)
- ✅ Display predictions page
- ✅ Display generate predictions form
- ✅ Validation for prediction generation
- ✅ Display predictions list/table
- ✅ Show prediction details when clicked
- ✅ Display SHAP explanation for predictions

## Setup

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Install Browsers

```bash
npx playwright install chromium firefox webkit
```

## Running Tests

### Run all tests

```bash
npx playwright test
```

### Run specific test file

```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in headed mode (see browser)

```bash
npx playwright test --headed
```

### Run tests in debug mode

```bash
npx playwright test --debug
```

### Run tests in specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## View Test Report

```bash
npx playwright show-report
```

## Prerequisites

1. **Backend must be running** on `http://localhost:8000`
2. **Frontend must be running** on `http://localhost:3000`
3. **Test user must exist** with credentials:
   - Email: `admin@malasafe.gov.et`
   - Password: `admin123`

## Test Data

Tests use the following test data:
- Admin user: `admin@malasafe.gov.et` / `admin123`
- Sample CSV files are generated in-memory for upload tests
- Tests assume at least some districts and predictions exist in the database

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Ensure backend and frontend are running
- Check network connectivity

### Element not found
- Update selectors in test files to match your UI
- Use Playwright Inspector: `npx playwright test --debug`

### Authentication failing
- Verify test user exists in database
- Check credentials in test files
- Ensure backend auth endpoints are working

## Best Practices

1. **Keep tests independent** - Each test should work standalone
2. **Use data-testid attributes** - Add `data-testid` to important elements for stable selectors
3. **Wait for elements** - Use `waitForSelector` instead of `waitForTimeout` when possible
4. **Clean up after tests** - Reset state if tests modify data
5. **Run tests locally** - Before pushing to CI/CD

## Notes

- Tests are designed to be **realistic but not exhaustive**
- Focus is on **critical user journeys**
- Tests assume a **development environment** with test data
- For production testing, use separate test database and credentials
