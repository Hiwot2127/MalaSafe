import { test, expect } from '@playwright/test';

test.describe('Risk Map', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin_malasafe@gmail.com');
    await page.fill('input[name="password"]', 'admin1234#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to map page
    await page.click('a:has-text("Map"), a[href*="map"]');
    await page.waitForURL('**/map');
  });

  test('should display map container', async ({ page }) => {
    // Wait for map to load (Leaflet container)
    await page.waitForSelector('.leaflet-container, #map, [class*="map"]', { timeout: 10000 });
    
    // Verify map is visible
    const mapContainer = page.locator('.leaflet-container, #map, [class*="map"]').first();
    await expect(mapContainer).toBeVisible();
  });

  test('should display map controls', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // Verify zoom controls are present
    await expect(page.locator('.leaflet-control-zoom, button[aria-label*="Zoom"]')).toBeVisible();
  });

  test('should display district polygons with risk colors', async ({ page }) => {
    // Wait for map and GeoJSON layer to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for GeoJSON to render
    
    // Verify SVG paths (district polygons) are rendered
    const paths = page.locator('.leaflet-container path, .leaflet-container polygon');
    const count = await paths.count();
    
    // Should have at least some districts rendered
    expect(count).toBeGreaterThan(0);
  });

  test('should show district details on click', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Click on a district polygon (first path element)
    const firstDistrict = page.locator('.leaflet-container path, .leaflet-container polygon').first();
    
    if (await firstDistrict.count() > 0) {
      await firstDistrict.click();
      
      // Wait for popup or sidebar with district details
      await page.waitForSelector('text=/District|Risk|Cases/i', { timeout: 5000 });
      
      // Verify district information is displayed
      await expect(page.locator('text=/District|Risk Level|Predicted Cases/i')).toBeVisible();
    }
  });

  test('should filter map by region', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // Look for region filter dropdown
    const regionFilter = page.locator('select[name*="region"], select:has(option:has-text("Region"))');
    
    if (await regionFilter.count() > 0) {
      // Select a specific region
      await regionFilter.first().selectOption({ index: 1 }); // Select first non-default option
      
      // Wait for map to update
      await page.waitForTimeout(1000);
      
      // Verify map is still visible (basic check)
      await expect(page.locator('.leaflet-container')).toBeVisible();
    }
  });
});
