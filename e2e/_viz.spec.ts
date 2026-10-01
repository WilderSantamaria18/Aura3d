// TEMPORAL: capturas de evaluación. Se borra al terminar.
import { test } from '@playwright/test';
import fs from 'node:fs';
const WAV = 'C:/Users/WAXXIS/AppData/Local/Temp/claude/C--Users-WAXXIS-Documents-proy/dcbaeba5-7873-4a1d-adb1-5fe7f2f0f91d/scratchpad/demo-124bpm.wav';
const MODES = (process.env.VIZ_MODES ?? 'synthwave').split(',');
const PANEL = process.env.VIZ_PANEL === '1';
const EXTRA = (process.env.VIZ_EXTRA ?? '').split(';').filter(Boolean); // nombre|json-de-ajustes|camara
const PRESETS = (process.env.VIZ_PRESETS ?? '').split(',').filter(Boolean);
test('viz', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.addInitScript(() => localStorage.setItem('aura3d_studio_onboarded_v1', 'true'));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /iniciar motor/i }).first().click();
  await page.waitForTimeout(2500);
  const b64 = fs.readFileSync(WAV).toString('base64');
  await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'demo - 124bpm.wav', { type: 'audio/wav' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, b64);
  await page.waitForTimeout(3000);
  const tag = testInfo.project.name;
  for (const mode of MODES) {
    await page.evaluate(async ([m, open]) => {
      const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /stores\/playerStore\.ts/.test(n))!;
      const { usePlayerStore } = await import(/* @vite-ignore */ url);
      usePlayerStore.getState().setVisualizerMode(m);
      usePlayerStore.getState().setVisualizerSettingsOpen(open === '1');
    }, [mode, PANEL ? '1' : '0']);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `test-results/_viz-${tag}-${mode}-a.png` });
    for (const p of PRESETS) {
      const btn = page.getByRole('radio', { name: new RegExp(p, 'i') }).first();
      if (await btn.count()) { await btn.click(); await page.waitForTimeout(2500); await page.screenshot({ path: `test-results/_viz-${tag}-${mode}-${p.replace(/\W/g, '')}.png` }); }
    }
  }
  for (const e of EXTRA) {
    const [name, json, cam] = e.split('|');
    await page.evaluate(async ([j, c]) => {
      const url = performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes('stores/playerStore.ts'))!;
      const { usePlayerStore } = await import(/* @vite-ignore */ url);
      if (j) usePlayerStore.getState().updateBlobSettings(JSON.parse(j));
      if (c) usePlayerStore.getState().setCameraPreset(c);
    }, [json, cam]);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `test-results/_viz-${tag}-x-${name}.png` });
  }
  console.log('ERRORES', JSON.stringify([...new Set(errors)]));
});
