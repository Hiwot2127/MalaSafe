import { expect, Page } from '@playwright/test';
import { testUsers } from './env';

export async function loginViaUi(
  page: Page,
  email = testUsers.admin.email,
  password = testUsers.admin.password,
) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

export async function expectLoggedInAsAdmin(page: Page) {
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 15000 });
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function logoutViaUi(page: Page) {
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.count()) {
    await logoutButton.first().click();
    await page.waitForURL('**/login');
  }
}

export async function mockAuthSuccess(page: Page, role: 'admin' | 'moh_officer' = 'admin') {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-test-token',
        token_type: 'bearer',
        force_password_change: false,
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: role === 'admin' ? testUsers.admin.email : testUsers.moh.email,
          full_name: 'E2E Test User',
          role,
          is_active: true,
        },
      }),
    });
  });
}

export async function mockAdminUsersApi(page: Page) {
  await page.route('**/api/v1/admin/users**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '00000000-0000-0000-0000-000000000002',
            email: 'officer@test.com',
            full_name: 'Test Officer',
            role: 'moh_officer',
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ]),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000003',
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role,
          is_active: true,
          created_at: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.continue();
  });
}
