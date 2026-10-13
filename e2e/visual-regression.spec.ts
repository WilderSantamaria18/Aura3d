import { test, expect, type Page } from '@playwright/test';

type HeroGeometry = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  r: number;
  cx: number;
  cy: number;
  title: { top: number; right: number; bottom: number; left: number };
};

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

  test('Hero ring never overlaps the headline', async ({ page }) => {
    await waitForAppReady(page);

    // El titular entra animado y las fuentes cargan después: se espera a que la
    // geometría publicada por el canvas se estabilice (dos lecturas idénticas).
    await page.waitForFunction(
      () => {
        const w = window as Window & { __auraHeroGeometry?: HeroGeometry; __auraGeoSeen?: string };
        const g = w.__auraHeroGeometry;
        if (!g) return false;
        const stamp = `${Math.round(g.top)}:${Math.round(g.left)}:${Math.round(g.r)}`;
        if (w.__auraGeoSeen === stamp) return true;
        w.__auraGeoSeen = stamp;
        return false;
      },
      undefined,
      { timeout: 20000 }
    );

    const geo = await page.evaluate(
      () => (window as Window & { __auraHeroGeometry?: HeroGeometry }).__auraHeroGeometry as HeroGeometry
    );
    expect(geo).toBeTruthy();

    const overlapX = geo.left < geo.title.right && geo.right > geo.title.left;
    const overlapY = geo.top < geo.title.bottom && geo.bottom > geo.title.top;
    expect(
      overlapX && overlapY,
      `El aro invade el titular · aro=${JSON.stringify(geo)}`
    ).toBe(false);
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
