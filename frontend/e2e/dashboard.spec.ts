import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@malasafe.gov.et');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should display dashboard summary cards', async ({ page }) => {
    // Verify summary cards are visible
    await expect(page.locator('text=Total Cases')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
    await expect(page.locator('text=High Risk Districts')).toBeVisible();
    
    // Verify numbers are displayed (not just placeholders)
    const totalCasesCard = page.locator('text=Total Cases').locator('..');
    await expect(totalCasesCard).toContainText(/\d+/);
  });

  test('should display regional breakdown table', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Verify table headers
    await expect(page.locator('th:has-text("Region")')).toBeVisible();
    await expect(page.locator('th:has-text("Cases")')).toBeVisible();
    
    // Verify at least one row of data
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible();
  });

  test('should display trend chart', async ({ page }) => {
    // Wait for chart to render (adjust selector based on your chart library)
    await page.waitForSelector('.recharts-wrapper, canvas, svg', { timeout: 10000 });
    
    // Verify chart is visible
    const chart = page.locator('.recharts-wrapper, canvas, svg').first();
    await expect(chart).toBeVisible();
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    // Wait for initial data load
    await page.waitForSelector('text=Total Cases');
    
    // Click refresh button (adjust selector based on your UI)
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label="Refresh"]');
    if (await refreshButton.count() > 0) {
      await refreshButton.first().click();
      
      // Wait for loading indicator or data update
      await page.waitForTimeout(1000);
      
      // Verify data is still displayed
      await expect(page.locator('text=Total Cases')).toBeVisible();
    }
  });
});
