import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { CARD_PREFS_KEY, DESKTOP, openStudio, pngSize, previewSignature, setRange } from './helpers/studio';

/**
 * Aura Social Studio en un navegador real: apertura, tarjetas con perfil, exportación PNG/JPG y
 * accesibilidad. La grabación y el recorte de vídeo están en social-studio-video.spec.ts.
 */

test.describe('Aura Social Studio · apertura', () => {
  test('se abre con Ctrl+Mayús+C, cabe en la pantalla y se cierra con Escape', async ({ page }) => {
    const dialog = await openStudio(page);

    const box = await dialog.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box, 'el diálogo debe tener tamaño').not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1); // sin desbordar a los lados

    // Sin barra de desplazamiento horizontal en la página
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('las cuatro pestañas existen y se pueden recorrer con las flechas del teclado', async ({ page }) => {
    const dialog = await openStudio(page, 'Grabar');
    const tabs = dialog.getByRole('tablist', { name: 'Secciones del estudio' }).getByRole('tab');
    await expect(tabs).toHaveCount(4);

    await dialog.getByRole('tab', { name: 'Grabar' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('tab', { name: 'Vista previa' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(dialog.getByRole('tab', { name: 'Exportar' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Exportar sin nada generado explica qué hacer', async ({ page }) => {
    const dialog = await openStudio(page, 'Exportar');
    await expect(dialog.getByText('Todavía no hay nada que exportar')).toBeVisible();
    await dialog.getByRole('button', { name: 'Diseñar una tarjeta' }).click();
    await expect(dialog.getByRole('tab', { name: 'Tarjetas' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Aura Social Studio · tarjetas', () => {
  test('la vista previa se dibuja (no queda en blanco) y la ventana no se cuelga', async ({ page }) => {
    await openStudio(page, 'Tarjetas');
    await expect.poll(() => previewSignature(page), { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test('cambiar de paleta cambia lo dibujado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
    const dialog = await openStudio(page, 'Tarjetas');
    await dialog.getByRole('tab', { name: 'Estilo' }).click();
    await expect.poll(() => previewSignature(page)).toBeGreaterThan(0);

    const before = await previewSignature(page);
    await dialog.getByRole('radio', { name: 'Atardecer' }).click();
    await expect.poll(() => previewSignature(page)).not.toBe(before);
    await expect(dialog.getByRole('radio', { name: 'Atardecer' })).toHaveAttribute('aria-checked', 'true');
  });

  test('cada pestaña del editor empieza arriba (no hereda el desplazamiento de la anterior)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
    const dialog = await openStudio(page, 'Tarjetas');
    await dialog.getByRole('tab', { name: 'Contenido' }).click();
    const panel = dialog.getByRole('tabpanel').last();
    await panel.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await dialog.getByRole('tab', { name: 'Estilo' }).click();
    const top = await dialog.getByRole('tabpanel').last().evaluate((el) => el.scrollTop);
    expect(top).toBe(0);
  });

  test('perfil: limpia el usuario, lo dibuja en la tarjeta y lo recuerda al recargar', async ({ page }, testInfo) => {
    test.setTimeout(60_000); // exportar imágenes es pesado si otras pruebas corren en paralelo
    test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
    const dialog = await openStudio(page, 'Tarjetas');
    await dialog.getByRole('tab', { name: 'Contenido' }).click();
    await expect.poll(() => previewSignature(page, 'bottom')).toBeGreaterThan(0);
    const without = await previewSignature(page, 'bottom');

    await dialog.getByRole('switch', { name: 'Mostrar mi perfil en la tarjeta' }).click();
    const handle = dialog.getByLabel('Usuario de Instagram');
    await handle.fill('@dhonkio music!');
    await expect(handle).toHaveValue('dhonkiomusic'); // sin arroba, espacios ni signos

    await expect.poll(() => previewSignature(page, 'bottom')).not.toBe(without); // la insignia aparece

    // Se guarda y sobrevive a una recarga
    await expect
      .poll(() => page.evaluate((k) => localStorage.getItem(k), CARD_PREFS_KEY))
      .toContain('dhonkiomusic');
    await page.reload();
    await page.waitForTimeout(1200);
    await page.keyboard.press('Control+Shift+KeyC');
    const again = page.getByRole('dialog', { name: /Aura Social Studio/ });
    await expect(again).toBeVisible();
    await again.getByRole('tab', { name: 'Tarjetas' }).click();
    await again.getByRole('tab', { name: 'Contenido' }).click();
    await expect(again.getByRole('switch', { name: 'Mostrar mi perfil en la tarjeta' })).toHaveAttribute('aria-checked', 'true');
    await expect(again.getByLabel('Usuario de Instagram')).toHaveValue('dhonkiomusic');
  });

  test('exporta PNG a 1080×1920 y JPG mucho más ligero', async ({ page }, testInfo) => {
    test.setTimeout(60_000); // exportar imágenes es pesado si otras pruebas corren en paralelo
    test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
    const dialog = await openStudio(page, 'Tarjetas');

    const download = async (): Promise<{ name: string; file: Buffer }> => {
      const [d] = await Promise.all([
        page.waitForEvent('download', { timeout: 20_000 }),
        dialog.getByRole('button', { name: /^Descargar (PNG|JPG)/ }).click(),
      ]);
      return { name: d.suggestedFilename(), file: fs.readFileSync((await d.path())!) };
    };

    // PNG (formato por defecto)
    const png = await download();
    expect(png.name).toMatch(/^Aura3D_story_.+\.png$/);
    expect(png.file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // firma PNG
    expect(pngSize(png.file)).toEqual({ width: 1080, height: 1920 });

    // JPG
    await dialog.getByRole('radio', { name: 'JPG' }).click();
    await expect(dialog.getByRole('button', { name: /^Descargar JPG/ })).toBeVisible();
    const jpg = await download();
    expect(jpg.name).toMatch(/^Aura3D_story_.+\.jpg$/);
    expect(jpg.file.subarray(0, 2).toString('hex')).toBe('ffd8'); // firma JPEG
    expect(jpg.file.length, `JPG ${jpg.file.length} B vs PNG ${png.file.length} B`).toBeLessThan(png.file.length / 2);
    expect(jpg.file.length).toBeLessThan(1.5 * 1024 * 1024);
  });

  test('quitar el grano reduce el peso del PNG (aunque sigue pesando varios cientos de KB: para ligero, JPG)', async ({ page }, testInfo) => {
    test.setTimeout(60_000); // exportar imágenes es pesado si otras pruebas corren en paralelo
    test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
    const dialog = await openStudio(page, 'Tarjetas');
    const sizeOfDownload = async (): Promise<number> => {
      const [d] = await Promise.all([
        page.waitForEvent('download', { timeout: 20_000 }),
        dialog.getByRole('button', { name: /^Descargar PNG/ }).click(),
      ]);
      return fs.statSync((await d.path())!).size;
    };

    const withGrain = await sizeOfDownload();
    await dialog.getByRole('tab', { name: 'Estilo' }).click();
    await setRange(dialog.getByRole('slider', { name: 'Grano de película' }), 0);
    const withoutGrain = await sizeOfDownload();

    testInfo.annotations.push({
      type: 'tamaños PNG',
      description: `con grano ${(withGrain / 1024).toFixed(0)} KB · sin grano ${(withoutGrain / 1024).toFixed(0)} KB`,
    });
    expect(withoutGrain).toBeLessThan(withGrain * 0.7);
  });
});

test.describe('Aura Social Studio · accesibilidad (WCAG 2.1 AA)', () => {
  for (const tab of ['Grabar', 'Vista previa', 'Tarjetas', 'Exportar']) {
    test(`la pestaña «${tab}» no tiene violaciones`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
      await openStudio(page, tab);
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} elementos · ${v.help}`)
      ).toEqual([]);
    });
  }

  for (const editorTab of ['Diseño', 'Contenido', 'Estilo']) {
    test(`el editor de tarjetas, sección «${editorTab}», no tiene violaciones`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP, 'flujo de escritorio');
      const dialog = await openStudio(page, 'Tarjetas');
      await dialog.getByRole('tab', { name: editorTab }).click();
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} elementos · ${v.help}`)
      ).toEqual([]);
    });
  }
});
