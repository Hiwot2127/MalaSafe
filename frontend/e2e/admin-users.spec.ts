import { test, expect } from '@playwright/test';
import { loginViaUi, mockAuthSuccess, mockAdminUsersApi } from './helpers/auth';
import { testUsers } from './helpers/env';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSuccess(page, 'admin');
    await mockAdminUsersApi(page);
    await loginViaUi(page, testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/admin', { timeout: 10000 });
  });

  test('displays user management page', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText(/user management/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create user/i })).toBeVisible();
  });

  test('lists users from API', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('Test Officer')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('officer@test.com')).toBeVisible();
  });

  test('opens create user modal', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /create user/i }).click();
    await expect(page.getByText(/create new user|full name|email/i).first()).toBeVisible();
  });

  test('submits create user form with mocked API', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /create user/i }).click();

    await page.fill('input[type="email"], input[name="email"]', 'new.user@test.com');
    await page.fill('input[type="text"]', 'New Test User');

    const submit = page.getByRole('button', { name: /create|save|submit/i });
    if (await submit.count()) {
      await submit.first().click();
      await expect(page.getByText(/new.user@test.com|success|created/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
