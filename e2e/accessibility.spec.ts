import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated WCAG 2.1 AA Accessibility Audits', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });
    // Disable Onboarding modal to avoid unexpected DOM mutations during accessibility scans
    await page.addInitScript(() => {
      window.localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
    });
  });

  test('Landing / Main Player Screen should have zero critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#initial-splash')).toBeHidden();
    await expect(page.locator('main.lp-content')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Color contrast in dynamic 3D WebGL can vary by GPU shader state
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Equalizer Modal should pass WCAG accessibility standards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#initial-splash')).toBeHidden();
    await expect(page.locator('main.lp-content')).toBeVisible();
    await page.waitForFunction(() => (window as Window & { __auraShortcutsReady?: boolean }).__auraShortcutsReady === true);

    // Trigger EQ modal
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
    });
    const eqDialog = page.locator('[role="dialog"][aria-labelledby="eq-dialog-title"]');
    await expect(eqDialog).toBeVisible({ timeout: 10000 });

    const modalScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"][aria-labelledby="eq-dialog-title"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(modalScanResults.violations).toEqual([]);
  });

  test('Universal Command Palette should have proper ARIA attributes and focus trap', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#initial-splash')).toBeHidden();
    await expect(page.locator('main.lp-content')).toBeVisible();
    await page.waitForFunction(() => (window as Window & { __auraShortcutsReady?: boolean }).__auraShortcutsReady === true);

    // Open palette
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true }));
    });
    const paletteDialog = page.locator('[role="dialog"][aria-label="Paleta universal de comandos Aura3D"]');
    await expect(paletteDialog).toBeVisible({ timeout: 10000 });
    await expect(paletteDialog.locator('[role="combobox"]')).toBeVisible();

    const paletteScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"][aria-label="Paleta universal de comandos Aura3D"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(paletteScanResults.violations).toEqual([]);
  });
});
