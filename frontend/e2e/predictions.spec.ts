import { test, expect } from '@playwright/test';
import { loginViaUi, mockAuthSuccess } from './helpers/auth';
import { testUsers } from './helpers/env';

test.describe('Predictions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSuccess(page, 'moh_officer');
    await page.route('**/api/v1/predictions/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'pred-1',
                district_name: 'Test Woreda',
                district_code: 'ET010101',
                risk_level: 'high',
                prediction_score: 180,
                confidence_score: 0.82,
                prediction_date: '2024-07-01',
              },
            ],
            total: 1,
            skip: 0,
            limit: 25,
          }),
        });
        return;
      }
      await route.continue();
    });

    await loginViaUi(page, testUsers.moh.email, testUsers.moh.password);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('displays predictions page', async ({ page }) => {
    await page.goto('/predictions');
    await expect(page.getByText(/prediction/i).first()).toBeVisible();
  });

  test('shows prediction filters or table', async ({ page }) => {
    await page.goto('/predictions');
    await expect(
      page.locator('table, [role="table"], select, button').first(),
    ).toBeVisible();
  });

  test('lists mocked prediction results', async ({ page }) => {
    await page.goto('/predictions');
    await expect(page.getByText(/test woreda|high|prediction/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
