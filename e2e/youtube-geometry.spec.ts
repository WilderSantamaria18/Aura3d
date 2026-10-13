import { test, expect, type Page } from '@playwright/test';

const VIDEO = {
  id: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  artist: 'jawed',
  duration: 19,
  thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
};

async function installFakeYouTubeApi(page: Page) {
  await page.addInitScript(() => {
    const playerState = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

    class FakePlayer {
      private state = playerState.UNSTARTED;
      private currentTime = 0;
      private duration = 180;
      private frame: HTMLIFrameElement | null = null;
      private events: Record<string, ((event: { data?: number; target: FakePlayer }) => void) | undefined>;

      constructor(element: string | HTMLElement, options: { events?: Record<string, (event: { data?: number; target: FakePlayer }) => void> }) {
        this.events = options.events || {};
        const mount = typeof element === 'string' ? document.getElementById(element) : element;
        if (mount) {
          this.frame = document.createElement('iframe');
          this.frame.dataset.fakeYoutube = 'true';
          this.frame.title = 'Fake YouTube Player';
          mount.appendChild(this.frame);
        }
        setTimeout(() => {
          this.events.onReady?.({ target: this });
          this.playVideo();
        }, 10);
      }

      playVideo() {
        if (this.state === playerState.PLAYING) return;
        this.state = playerState.PLAYING;
        this.events.onStateChange?.({ data: playerState.PLAYING, target: this });
      }
      pauseVideo() {
        this.state = playerState.PAUSED;
        this.events.onStateChange?.({ data: playerState.PAUSED, target: this });
      }
      loadVideoById() {
        this.currentTime = 0;
        this.state = playerState.BUFFERING;
        this.events.onStateChange?.({ data: playerState.BUFFERING, target: this });
        setTimeout(() => this.playVideo(), 20);
      }
      seekTo(seconds: number) {
        this.currentTime = seconds;
      }
      setVolume() {}
      setPlaybackQuality() {}
      getCurrentTime() { return this.currentTime; }
      getDuration() { return this.duration; }
      getPlayerState() { return this.state; }
      getVideoLoadedFraction() { return 1; }
      destroy() {
        this.frame?.remove();
        this.frame = null;
      }
    }

    (window as unknown as { YT: unknown; __auraYtApiReady: boolean }).YT = {
      Player: FakePlayer,
      PlayerState: playerState,
    };
    (window as unknown as { __auraYtApiReady: boolean }).__auraYtApiReady = true;
  });
}

async function mockBackend(page: Page) {
  await page.route('**/api/youtube/search**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [VIDEO] }) })
  );
  await page.route('**/api/youtube/info**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(VIDEO) })
  );
  await page.route('**/api/youtube/related**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );
  await page.route('https://lrclib.net/**', (route) => route.fulfill({ status: 404, body: '{}' }));
  await page.route('https://api.lyrics.ovh/**', (route) => route.fulfill({ status: 404, body: '{}' }));
}

async function openVideoInMiniPlayer(page: Page) {
  await page.addInitScript(() => localStorage.setItem('aura3d_studio_onboarded_v1', 'true'));
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /iniciar motor/i }).first().click();
  await page.getByRole('button', { name: 'Consola MiniPlayer' }).first().click();
  await page.getByRole('button', { name: 'Buscar canciones' }).click();
  await page.getByPlaceholder('Buscar en YouTube Music...').fill('zoo');
  const result = page.getByText(VIDEO.title).first();
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.click();
  await expect(page.locator('[data-youtube-host="mini"] [aria-label="Reproductor de YouTube"]')).toBeVisible({ timeout: 10_000 });
}

async function geometry(page: Page, host: 'mini' | 'cinema') {
  return page.evaluate((hostName) => {
    const slot = document.querySelector(`[data-youtube-host="${hostName}"] [aria-label="Reproductor de YouTube"]`) as HTMLElement | null;
    const portal = document.getElementById('aura-yt-singleton-portal');
    if (!slot || !portal) return null;
    const s = slot.getBoundingClientRect();
    const p = portal.getBoundingClientRect();
    const backdrop = document.querySelector('[data-youtube-theater-layer="backdrop"]') as HTMLElement | null;
    const controls = document.querySelector('[data-youtube-theater-layer="controls"]') as HTMLElement | null;
    return {
      deltaLeft: Math.abs(s.left - p.left),
      deltaTop: Math.abs(s.top - p.top),
      deltaWidth: Math.abs(s.width - p.width),
      deltaHeight: Math.abs(s.height - p.height),
      slotRatio: s.width / s.height,
      portalRatio: p.width / p.height,
      portalZ: Number.parseInt(getComputedStyle(portal).zIndex || '0', 10),
      backdropZ: backdrop ? Number.parseInt(getComputedStyle(backdrop).zIndex || '0', 10) : 0,
      controlsZ: controls ? Number.parseInt(getComputedStyle(controls).zIndex || '0', 10) : 0,
    };
  }, host);
}

function expectAligned(value: Awaited<ReturnType<typeof geometry>>) {
  expect(value).not.toBeNull();
  expect(value!.deltaLeft).toBeLessThanOrEqual(2);
  expect(value!.deltaTop).toBeLessThanOrEqual(2);
  expect(value!.deltaWidth).toBeLessThanOrEqual(2);
  expect(value!.deltaHeight).toBeLessThanOrEqual(2);
  expect(value!.slotRatio).toBeCloseTo(16 / 9, 2);
  expect(value!.portalRatio).toBeCloseTo(16 / 9, 2);
}

test.describe('YouTube · proporciones MiniPlayer y Modo Cine', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop-1440px', 'flujo de escritorio');
    await installFakeYouTubeApi(page);
    await mockBackend(page);
  });

  test('el portal coincide con el hueco 16:9 del MiniPlayer, incluso tras scroll interno', async ({ page }) => {
    await openVideoInMiniPlayer(page);
    await page.waitForTimeout(300);
    expectAligned(await geometry(page, 'mini'));

    const scrolled = await page.locator('[data-youtube-host="mini"]').evaluate((host) => {
      let parent = host.parentElement;
      while (parent) {
        if (parent.scrollHeight > parent.clientHeight + 4) {
          parent.scrollTop = Math.min(60, parent.scrollHeight - parent.clientHeight);
          parent.dispatchEvent(new Event('scroll'));
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    });
    expect(scrolled).toBe(true);
    await page.waitForTimeout(150);
    expectAligned(await geometry(page, 'mini'));
  });

  test('el Modo Cine mantiene 16:9 y coloca el vídeo por encima del backdrop z-80', async ({ page }) => {
    await openVideoInMiniPlayer(page);
    await page.getByRole('button', { name: 'Teatro' }).click();
    await expect(page.locator('[data-youtube-host="cinema"]')).toBeVisible();

    // La entrada usa un spring: se espera a que termine antes de medir el encuadre final.
    await page.waitForTimeout(1300);
    const value = await geometry(page, 'cinema');
    expectAligned(value);
    expect(value!.backdropZ).toBe(80);
    expect(value!.portalZ).toBe(85);
    expect(value!.controlsZ).toBe(90);
    expect(value!.backdropZ).toBeLessThan(value!.portalZ);
    expect(value!.portalZ).toBeLessThan(value!.controlsZ);

    // Los controles siguen por encima del iframe y son clicables.
    await page.getByTitle('Salir del Modo Cine (Esc)').click();
    await expect(page.locator('[data-youtube-host="cinema"]')).toBeHidden();
  });
});
