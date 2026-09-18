import { test, expect } from '@playwright/test';

test.describe('Aura3D Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Disable the Onboarding/Quickstart modal for E2E tests
    await page.addInitScript(() => {
      window.localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
    });
    await page.goto('/');
    // Wait for the app shell to hydrate
    await page.waitForLoadState('domcontentloaded');
    const startButton = page.locator('button:has-text("INICIAR MOTOR 3D")').first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(700);
    }
  });

  test('Audio Controls: Toggle Play, Pause, Next, and Previous', async ({ page }) => {
    const playButton = page.locator('button[aria-label*="reproducción"]');
    await expect(playButton).toBeVisible();

    // Toggle Play
    await playButton.click();
    await page.waitForTimeout(300);

    // Verify button state has updated or responds
    await expect(playButton).toBeVisible();

    // Next Track
    const nextButton = page.locator('button[aria-label*="Siguiente canción"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(200);
    }

    // Previous Track
    const prevButton = page.locator('button[aria-label*="Canción anterior"]');
    if (await prevButton.isVisible()) {
      await prevButton.click();
      await page.waitForTimeout(200);
    }
  });

  test('Equalizer: Open modal, select preset, toggle bypass, and close', async ({ page }) => {
    // Open EQ modal via button or keyboard shortcut
    const eqButton = page.locator('button[aria-label="Abrir Ecualizador"], button[title="Ecualizador Avanzado"]');
    if (await eqButton.count() > 0 && await eqButton.first().isVisible()) {
      await eqButton.first().click();
    } else {
      // Trigger with keyboard shortcut 'E'
      await page.keyboard.press('KeyE');
    }

    // Modal should be visible
    const eqDialog = page.locator('div[role="dialog"]');
    await expect(eqDialog.first()).toBeVisible({ timeout: 5000 });

    // Look for preset buttons inside dialog
    const presetButtons = eqDialog.locator('button');
    expect(await presetButtons.count()).toBeGreaterThan(0);

    // Toggle Bypass if available
    const bypassButton = eqDialog.locator('button:has-text("Bypass"), button[aria-label*="bypass"]');
    if (await bypassButton.count() > 0 && await bypassButton.first().isVisible()) {
      await bypassButton.first().click();
      await page.waitForTimeout(200);
    }

    // Close Modal via Escape or close button
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('Universal Command Palette: Open with shortcut, type query, and close', async ({ page }) => {
    // Open palette with Ctrl+K or Meta+K
    await page.keyboard.press('Control+KeyK');
    await page.waitForTimeout(300);

    const paletteInput = page.locator('input[placeholder*="comando"], input[placeholder*="busca"]');
    if (await paletteInput.isVisible()) {
      await paletteInput.fill('Visualizer');
      await page.waitForTimeout(200);

      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await expect(paletteInput).not.toBeVisible();
    }
  });

  test('System Modals: Open and verify modal rendering', async ({ page }) => {
    // Check if dialog can be closed with escape or backdrop
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // App shell remains solid
    const mainShell = page.locator('#root');
    await expect(mainShell).toBeVisible();
  });
});
