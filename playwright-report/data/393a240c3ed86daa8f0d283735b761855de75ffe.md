# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-flows.spec.ts >> Aura3D Critical User Flows >> Audio Controls: Toggle Play, Pause, Next, and Previous
- Location: e2e/player-flows.spec.ts:31:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button[aria-label*="reproducción"], button[aria-label*="playback"], button[title*="Reproducir"], button[title*="Pausar"], button[title*="Play"], button[title*="Pause"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('button[aria-label*="reproducción"], button[aria-label*="playback"], button[title*="Reproducir"], button[title*="Pausar"], button[title*="Play"], button[title*="Pause"]').first() with timeout 5000ms
  - waiting for locator('button[aria-label*="reproducción"], button[aria-label*="playback"], button[title*="Reproducir"], button[title*="Pausar"], button[title*="Play"], button[title*="Pause"]').first()

```

```yaml
- banner:
  - text: Aura3D Studio
  - button "Entrar →"
- heading "AURA3D" [level=1]
- paragraph: Estación de audio espacial en tiempo real con shaders WebGL y micro-física acústica.
- text: + + + + OSC-1 // REALTIME FFT
- 'button "MODE: harmonic"'
- text: "48.0 kHz SAMPLING RMS: -14.2 dB Arrastra cualquier audio aquí o examinar FLAC, WAV, MP3, OGG // Inicio instantáneo Cargar"
- button "Iniciar Motor 3D"
- button "Micrófono Directo"
- button "Explorar Consola DSP ↓"
- text: "[ 02 // PROCESAMIENTO DSP & ECUALIZADOR ]"
- heading "Consola Masterizadora de 8 Bandas" [level=2]
- text: DSP-800 MASTER CONSOLE 10-BAND STEREO GRAPHIC EQUALIZER -20dB 0dB +3 L -20dB 0dB +3 R 32Hz
- slider: "75"
- text: +6dB 64Hz
- slider: "65"
- text: +4dB 125Hz
- slider: "80"
- text: +7dB 500Hz
- slider: "50"
- text: 0dB 1kHz
- slider: "60"
- text: +2dB 4kHz
- slider: "85"
- text: +8dB 8kHz
- slider: "70"
- text: +5dB 16kHz
- slider: "78"
- text: "+7dB THD: <0.001% 60 FPS DIRECT HARDWARE DSP"
- button "Explorar Tornamesa Rainbow Void"
- text: "[ 03 // NÚCLEO CINÉTICO DE VINILO ]"
- heading "Tornamesa Virtual Rainbow Void" [level=2]
- text: RAINBOW VOID // DIRECT DRIVE 33 ⅓ RPM HI-FI ROTATIONAL ENGINE SPEED 128.0 BPM PITCH
- slider: "0"
- text: 0 0%
- button "Vórtex"
- button "Caleidoscopio"
- button "Fractal"
- button "Spectrum"
- button "Ir a la Plataforma de Entrada"
- text: SISTEMA LISTO PARA INMERSIÓN
- heading "Inicializar Espacio Acústico 3D" [level=2]
- paragraph: Elige tu método de entrada para sincronizar el motor de audio y sumergirte en el visualizador.
- text: Archivos Locales MP3, WAV, FLAC o examinar Micrófono Directo Captura de voz o instrumentos
- button "Entrar al Visualizador Aura3D"
- text: GPU Shaders • 24-Bit / 48kHz • 0 Latencia Aura3D Workstation | REV 2026.4 ESPACIO Iniciar M Micrófono SCROLL Canales G Modo Galería 48 kHz DSP 10-Band EQ WebGL Shaders
- dialog "Bienvenido a Aura3D Studio":
  - heading "Bienvenido a Aura3D Studio" [level=2]
  - text: ONBOARDING
  - paragraph: Inicialización de tu entorno de visualización y audio inmersivo
  - button "Cerrar modal"
  - text: 1 Arquitectura 2 Visualizador 3 Comandos Aura3D transforma tu música en esculturas 3D en tiempo real mediante análisis de transformada rápida de Fourier (FFT) y shaders WebGL de precisión milimétrica. Audio Local / Spotify
  - paragraph: Arrastra archivos MP3, WAV, FLAC o conecta tu cuenta de Spotify Premium.
  - text: DSP & Ecualizador
  - paragraph: Cadena de ecualización analógica de 5 bandas, limitador y spatial audio 3D.
  - button "Omitir introducción"
  - button "Siguiente"
- status: Volumen ajustado al 85%
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Aura3D Critical User Flows', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |     // Wait for the app shell to hydrate
  7   |     await page.waitForLoadState('domcontentloaded');
  8   | 
  9   |     const dismissOnboardingButton = page
  10  |       .getByRole('button', { name: /Omitir introducción|Cerrar modal|Skip introduction|Close modal/i })
  11  |       .first();
  12  |     if (await dismissOnboardingButton.isVisible().catch(() => false)) {
  13  |       await dismissOnboardingButton.click();
  14  |       await page.waitForTimeout(200);
  15  |     }
  16  | 
  17  |     const enterVisualizerButton = page
  18  |       .getByRole('button', { name: /Entrar al Visualizador Aura3D|Enter Aura3D Visualizer/i })
  19  |       .first();
  20  |     if (await enterVisualizerButton.isVisible().catch(() => false)) {
  21  |       await enterVisualizerButton.click({ timeout: 3000 }).catch(() => {});
  22  |       await page.waitForTimeout(300);
  23  |     }
  24  | 
  25  |     if (await dismissOnboardingButton.isVisible().catch(() => false)) {
  26  |       await dismissOnboardingButton.click();
  27  |       await page.waitForTimeout(200);
  28  |     }
  29  |   });
  30  | 
  31  |   test('Audio Controls: Toggle Play, Pause, Next, and Previous', async ({ page }) => {
  32  |     const playButton = page
  33  |       .locator(
  34  |         'button[aria-label*="reproducción"], button[aria-label*="playback"], button[title*="Reproducir"], button[title*="Pausar"], button[title*="Play"], button[title*="Pause"]'
  35  |       )
  36  |       .first();
> 37  |     await expect(playButton).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
  38  | 
  39  |     // Toggle Play
  40  |     await playButton.click();
  41  |     await page.waitForTimeout(300);
  42  | 
  43  |     // Verify button state has updated or responds
  44  |     await expect(playButton).toBeVisible();
  45  | 
  46  |     // Next Track
  47  |     const nextButton = page
  48  |       .locator(
  49  |         'button[aria-label*="Siguiente canción"], button[aria-label*="Siguiente pista"], button[aria-label*="Next"], button[title*="Siguiente canción"], button[title*="Siguiente pista"], button[title*="Next"]'
  50  |       )
  51  |       .first();
  52  |     if (await nextButton.isVisible()) {
  53  |       await nextButton.click();
  54  |       await page.waitForTimeout(200);
  55  |     }
  56  | 
  57  |     // Previous Track
  58  |     const prevButton = page
  59  |       .locator(
  60  |         'button[aria-label*="Canción anterior"], button[aria-label*="Pista anterior"], button[aria-label*="Previous"], button[title*="Canción anterior"], button[title*="Pista anterior"], button[title*="Previous"]'
  61  |       )
  62  |       .first();
  63  |     if (await prevButton.isVisible()) {
  64  |       await prevButton.click();
  65  |       await page.waitForTimeout(200);
  66  |     }
  67  |   });
  68  | 
  69  |   test('Equalizer: Open modal, select preset, toggle bypass, and close', async ({ page }) => {
  70  |     // Open EQ modal via button or keyboard shortcut
  71  |     const eqButton = page.locator('button[aria-label*="Ecualizador"], button[title*="Ecualizador"]');
  72  |     if (await eqButton.count() > 0 && await eqButton.first().isVisible()) {
  73  |       await eqButton.first().click();
  74  |     } else {
  75  |       // Trigger with keyboard shortcut 'E'
  76  |       await page.keyboard.press('KeyE');
  77  |     }
  78  | 
  79  |     // Modal should be visible
  80  |     const eqDialog = page.locator('div[role="dialog"]');
  81  |     await expect(eqDialog.first()).toBeVisible({ timeout: 5000 });
  82  | 
  83  |     // Look for preset buttons inside dialog
  84  |     const presetButtons = eqDialog.locator('button');
  85  |     expect(await presetButtons.count()).toBeGreaterThan(0);
  86  | 
  87  |     // Toggle Bypass if available
  88  |     const bypassButton = eqDialog.locator('button:has-text("Bypass"), button[aria-label*="bypass"]');
  89  |     if (await bypassButton.count() > 0 && await bypassButton.first().isVisible()) {
  90  |       await bypassButton.first().click();
  91  |       await page.waitForTimeout(200);
  92  |     }
  93  | 
  94  |     // Close Modal via Escape or close button
  95  |     await page.keyboard.press('Escape');
  96  |     await page.waitForTimeout(300);
  97  |   });
  98  | 
  99  |   test('Universal Command Palette: Open with shortcut, type query, and close', async ({ page }) => {
  100 |     // Open palette with Ctrl+K or Meta+K
  101 |     await page.keyboard.press('Control+KeyK');
  102 |     await page.waitForTimeout(300);
  103 | 
  104 |     const paletteInput = page.locator('input[placeholder*="comando"], input[placeholder*="busca"]');
  105 |     if (await paletteInput.isVisible()) {
  106 |       await paletteInput.fill('Visualizer');
  107 |       await page.waitForTimeout(200);
  108 | 
  109 |       // Close with Escape
  110 |       await page.keyboard.press('Escape');
  111 |       await page.waitForTimeout(200);
  112 |       await expect(paletteInput).not.toBeVisible();
  113 |     }
  114 |   });
  115 | 
  116 |   test('System Modals: Open and verify modal rendering', async ({ page }) => {
  117 |     // Check if dialog can be closed with escape or backdrop
  118 |     await page.keyboard.press('Escape');
  119 |     await page.waitForTimeout(200);
  120 | 
  121 |     // App shell remains solid
  122 |     const mainShell = page.locator('#root');
  123 |     await expect(mainShell).toBeVisible();
  124 |   });
  125 | });
  126 | 
```