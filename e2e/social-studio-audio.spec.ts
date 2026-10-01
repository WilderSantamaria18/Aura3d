import { test, expect } from '@playwright/test';

/**
 * Regresión: la opción «Mezcla» del estudio necesita el micrófono y el audio del sistema a la vez.
 * Una versión del motor de audio cerraba uno al activar el otro. Archivo aparte porque necesita
 * lanzar Chrome con un micrófono falso (`launchOptions` no se puede fijar dentro de un `describe`).
 */
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['microphone'],
});

test('activar la mezcla enciende el micrófono Y el audio del sistema, sin que uno cierre al otro', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop-1440px', 'flujo de escritorio');

  await page.addInitScript(() => {
    localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
    // El diálogo real de compartir pantalla no se puede automatizar: se sustituye por un stream con audio
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvas.getContext('2d')!.fillRect(0, 0, 64, 64);
      const video = canvas.captureStream(5);
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const dest = ctx.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      return new MediaStream([...video.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    };
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  await page.keyboard.press('Control+Shift+KeyC');
  const dialog = page.getByRole('dialog', { name: /Aura Social Studio/ });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('tab', { name: 'Grabar', exact: true }).click();

  await dialog.getByRole('radio', { name: /Sistema.*Lo que suena/ }).click();
  await expect(dialog.getByText('Sistema: activo')).toBeVisible({ timeout: 10_000 });

  await dialog.getByRole('radio', { name: /Mezcla/ }).click();
  await expect(dialog.getByText('Micrófono: activo')).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText('Sistema: activo')).toBeVisible(); // el micrófono no cerró el sistema

  await dialog.getByRole('radio', { name: /Sin audio/ }).click();
  await expect(dialog.getByText('Micrófono: apagado')).toBeVisible();
  await expect(dialog.getByText('Sistema: apagado')).toBeVisible();
});
