/**
 * E2E Test - Complete checkout flow
 */

import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should complete full checkout process', async ({ page }) => {
    // 1. Go to home
    await page.goto('http://localhost:3002');
    await expect(page.locator('h1')).toContainText('Bienvenido a Upick');

    // 2. Select university
    await page.click('text=Universidad Nacional de Colombia');
    await expect(page).toHaveURL(/universidad-nacional/);

    // 3. Select restaurant
    await page.click('text=Cafetería Central');
    await expect(page).toHaveURL(/cafeteria-central/);

    // 4. Wait for menu to load
    await page.waitForSelector('text=Bandeja Paisa', { timeout: 5000 });

    // 5. Add product to cart
    const addButton = page.locator('button:has-text("Agregar")').first();
    await addButton.click();

    // 6. Verify cart button appears
    await expect(page.locator('text=Ver carrito')).toBeVisible();

    // 7. Go to checkout
    await page.click('text=Ver carrito');
    await expect(page).toHaveURL(/checkout/);

    // 8. Verify cart items
    await expect(page.locator('text=Bandeja Paisa')).toBeVisible();

    // 9. Select slot (if available)
    const slotButton = page.locator('[data-testid="slot-picker"] button').first();
    if (await slotButton.isVisible()) {
      await slotButton.click();
    }

    // 10. Verify payment button
    const payButton = page.locator('button:has-text("Pagar")');
    await expect(payButton).toBeVisible();

    console.log('✅ Checkout flow test passed');
  });
});


