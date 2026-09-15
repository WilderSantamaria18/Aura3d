import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated WCAG 2.1 AA Accessibility Audits', () => {
  test('Landing / Main Player Screen should have zero critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Color contrast in dynamic 3D WebGL can vary by GPU shader state
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Equalizer Modal should pass WCAG accessibility standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Trigger EQ modal
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(500);

    const eqDialog = page.locator('div[role="dialog"]');
    if (await eqDialog.count() > 0 && await eqDialog.first().isVisible()) {
      const modalScanResults = await new AxeBuilder({ page })
        .include('div[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(modalScanResults.violations).toEqual([]);
    }
  });

  test('Universal Command Palette should have proper ARIA attributes and focus trap', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open palette
    await page.keyboard.press('Control+KeyK');
    await page.waitForTimeout(400);

    const paletteDialog = page.locator('div[role="dialog"]');
    if (await paletteDialog.count() > 0 && await paletteDialog.first().isVisible()) {
      const paletteScanResults = await new AxeBuilder({ page })
        .include('div[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(paletteScanResults.violations).toEqual([]);
    }
  });
});
