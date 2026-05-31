/**
 * E2E Tests: Authentication Flow
 * 
 * Critical path tests for login, session management, and RBAC.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('next=/dashboard');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
      await page.fill('input[name="email"]', 'admin_malasafe@gmail.com');
      await page.fill('input[name="password"]', 'admin1234#');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Should see dashboard content
    await expect(page.locator('h1')).toContainText('Surveillance dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText(/invalid credentials|login failed/i);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin_malasafe@gmail.com');
    await page.fill('input[name="password"]', 'admin1234#');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Should not be able to access dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin_malasafe@gmail.com');
    await page.fill('input[name="password"]', 'admin1234#');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Surveillance dashboard');
  });

  test('should enforce RBAC - public user cannot access dashboard', async ({ page }) => {
    // Login as public user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'public@example.com');
    await page.fill('input[name="password"]', 'Public123!');
    await page.click('button[type="submit"]');
    
    // Should redirect away from dashboard
    await expect(page).not.toHaveURL('/dashboard');
  });
});
