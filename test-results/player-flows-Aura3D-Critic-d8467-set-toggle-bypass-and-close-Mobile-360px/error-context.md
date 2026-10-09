# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-flows.spec.ts >> Aura3D Critical User Flows >> Equalizer: Open modal, select preset, toggle bypass, and close
- Location: e2e/player-flows.spec.ts:81:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[aria-label*="Ecualizador"], button[title*="Ecualizador"]').first()
    - locator resolved to <button aria-haspopup="true" aria-expanded="false" aria-label="Ajustes de Sistema y Herramientas" title="Ajustes de Sistema: Biblioteca, Letras, Ecualizador, Temporizador, Rendimiento y Atajos" class="px-2.5 py-1.5 min-h-[36px] rounded-[12px] text-xs font-mono transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer bg-[#0c101a]/90 backdrop-blur-3xl text-white/80 border-white/[0.08] hover:text-white hover:bg-white/[0.06]">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
      - waiting 100ms
    54 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - generic:
    - generic:
      - generic:
        - button "Configuración y Estilo de Halo":
          - generic: Rainbow Void
  - banner [ref=f1e9]:
    - generic [ref=f1e17]:
      - button "Seleccionar modo de visualización" [ref=f1e19] [cursor=pointer]:
        - generic [ref=f1e23]: Rainbow Void
      - button "Efectos de Audio y DSP" [ref=f1e27] [cursor=pointer]:
        - generic [ref=f1e30]: DSP
      - button "-- 🌧️" [ref=f1e35] [cursor=pointer]:
        - generic [ref=f1e36]: "--"
        - generic [ref=f1e37]: 🌧️
    - generic [ref=f1e41]:
      - generic [ref=f1e42]:
        - generic "Analizando tempo de la música (BPM)..." [ref=f1e43]:
          - generic [ref=f1e47]: "---"
          - generic [ref=f1e48]: BPM
        - generic [ref=f1e50]:
          - button "Grabar video MP4" [ref=f1e51]
          - button "Opciones de grabación" [ref=f1e55]
        - button "Captura Fondo 4K" [ref=f1e58]
        - button "Tarjeta 9:16 para Historias" [ref=f1e62]
      - 'button "Estudio: Entradas de audio, Radios 24/7, Experiencias 3D y Picture-in-Picture" [ref=f1e67]'
      - button "Ajustes de Sistema y Herramientas" [ref=f1e75] [cursor=pointer]
      - generic [ref=f1e79]:
        - button "Switch to Spanish" [ref=f1e80] [cursor=pointer]:
          - generic [ref=f1e84]: en
        - generic [ref=f1e86]:
          - button "Activar Modo Lúcido (Colores Neón)" [ref=f1e87]
          - button "Desplegar paleta de colores lúcidos" [ref=f1e91]
        - button "Fondo y Atmósfera" [ref=f1e96]
      - button "Pantalla completa" [ref=f1e102]
  - generic [ref=f1e108]:
    - generic [ref=f1e109]:
      - generic [ref=f1e110]: 0:00
      - generic "Arrastra para buscar en la onda sonora o salta a los marcadores de Drop ⚡" [ref=f1e111] [cursor=pointer]:
        - generic:
          - generic "Drop 1 a los 1:10"
        - generic:
          - generic "Drop 2 a los 2:32"
      - generic [ref=f1e273]: 0:00
    - generic [ref=f1e274]:
      - generic [ref=f1e275]:
        - generic [ref=f1e281]:
          - heading "Sin pista seleccionada" [level=4] [ref=f1e283]
          - paragraph [ref=f1e284]: Aura3D Engine
        - generic [ref=f1e286]:
          - button "Mutear" [ref=f1e287]
          - 'slider "Volumen: 85% (-1.4 dB)" [ref=f1e293] [cursor=pointer]': "0.85"
          - generic [ref=f1e294]: "-1.4 dB"
      - generic [ref=f1e295]:
        - button "Activar modo aleatorio" [ref=f1e296] [cursor=pointer]
        - button "Canción anterior" [ref=f1e303] [cursor=pointer]
        - button "Iniciar reproducción" [ref=f1e306] [cursor=pointer]
        - button "Siguiente canción" [ref=f1e309] [cursor=pointer]
        - 'button "Modo de repetición actual: off. Clic para cambiar." [ref=f1e312] [cursor=pointer]'
        - button "Freno de vinilo analógico" [ref=f1e318] [cursor=pointer]
        - button "Bucle DJ A-B" [ref=f1e325] [cursor=pointer]
  - generic:
    - 'generic "Auto-Dock Zen Ghost: Clic para expandir controles de estudio"':
      - generic:
        - generic "En pausa"
      - generic:
        - generic: Aura 3D
        - generic: DAW Studio
      - button "Reproducir"
  - generic [ref=f1e329] [cursor=pointer]:
    - generic [ref=f1e330]:
      - img "Sin reproducción" [ref=f1e332]
      - generic [ref=f1e334]:
        - generic [ref=f1e335]:
          - generic: Sin reproducción
          - generic [ref=f1e336]: Local
        - generic [ref=f1e342]: Aura3D Audio Visualizer • 0:00 / 0:00
    - generic [ref=f1e343]:
      - button "Buscar canciones (YouTube/Spotify)" [ref=f1e344]
      - button "Reproducir" [ref=f1e348]
      - button "Activar Modo Zen (píldora ultracompacta)" [ref=f1e351]
      - button "Expandir Mini-Player" [ref=f1e357]
  - generic:
    - generic:
      - generic:
        - generic:
          - generic: MiniPlayer
          - generic: Local
        - generic:
          - button "Minimizar a píldora"
      - generic:
        - button "PISTA"
        - button "BUSCADOR"
        - button "COLA (0)"
        - button "FAVS (0)"
      - generic:
        - generic:
          - generic:
            - generic:
              - generic:
                - img "Sin reproducción"
            - generic:
              - heading "Sin reproducción" [level=3]
              - paragraph: Aura3D Audio Visualizer
              - generic: Local
          - generic:
            - generic:
              - generic: 0:00
              - generic: Onda en Vivo
              - generic: 0:00
            - generic:
              - slider "Arrastra para avanzar o retroceder": "0"
          - generic:
            - generic:
              - button "Modo aleatorio"
              - button "Pista anterior"
            - button "Reproducir"
            - generic:
              - button "Siguiente pista"
              - 'button "Repetir: off"'
          - generic:
            - button "Silenciar"
            - 'slider "Volumen: 85%"': "0.85"
            - generic: 85%
          - generic:
            - generic:
              - button "EQ 3-Band"
              - generic:
                - generic:
                  - button "15m"
                  - button "30m"
                  - button "60m"
              - generic:
                - button "Exportar respaldo de favoritos y listas (JSON)"
                - button "Restaurar copia de respaldo (JSON)"
  - status [ref=f1e360]: Volumen ajustado al 85%
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Aura3D Critical User Flows', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.addInitScript(() => {
  6   |       localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
  7   |     });
  8   | 
  9   |     await page.goto('/');
  10  |     // Wait for the app shell to hydrate
  11  |     await page.waitForLoadState('domcontentloaded');
  12  | 
  13  |     const dismissOnboardingButton = page
  14  |       .getByRole('button', { name: /Omitir introducción|Cerrar modal|Skip introduction|Close modal/i })
  15  |       .first();
  16  |     if (await dismissOnboardingButton.isVisible().catch(() => false)) {
  17  |       await dismissOnboardingButton.click();
  18  |       await page.waitForTimeout(200);
  19  |     }
  20  | 
  21  |     const enterVisualizerButton = page
  22  |       .locator('button:has-text("Entrar al Visualizador"), button:has-text("Enter Aura3D Visualizer")')
  23  |       .first();
  24  |     if (await enterVisualizerButton.isVisible({ timeout: 5000 }).catch(() => false)) {
  25  |       await enterVisualizerButton.click({ timeout: 5000 });
  26  |       await page.waitForTimeout(300);
  27  |     }
  28  | 
  29  |     if (await dismissOnboardingButton.isVisible().catch(() => false)) {
  30  |       await dismissOnboardingButton.click();
  31  |       await page.waitForTimeout(200);
  32  |     }
  33  | 
  34  |     await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
  35  | 
  36  |     const viewport = page.viewportSize();
  37  |     if (viewport) {
  38  |       await page.mouse.move(viewport.width / 2, viewport.height - 20);
  39  |       await page.waitForTimeout(150);
  40  |     }
  41  |   });
  42  | 
  43  |   test('Audio Controls: Toggle Play, Pause, Next, and Previous', async ({ page }) => {
  44  |     const playButton = page
  45  |       .locator(
  46  |         'button[title*="(Espacio)"]:visible, button[aria-label*="reproducción"]:visible, button[aria-label*="playback"]:visible'
  47  |       )
  48  |       .first();
  49  |     await expect(playButton).toBeVisible();
  50  | 
  51  |     // Toggle Play
  52  |     await playButton.click({ force: true });
  53  |     await page.waitForTimeout(300);
  54  | 
  55  |     // Verify button state has updated or responds
  56  |     await expect(playButton).toBeVisible();
  57  | 
  58  |     // Next Track
  59  |     const nextButton = page
  60  |       .locator(
  61  |         'button[title*="Shift+→"]:visible, button[aria-label*="Siguiente canción"]:visible, button[aria-label*="Siguiente pista"]:visible, button[aria-label*="Next"]:visible'
  62  |       )
  63  |       .first();
  64  |     if (await nextButton.isVisible()) {
  65  |       await nextButton.click({ force: true });
  66  |       await page.waitForTimeout(200);
  67  |     }
  68  | 
  69  |     // Previous Track
  70  |     const prevButton = page
  71  |       .locator(
  72  |         'button[title*="Shift+←"]:visible, button[aria-label*="Canción anterior"]:visible, button[aria-label*="Pista anterior"]:visible, button[aria-label*="Previous"]:visible'
  73  |       )
  74  |       .first();
  75  |     if (await prevButton.isVisible()) {
  76  |       await prevButton.click({ force: true });
  77  |       await page.waitForTimeout(200);
  78  |     }
  79  |   });
  80  | 
  81  |   test('Equalizer: Open modal, select preset, toggle bypass, and close', async ({ page }) => {
  82  |     // Open EQ modal via button or keyboard shortcut
  83  |     const eqButton = page.locator('button[aria-label*="Ecualizador"], button[title*="Ecualizador"]');
  84  |     if (await eqButton.count() > 0 && await eqButton.first().isVisible()) {
> 85  |       await eqButton.first().click();
      |                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  86  |     } else {
  87  |       // Trigger with keyboard shortcut 'E'
  88  |       await page.keyboard.press('KeyE');
  89  |     }
  90  | 
  91  |     // Modal should be visible
  92  |     const eqDialog = page.locator('div[role="dialog"]');
  93  |     await expect(eqDialog.first()).toBeVisible({ timeout: 5000 });
  94  | 
  95  |     // Look for preset buttons inside dialog
  96  |     const presetButtons = eqDialog.locator('button');
  97  |     expect(await presetButtons.count()).toBeGreaterThan(0);
  98  | 
  99  |     // Toggle Bypass if available
  100 |     const bypassButton = eqDialog.locator('button:has-text("Bypass"), button[aria-label*="bypass"]');
  101 |     if (await bypassButton.count() > 0 && await bypassButton.first().isVisible()) {
  102 |       await bypassButton.first().click();
  103 |       await page.waitForTimeout(200);
  104 |     }
  105 | 
  106 |     // Close Modal via Escape or close button
  107 |     await page.keyboard.press('Escape');
  108 |     await page.waitForTimeout(300);
  109 |   });
  110 | 
  111 |   test('Universal Command Palette: Open with shortcut, type query, and close', async ({ page }) => {
  112 |     // Open palette with Ctrl+K or Meta+K
  113 |     await page.keyboard.press('Control+KeyK');
  114 |     await page.waitForTimeout(300);
  115 | 
  116 |     const paletteInput = page.locator('input[placeholder*="comando"], input[placeholder*="busca"]');
  117 |     if (await paletteInput.isVisible()) {
  118 |       await paletteInput.fill('Visualizer');
  119 |       await page.waitForTimeout(200);
  120 | 
  121 |       // Close with Escape
  122 |       await page.keyboard.press('Escape');
  123 |       await page.waitForTimeout(200);
  124 |       await expect(paletteInput).not.toBeVisible();
  125 |     }
  126 |   });
  127 | 
  128 |   test('System Modals: Open and verify modal rendering', async ({ page }) => {
  129 |     // Check if dialog can be closed with escape or backdrop
  130 |     await page.keyboard.press('Escape');
  131 |     await page.waitForTimeout(200);
  132 | 
  133 |     // App shell remains solid
  134 |     const mainShell = page.locator('#root');
  135 |     await expect(mainShell).toBeVisible();
  136 |   });
  137 | });
  138 | 
```