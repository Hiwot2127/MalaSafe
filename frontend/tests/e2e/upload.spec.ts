/**
 * E2E Tests: CSV Upload Flow
 * 
 * Critical path tests for file upload, validation, and feedback.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CSV Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login as MOH officer (has upload permissions)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'moh@malasafe.et');
    await page.fill('input[name="password"]', 'MOH123!');
    await page.click('button[type="submit"]');
    await page.goto('/upload');
  });

  test('should show upload page with type selector', async ({ page }) => {
    await expect(page.locator('h1:has-text("Upload data")')).toBeVisible();
    
    // Should show type options
    await expect(page.locator('text=Monthly malaria')).toBeVisible();
    await expect(page.locator('text=Climate')).toBeVisible();
  });

  test('should download template CSV', async ({ page }) => {
    // Click download template button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Example CSV")');
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/malaria.*template\.csv/i);
  });

  test('should upload valid CSV and show preview', async ({ page }) => {
    // Create a valid CSV file
    const csvContent = `organisationunitid,Eth_Month_Year,Travel,Positive,Tests
JgBKioqJo5h,Ginbot 2016,17,89,823
JgBKioqJo5h,Sene 2016,5,42,510`;
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-malaria.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    // Should show preview modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Preview')).toBeVisible();
    
    // Should show valid rows count
    await expect(page.locator('text=2 valid')).toBeVisible();
  });

  test('should show validation errors for invalid CSV', async ({ page }) => {
    // Create an invalid CSV file (missing required columns)
    const csvContent = `organisationunitid,Positive
JgBKioqJo5h,89`;
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    // Should show preview modal with errors
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Should show error tab
    await page.click('button:has-text("Invalid")');
    await expect(page.locator('text=Missing required column')).toBeVisible();
  });

  test('should confirm upload and show progress', async ({ page }) => {
    const csvContent = `organisationunitid,Eth_Month_Year,Travel,Positive,Tests
JgBKioqJo5h,Ginbot 2016,17,89,823`;
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-malaria.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    // Wait for preview
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Click confirm
    await page.click('button:has-text("Confirm Upload")');
    
    // Should show progress indicator
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // Wait for success
    await expect(page.locator('text=imported')).toBeVisible({ timeout: 10000 });
  });

  test('should show timeline after successful upload', async ({ page }) => {
    const csvContent = `organisationunitid,Eth_Month_Year,Travel,Positive,Tests
JgBKioqJo5h,Ginbot 2016,17,89,823`;
    
    // Mock successful upload response
    await page.route('**/api/v1/uploads/malaria/monthly', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Upload successful',
          records_processed: 1,
          records_created: 1,
          records_skipped: 0,
          errors: [],
          file_id: 'test-file-id',
          stages: [
            { name: 'parse', status: 'ok', count: 1, duration_ms: 50 },
            { name: 'validate', status: 'ok', count: 1, duration_ms: 100 },
            { name: 'insert', status: 'ok', count: 1, duration_ms: 200 },
          ],
        }),
      });
    });
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-malaria.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('button:has-text("Confirm Upload")');
    
    // Should show timeline
    await expect(page.locator('text=Timeline')).toBeVisible();
    await expect(page.locator('text=parse')).toBeVisible();
    await expect(page.locator('text=validate')).toBeVisible();
    await expect(page.locator('text=insert')).toBeVisible();
  });

  test('should handle upload failure gracefully', async ({ page }) => {
    // Mock failed upload
    await page.route('**/api/v1/uploads/malaria/monthly', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Upload failed' }),
      });
    });
    
    const csvContent = `organisationunitid,Eth_Month_Year,Travel,Positive,Tests
JgBKioqJo5h,Ginbot 2016,17,89,823`;
    
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-malaria.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('button:has-text("Confirm Upload")');
    
    // Should show error toast
    await expect(page.locator('[role="alert"]:has-text("Upload failed")')).toBeVisible();
  });

  test('should prevent public users from uploading', async ({ page }) => {
    // Logout and login as public user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'public@example.com');
    await page.fill('input[name="password"]', 'Public123!');
    await page.click('button[type="submit"]');
    
    // Try to access upload page
    await page.goto('/upload');
    
    // Should redirect or show access denied
    await expect(page).not.toHaveURL('/upload');
  });
});
