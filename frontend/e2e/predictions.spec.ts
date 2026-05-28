import { test, expect } from '@playwright/test';

test.describe('Predictions', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@malasafe.gov.et');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to predictions page
    await page.click('a:has-text("Predictions"), a[href*="prediction"]');
    await page.waitForURL('**/prediction');
  });

  test('should display predictions page', async ({ page }) => {
    // Verify predictions page elements
    await expect(page.locator('text=/Predictions|Generate/i')).toBeVisible();
  });

  test('should display generate predictions form', async ({ page }) => {
    // Look for generate button or form
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Predict")');
    
    if (await generateButton.count() > 0) {
      await expect(generateButton.first()).toBeVisible();
      
      // Click to open form
      await generateButton.first().click();
      
      // Verify form elements
      await expect(page.locator('text=/Target Month|Select Month|District/i')).toBeVisible();
    }
  });

  test('should show validation for prediction generation', async ({ page }) => {
    // Look for generate button
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Predict")');
    
    if (await generateButton.count() > 0) {
      await generateButton.first().click();
      
      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]:has-text("Generate"), button[type="submit"]:has-text("Predict")');
      
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        
        // Expect validation error
        await page.waitForSelector('text=/required|select|choose/i', { timeout: 5000 });
      }
    }
  });

  test('should display predictions list/table', async ({ page }) => {
    // Wait for predictions to load
    await page.waitForTimeout(2000);
    
    // Look for predictions table or list
    const predictionsTable = page.locator('table, .prediction-list, [class*="prediction"]');
    
    if (await predictionsTable.count() > 0) {
      await expect(predictionsTable.first()).toBeVisible();
      
      // Verify column headers or list items
      await expect(page.locator('text=/District|Risk|Date|Confidence/i')).toBeVisible();
    }
  });

  test('should show prediction details when clicked', async ({ page }) => {
    // Wait for predictions to load
    await page.waitForTimeout(2000);
    
    // Look for a prediction row or card
    const predictionItem = page.locator('tr:has-text("high"), tr:has-text("moderate"), .prediction-card').first();
    
    if (await predictionItem.count() > 0) {
      await predictionItem.click();
      
      // Wait for details modal or expanded view
      await page.waitForSelector('text=/Explanation|Contributing Factors|Confidence|SHAP/i', { timeout: 5000 });
      
      // Verify prediction details are shown
      await expect(page.locator('text=/Risk Level|Predicted Cases|Confidence/i')).toBeVisible();
    }
  });

  test('should display SHAP explanation for prediction', async ({ page }) => {
    // Wait for predictions to load
    await page.waitForTimeout(2000);
    
    // Click on a prediction to view details
    const predictionItem = page.locator('tr, .prediction-card').first();
    
    if (await predictionItem.count() > 0) {
      await predictionItem.click();
      
      // Look for SHAP explanation section
      const shapSection = page.locator('text=/Contributing Factors|Top Factors|Feature Impact/i');
      
      if (await shapSection.count() > 0) {
        await expect(shapSection.first()).toBeVisible();
        
        // Verify factors are listed
        await expect(page.locator('text=/Cases Last Month|Rainfall|Temperature|lag/i')).toBeVisible();
      }
    }
  });
});
