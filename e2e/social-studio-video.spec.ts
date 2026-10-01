import { test, expect, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import { DESKTOP, openStudio, probeVideo, setRange } from './helpers/studio';

/**
 * Grabación y recorte real del vídeo en Chrome. Archivo aparte porque estas pruebas graban y
 * recodifican vídeo en tiempo real y son muy sensibles a la carga de la máquina: en serie dentro del
 * archivo y con un reintento. Si tu equipo va justo, ejecútalas solas:
 *   npx playwright test e2e/social-studio-video.spec.ts --workers=1
 */
test.describe.configure({ mode: 'serial', retries: 1 });

test.describe('Aura Social Studio · grabación y recorte', () => {
  test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
  });

  async function record(page: Page, dialog: Locator, seconds: number): Promise<void> {
    await dialog.getByRole('tab', { name: 'Grabar' }).click();
    await dialog.getByRole('radio', { name: 'No', exact: true }).click(); // sin cuenta atrás
    await dialog.getByRole('button', { name: 'Empezar a grabar' }).click();
    await expect(dialog.getByRole('status').filter({ hasText: 'Grabando' })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(seconds * 1000);
    await dialog.getByRole('button', { name: /Detener y ver el resultado/ }).click();
    await expect(dialog.getByRole('tab', { name: 'Vista previa' })).toHaveAttribute('aria-selected', 'true');
  }

  test('la grabación produce un vídeo con datos y la vista previa conoce su duración real', async ({ page }) => {
    test.setTimeout(60_000);
    const dialog = await openStudio(page);
    await record(page, dialog, 3);

    const video = dialog.locator('video');
    await expect(video).toBeVisible();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth), { message: 'el vídeo no tiene datos (0 bytes)' })
      .toBe(1080);

    // Chrome declara Infinity en los webm de MediaRecorder: la app debe haberla calculado
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => Number.isFinite(v.duration) && v.duration > 1.5))
      .toBe(true);

    // La barra de la vista previa no muestra valores rotos
    const text = await dialog.getByRole('tabpanel').innerText();
    expect(text).not.toMatch(/NaN|Infinity/);
  });

  test('recortar de verdad: el tramo exportado dura lo marcado', async ({ page }) => {
    test.setTimeout(120_000);
    const dialog = await openStudio(page);
    await record(page, dialog, 5);

    // Esperar a conocer la duración y marcar de 1,0 s a 3,5 s (2,5 s)
    const start = dialog.getByRole('slider', { name: 'Marca de inicio' });
    const end = dialog.getByRole('slider', { name: 'Marca de fin' });
    await expect.poll(() => end.evaluate((el: HTMLInputElement) => Number(el.max))).toBeGreaterThan(3.6);
    await setRange(end, 3.5);
    await setRange(start, 1.0);

    await dialog.getByRole('tab', { name: 'Exportar' }).click();
    await expect(dialog.getByText('Recorte', { exact: true })).toBeVisible();
    await expect(dialog.getByText(/1:?0?\.0 → 0?:?03\.5|0:01\.0 → 0:03\.5/)).toBeVisible();

    // Mientras no se aplique, no se ofrece descargar el vídeo entero por error
    await expect(dialog.getByRole('button', { name: /^Descargar WEBM|^Descargar MP4/ })).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Aplicar recorte' }).click();
    await expect(dialog.getByRole('progressbar')).toBeVisible();
    await expect(dialog.getByText(/Recorte listo/)).toBeVisible({ timeout: 40_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      dialog.getByRole('button', { name: /^Descargar (WEBM|MP4)/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/_recorte\.(webm|mp4)$/);

    const probe = await probeVideo(page, fs.readFileSync((await download.path())!));
    // Recodificar en tiempo real tiene unas décimas de margen
    expect(probe.duration).toBeGreaterThan(2.0);
    expect(probe.duration).toBeLessThan(3.4);
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);
  });

  test('mover las marcas después de recortar descarta el recorte antiguo', async ({ page }) => {
    test.setTimeout(120_000);
    const dialog = await openStudio(page);
    await record(page, dialog, 4);

    const end = dialog.getByRole('slider', { name: 'Marca de fin' });
    await expect.poll(() => end.evaluate((el: HTMLInputElement) => Number(el.max))).toBeGreaterThan(2.6);
    await setRange(end, 2.0);

    await dialog.getByRole('tab', { name: 'Exportar' }).click();
    await dialog.getByRole('button', { name: 'Aplicar recorte' }).click();
    await expect(dialog.getByText(/Recorte listo/)).toBeVisible({ timeout: 30_000 });

    await dialog.getByRole('tab', { name: 'Vista previa' }).click();
    const endAgain = dialog.getByRole('slider', { name: 'Marca de fin' });
    await expect.poll(() => endAgain.evaluate((el: HTMLInputElement) => Number(el.max))).toBeGreaterThan(2.6);
    await setRange(endAgain, 1.5);
    await dialog.getByRole('tab', { name: 'Exportar' }).click();
    await expect(dialog.getByText(/Recorte listo/)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Aplicar recorte' })).toBeVisible();
  });

  test('el recorte se puede cancelar', async ({ page }) => {
    test.setTimeout(150_000);
    const dialog = await openStudio(page);
    // Clip largo: el recorte dura lo que el tramo, y debe seguir en marcha cuando se pulsa Cancelar
    await record(page, dialog, 12);

    const end = dialog.getByRole('slider', { name: 'Marca de fin' });
    await expect.poll(() => end.evaluate((el: HTMLInputElement) => Number(el.max))).toBeGreaterThan(11);
    await setRange(end, 11.5);

    await dialog.getByRole('tab', { name: 'Exportar' }).click();
    await dialog.getByRole('button', { name: 'Aplicar recorte' }).click();
    await expect(dialog.getByRole('progressbar')).toBeVisible();
    // Pulsación inmediata dentro de la página: con Playwright cada acción tarda en esta página pesada
    await page.evaluate(() => {
      const cancel = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Cancelar'));
      if (!cancel) throw new Error('el recorte terminó antes de poder cancelarlo');
      cancel.click();
    });
    await expect(dialog.getByRole('progressbar')).toHaveCount(0);
    await expect(dialog.getByRole('alert')).toHaveCount(0); // cancelar no es un error
    await expect(dialog.getByText(/Recorte listo/)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Aplicar recorte' })).toBeVisible();
  });

  test('la cuenta atrás se puede cancelar y cerrar el estudio no empieza a grabar solo', async ({ page }) => {
    test.setTimeout(60_000);
    const dialog = await openStudio(page, 'Grabar');
    await dialog.getByRole('radio', { name: '3 s' }).click();

    await dialog.getByRole('button', { name: 'Empezar a grabar' }).click();
    await expect(dialog.getByText(/Empieza en/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog.getByRole('button', { name: 'Empezar a grabar' })).toBeVisible();

    // Cerrar durante la cuenta atrás: pasados los 3 s no debe haber ninguna grabación en marcha
    await dialog.getByRole('button', { name: 'Empezar a grabar' }).click();
    await expect(dialog.getByText(/Empieza en/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(4500);
    await page.keyboard.press('Control+Shift+KeyC');
    const again = page.getByRole('dialog', { name: /Aura Social Studio/ });
    await expect(again).toBeVisible();
    await expect(again.getByText(/REC \d/)).toHaveCount(0);
  });
});
