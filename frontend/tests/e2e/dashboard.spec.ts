/**
 * E2E Tests: Dashboard
 * 
 * Critical path tests for dashboard loading, KPIs, and interactions.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@malasafe.et');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should load dashboard with KPIs', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Surveillance dashboard")');
    
    // Should show KPI cards
    await expect(page.locator('text=Total cases')).toBeVisible();
    await expect(page.locator('text=Active alerts')).toBeVisible();
    await expect(page.locator('text=High risk districts')).toBeVisible();
    
    // KPIs should have numeric values
    const totalCases = await page.locator('[data-testid="total-cases-value"]').textContent();
    expect(totalCases).toMatch(/\d+/);
  });

  test('should show skeleton loader while loading', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/v1/analytics/dashboard', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('/dashboard');
    
    // Should show skeleton
    await expect(page.locator('[class*="animate-pulse"]')).toBeVisible();
  });

  test('should show error state on API failure', async ({ page }) => {
    // Intercept API call to return error
    await page.route('**/api/v1/analytics/dashboard', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
    });
    
    await page.goto('/dashboard');
    
    // Should show error message
    await expect(page.locator('text=Unable to load dashboard')).toBeVisible();
    
    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should retry on error', async ({ page }) => {
    let callCount = 0;
    
    await page.route('**/api/v1/analytics/dashboard', route => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto('/dashboard');
    
    // Should show error
    await expect(page.locator('text=Unable to load dashboard')).toBeVisible();
    
    // Click retry
    await page.click('button:has-text("Retry")');
    
    // Should load successfully
    await expect(page.locator('h1:has-text("Surveillance dashboard")')).toBeVisible();
  });

  test('should navigate to quick links', async ({ page }) => {
    // Click "Upload data" quick link
    await page.click('a:has-text("Upload data")');
    await expect(page).toHaveURL('/upload');
    
    // Go back to dashboard
    await page.goto('/dashboard');
    
    // Click "Risk maps" quick link
    await page.click('a:has-text("Risk maps")');
    await expect(page).toHaveURL('/maps');
  });

  test('should show posture alert when high-risk districts exist', async ({ page }) => {
    // Mock dashboard with high-risk districts
    await page.route('**/api/v1/analytics/dashboard', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          summary: {
            total_positive: 15420,
            active_alerts: 25,
            high_risk_districts: 12,
            period: '2024-01',
          },
          by_region: [],
          recent_trends: [],
        }),
      });
    });
    
    await page.goto('/dashboard');
    
    // Should show critical posture alert
    await expect(page.locator('[data-testid="posture-alert"]')).toBeVisible();
    await expect(page.locator('text=Triage required')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Should still show main content
    await expect(page.locator('h1:has-text("Surveillance dashboard")')).toBeVisible();
    
    // KPIs should stack vertically
    const kpiCards = await page.locator('[data-testid="kpi-card"]').all();
    expect(kpiCards.length).toBeGreaterThan(0);
  });
});
