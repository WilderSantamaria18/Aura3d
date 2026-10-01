import { expect, type Locator, type Page } from '@playwright/test';

/** Utilidades compartidas por las pruebas e2e del Aura Social Studio */

export const DESKTOP = 'Desktop-1440px';
export const ONBOARDING_KEY = 'aura3d_studio_onboarded_v1';
export const CARD_PREFS_KEY = 'aura3d_story_card_v2';

export async function openStudio(page: Page, tab?: string): Promise<Locator> {
  await page.addInitScript((key) => localStorage.setItem(key, 'true'), ONBOARDING_KEY);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  await page.keyboard.press('Control+Shift+KeyC');
  const dialog = page.getByRole('dialog', { name: /Aura Social Studio/ });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  if (tab) await dialog.getByRole('tab', { name: tab, exact: true }).click();
  return dialog;
}

/** Cambia un <input type=range> como lo haría el usuario (React escucha el evento `input`) */
export async function setRange(input: Locator, value: number): Promise<void> {
  await input.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** Suma de los canales de una región del canvas de la vista previa: cambia si cambia lo dibujado */
export async function previewSignature(page: Page, region: 'full' | 'bottom' = 'full'): Promise<number> {
  return page.evaluate((r) => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-label^="Vista previa de la tarjeta"]');
    if (!canvas) return -1;
    const ctx = canvas.getContext('2d')!;
    const y = r === 'bottom' ? Math.round(canvas.height * 0.55) : 0;
    const h = r === 'bottom' ? Math.round(canvas.height * 0.3) : canvas.height;
    const data = ctx.getImageData(0, y, canvas.width, h).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] * 3 + data[i + 2] * 7;
    return sum;
  }, region);
}

/** Dimensiones de un PNG leyendo su cabecera IHDR (sin decodificar la imagen) */
export function pngSize(file: Buffer): { width: number; height: number } {
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

/** Duración (s) y tamaño de un vídeo, calculada en el navegador con el mismo truco que usa la app */
export async function probeVideo(page: Page, file: Buffer): Promise<{ duration: number; width: number; height: number }> {
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
    const video = document.createElement('video');
    video.muted = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('el vídeo exportado no se puede leer'));
    });
    if (!Number.isFinite(video.duration)) {
      await new Promise<void>((resolve) => {
        video.ondurationchange = () => Number.isFinite(video.duration) && resolve();
        video.currentTime = 1e101;
      });
    }
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
  }, file.toString('base64'));
}
