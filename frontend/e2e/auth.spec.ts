import { test, expect } from '@playwright/test';
import { loginViaUi, expectLoggedInAsAdmin, mockAuthSuccess } from './helpers/auth';
import { E2E_FULL_STACK, isBackendAvailable, testUsers } from './helpers/env';

test.describe('Authentication', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error with invalid credentials (mocked API)', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Incorrect email or password' }),
      });
    });

    await loginViaUi(page, 'invalid@example.com', 'wrongpassword');
    await expect(page.getByText(/incorrect email or password|login failed/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in successfully with mocked API', async ({ page }) => {
    await mockAuthSuccess(page, 'admin');
    await loginViaUi(page, testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/admin', { timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });

  test('full-stack login when backend is available', async ({ page }) => {
    test.skip(!E2E_FULL_STACK, 'Set E2E_FULL_STACK=1 to run against a live backend');

    const backendUp = await isBackendAvailable();
    test.skip(!backendUp, 'Backend is not reachable at E2E_API_URL');

    await loginViaUi(page, testUsers.admin.email, testUsers.admin.password);
    await expectLoggedInAsAdmin(page);
  });
});
