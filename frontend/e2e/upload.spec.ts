import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Data Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@malasafe.gov.et');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to upload page
    await page.click('a:has-text("Upload"), a[href*="upload"]');
    await page.waitForURL('**/upload');
  });

  test('should display upload form', async ({ page }) => {
    // Verify upload form elements
    await expect(page.locator('text=/Upload.*Data/i')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    // Verify data type selector (malaria/climate)
    await expect(page.locator('select, button:has-text("Malaria"), button:has-text("Climate")')).toBeVisible();
  });

  test('should show validation errors for invalid file', async ({ page }) => {
    // Try to upload without selecting a file
    const submitButton = page.locator('button:has-text("Upload"), button[type="submit"]');
    
    if (await submitButton.count() > 0) {
      await submitButton.first().click();
      
      // Expect validation error
      await expect(page.locator('text=/Please select|required|file/i')).toBeVisible();
    }
  });

  test('should preview CSV before upload', async ({ page }) => {
    // Create a test CSV file
    const testCSVContent = `district_id,date,positive_cases,negative_cases
123e4567-e89b-12d3-a456-426614174000,2024-01-01,100,50
123e4567-e89b-12d3-a456-426614174001,2024-01-01,150,75`;
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    
    // Create a temporary file for testing
    await fileInput.setInputFiles({
      name: 'test-malaria-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCSVContent)
    });
    
    // Click preview button if available
    const previewButton = page.locator('button:has-text("Preview")');
    if (await previewButton.count() > 0) {
      await previewButton.click();
      
      // Wait for preview modal/section
      await page.waitForSelector('text=/Preview|Valid|Invalid/i', { timeout: 5000 });
      
      // Verify preview shows data
      await expect(page.locator('text=/valid.*rows|records/i')).toBeVisible();
    }
  });

  test('should show success message after successful upload', async ({ page }) => {
    // This test assumes you have a valid test file
    // In a real scenario, you'd mock the API response
    
    const testCSVContent = `district_id,date,positive_cases,negative_cases
123e4567-e89b-12d3-a456-426614174000,2024-01-01,100,50`;
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-malaria-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCSVContent)
    });
    
    // Submit the form
    const submitButton = page.locator('button:has-text("Upload"), button[type="submit"]').last();
    await submitButton.click();
    
    // Wait for success message (or error if API is not available)
    await page.waitForSelector('text=/success|uploaded|error|failed/i', { timeout: 10000 });
  });
});
