import { test, expect, type Page } from '@playwright/test';

/**
 * Regresión: «se pone en cargando cuando uso YouTube».
 *  - La canción debe aparecer enseguida aunque el servidor tarde en dar los metadatos
 *    (`/api/youtube/info` tardaba 7 s y se esperaba sin límite).
 *  - Si YouTube no llega a reproducir, el estado no puede quedarse en «Conectando…» para siempre.
 * El backend se simula con page.route: no dependen de la red ni de que YouTube responda.
 */

const VIDEO = {
  id: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  artist: 'jawed',
  duration: 19,
  thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
};

interface StoreSnapshot {
  trackId: string | null;
  title: string | null;
  status: string;
  message: string | null;
  isPlaying: boolean;
}

/** Lee el store de la app. Se importa con la URL EXACTA con la que lo cargó la app: así es la misma instancia. */
async function storeSnapshot(page: Page): Promise<StoreSnapshot> {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((n) => /stores\/playerStore\.ts/.test(n))!;
    const { usePlayerStore } = await import(/* @vite-ignore */ url);
    const s = usePlayerStore.getState();
    return {
      trackId: s.currentTrack?.id ?? null,
      title: s.currentTrack?.title ?? null,
      status: s.playbackStatus,
      message: s.playbackMessage,
      isPlaying: s.isPlaying,
    };
  });
}

async function mockBackend(page: Page, opts: { infoDelayMs: number }) {
  await page.route('**/api/youtube/search**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [VIDEO] }) })
  );
  await page.route('**/api/youtube/info**', async (route) => {
    await new Promise((r) => setTimeout(r, opts.infoDelayMs));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: VIDEO.id, title: 'Me at the zoo (servidor)', artist: 'jawed', duration: 19 }),
    }).catch(() => undefined); // la página puede haber cerrado mientras tanto
  });
  await page.route('**/api/youtube/related**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );
}

async function searchAndPlayFirstResult(page: Page): Promise<number> {
  await page.addInitScript(() => localStorage.setItem('aura3d_studio_onboarded_v1', 'true'));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /iniciar motor/i }).first().click();
  await page.getByRole('button', { name: 'Consola MiniPlayer' }).first().click();
  await page.getByRole('button', { name: 'Buscar canciones' }).click();
  await page.getByPlaceholder('Buscar en YouTube Music...').fill('zoo');
  const result = page.getByText(VIDEO.title).first();
  await expect(result).toBeVisible({ timeout: 15_000 });

  const clickedAt = Date.now();
  await result.click();
  return clickedAt;
}

test.describe('YouTube · la carga no deja la interfaz esperando', () => {
  test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop-1440px', 'flujo de escritorio');
  });

  test('la canción aparece enseguida aunque /info tarde 9 s', async ({ page }) => {
    test.setTimeout(60_000);
    await mockBackend(page, { infoDelayMs: 9000 });
    const clickedAt = await searchAndPlayFirstResult(page);

    await expect.poll(async () => (await storeSnapshot(page)).trackId, { timeout: 8000 }).toBe(`yt_${VIDEO.id}`);
    const elapsed = Date.now() - clickedAt;
    expect(elapsed, `la canción tardó ${elapsed} ms en aparecer`).toBeLessThan(5000); // antes: ≥ 9 s (espera de /info)

    // Se muestra con los datos de la búsqueda, sin esperar al servidor
    const snap = await storeSnapshot(page);
    expect(snap.title).toBe(VIDEO.title);
    expect(snap.isPlaying).toBe(true);
  });

  test('los metadatos del servidor se aplican después, sin bloquear', async ({ page }) => {
    test.setTimeout(60_000);
    await mockBackend(page, { infoDelayMs: 2500 });
    await searchAndPlayFirstResult(page);

    await expect.poll(async () => (await storeSnapshot(page)).title, { timeout: 4000 }).toBe(VIDEO.title);
    await expect
      .poll(async () => (await storeSnapshot(page)).title, { timeout: 15_000 })
      .toBe('Me at the zoo (servidor)');
  });

  test('si el servidor de metadatos falla, la canción suena igualmente', async ({ page }) => {
    test.setTimeout(60_000);
    await mockBackend(page, { infoDelayMs: 0 });
    await page.route('**/api/youtube/info**', (route) => route.fulfill({ status: 500, body: 'error' }));
    await searchAndPlayFirstResult(page);

    await expect.poll(async () => (await storeSnapshot(page)).trackId, { timeout: 8000 }).toBe(`yt_${VIDEO.id}`);
    expect((await storeSnapshot(page)).title).toBe(VIDEO.title);
  });

  test('si YouTube no llega a reproducir, el estado no se queda «conectando» para siempre', async ({ page }) => {
    test.setTimeout(90_000);
    await mockBackend(page, { infoDelayMs: 0 });
    // El reproductor de YouTube no carga (bloqueado, sin red, vídeo no incrustable…)
    await page.route(/youtube\.com\/(iframe_api|embed|s\/player)|youtube-nocookie\.com/, (route) => route.abort());

    await searchAndPlayFirstResult(page);
    await expect.poll(async () => (await storeSnapshot(page)).status, { timeout: 8000 }).toBe('buffering');

    // La vigilancia avisa pasados ~15 s
    await expect.poll(async () => (await storeSnapshot(page)).status, { timeout: 30_000 }).toBe('error');
    expect((await storeSnapshot(page)).message).toMatch(/YouTube no responde/);
  });
});
