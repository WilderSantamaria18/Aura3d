import { test, expect, type Page } from '@playwright/test';

/**
 * Fase 3 — Arranque a prueba de teclado.
 * Cubre las tres conductas que se corrigieron en LandingMinimal:
 *  1. Enter solo lanza el motor con el foco en el documento (antes lo lanzaba con
 *     cualquier Enter, incluido el de un botón o enlace enfocado).
 *  2. El indicador de estado se anuncia a los lectores de pantalla.
 *  3. El rail de progreso es un control operable con teclado.
 */

async function waitForAppReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('#initial-splash')).toBeHidden();
  await expect(page.locator('main.lp-content')).toBeVisible();
  await page.waitForFunction(
    () => (window as Window & { __auraShortcutsReady?: boolean }).__auraShortcutsReady === true,
    undefined,
    { timeout: 30000 }
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
    window.localStorage.setItem('aura3d_theme_mode', 'dark');
    window.localStorage.setItem('aura3d_accent_color', 'cyan');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
});

test('Enter con el foco en el documento lanza el motor', async ({ page }) => {
  await waitForAppReady(page);
  // Esquina superior izquierda: fuera del nav, así que el foco queda en el documento.
  await page.mouse.click(4, 4);
  await page.keyboard.press('Enter');
  await expect(page.locator('main.lp-content')).toBeHidden({ timeout: 6000 });
});

test('Enter sobre un enlace enfocado no lanza el motor', async ({ page }) => {
  await waitForAppReady(page);
  const secondary = page.getByRole('link', { name: 'Ver cómo funciona' });
  await secondary.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await expect(page.locator('main.lp-content')).toBeVisible();
});

test('El indicador de estado se anuncia y el rail es operable con teclado', async ({ page }) => {
  await waitForAppReady(page);

  const status = page.locator('#status-indicator');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');

  const rail = page.locator('#scroll-rail');
  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth < 768) {
    // El rail está oculto por debajo de md; la comprobación solo aplica en pantallas anchas.
    await expect(rail).toBeHidden();
    return;
  }

  await expect(rail).toHaveAttribute('role', 'slider');
  await rail.focus();
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBeGreaterThan(before);
  await expect(rail).toHaveAttribute('aria-valuenow', /^\d+$/);
});
