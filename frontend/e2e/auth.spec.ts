import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'admin@malasafe.gov.et');
    await page.fill('input[name="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Verify dashboard content is visible
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Total Cases')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Fill in with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=/Invalid credentials|Login failed/i')).toBeVisible();
    
    // Verify we're still on login page
    expect(page.url()).toContain('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@malasafe.gov.et');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Click logout button (adjust selector based on your UI)
    await page.click('button:has-text("Logout")');
    
    // Verify redirected to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});
