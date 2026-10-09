import { test, expect, type Page } from '@playwright/test';

async function waitForAppReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('#initial-splash')).toBeHidden();
  await expect(page.locator('main.lp-content')).toBeVisible();
  await page.waitForFunction(
    () => (window as Window & { __auraShortcutsReady?: boolean }).__auraShortcutsReady === true
  );
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.focus();
  });
}

test.describe('Aura3D Visual Regression Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and enforce dark mode + completed onboarding for a deterministic test sandbox
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
      window.localStorage.setItem('aura3d_theme_mode', 'dark');
      window.localStorage.setItem('aura3d_accent_color', 'cyan');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
  });

  test('Landing and Studio Layout', async ({ page }) => {
    await waitForAppReady(page);

    // Snapshot Landing View across configured viewports
    await expect(page).toHaveScreenshot('landing.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('Equalizer Modal Visual Test', async ({ page }) => {
    await waitForAppReady(page);

    // Trigger Equalizer modal via keyboard shortcut 'E'
    await page.keyboard.press('KeyE');
    const eqDialog = page.locator('[role="dialog"][aria-labelledby="eq-dialog-title"]');
    await expect(eqDialog).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('equalizer.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('Command Palette Visual Test', async ({ page }) => {
    await waitForAppReady(page);

    // Trigger Universal Command Palette via shortcut Ctrl+K
    await page.keyboard.press('Control+KeyK');
    const cmdPalette = page.locator('[role="combobox"]');
    await expect(cmdPalette).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('command-palette.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});
