import { test, type Page } from '@playwright/test';

/**
 * Arnés de medición de rendimiento (temporal). Se ejecuta con CI=true para medir
 * contra el build de producción (vite preview) y no contra el dev server.
 */

const INIT = () => {
  (window as unknown as { __longTasks: number[] }).__longTasks = [];
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        (window as unknown as { __longTasks: number[] }).__longTasks.push(e.duration);
      }
    });
    po.observe({ type: 'longtask', buffered: true });
  } catch {
    /* longtask no soportado en este navegador */
  }
};

async function measure(page: Page, label: string) {
  const data = await page.evaluate(async () => {
    const raf: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        raf.push(now - last);
        last = now;
        if (now - start < 3000) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    raf.shift();
    const sorted = [...raf].sort((a, b) => a - b);
    const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const lt = (window as unknown as { __longTasks?: number[] }).__longTasks ?? [];
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const all = Array.from(document.querySelectorAll('*'));
    return {
      frames: raf.length,
      fpsMean: raf.length > 0 ? +(1000 / (raf.reduce((a, b) => a + b, 0) / raf.length)).toFixed(1) : 0,
      frameP95: +p(0.95).toFixed(1),
      frameMax: +(sorted[sorted.length - 1] ?? 0).toFixed(1),
      longTasks: lt.length,
      longTaskTotalMs: +lt.reduce((a, b) => a + b, 0).toFixed(1),
      domainKB: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      jsKB: Math.round(
        res.filter((r) => r.name.endsWith('.js')).reduce((a, r) => a + (r.transferSize || 0), 0) / 1024
      ),
      resources: res.length,
      domNodes: all.length,
      canvases: document.querySelectorAll('canvas').length,
      backdropFilters: all.filter((el) => {
        const bf = getComputedStyle(el).backdropFilter;
        return bf && bf !== 'none';
      }).length,
      willChange: all.filter((el) => getComputedStyle(el).willChange !== 'auto').length,
      heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : 0,
      load: nav ? +(nav.loadEventEnd / 1000).toFixed(2) : 0,
    };
  });
  console.log(`PERF ${label} ${JSON.stringify(data)}`);
}

test('landing performance harness', async ({ page }) => {
  test.setTimeout(180000);
  await page.addInitScript(INIT);
  await page.addInitScript(() => {
    window.localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
    window.localStorage.setItem('aura3d_theme_mode', 'dark');
  });

  await page.goto('/');
  await page.locator('#initial-splash').waitFor({ state: 'hidden', timeout: 60000 });
  await page.locator('main.lp-content').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(2500);
  await measure(page, 'LANDING_MOUNT');

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await measure(page, 'LANDING_FULL_SCROLL');

  await page.getByRole('button', { name: /iniciar motor/i }).first().click();
  await page.waitForTimeout(4000);
  await measure(page, 'STUDIO_AFTER_ENTER');
});
