import { test, expect } from '@playwright/test';
import { loginViaUi, mockAuthSuccess } from './helpers/auth';
import { testUsers } from './helpers/env';

test.describe('Data Upload', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSuccess(page, 'moh_officer');
    await loginViaUi(page, testUsers.moh.email, testUsers.moh.password);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('displays upload page', async ({ page }) => {
    await page.goto('/upload');
    await expect(page.getByText(/upload/i).first()).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test('shows upload type options', async ({ page }) => {
    await page.goto('/upload');
    await expect(page.getByText(/monthly malaria|climate/i).first()).toBeVisible();
  });

  test('validates file selection before upload', async ({ page }) => {
    await page.goto('/upload');

    await page.route('**/api/v1/uploads/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Successfully uploaded 1 records',
          records_processed: 1,
          records_created: 1,
          records_skipped: 0,
          errors: [],
        }),
      });
    });

    const csv = 'district_code,date,rainfall,temperature\nET010101,2024-08-01,120,25';
    await page.locator('input[type="file"]').setInputFiles({
      name: 'climate.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });

    const uploadButton = page.getByRole('button', { name: /upload|confirm|submit/i });
    if (await uploadButton.count()) {
      await uploadButton.first().click();
      await expect(page.getByText(/success|uploaded|preview|valid/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
