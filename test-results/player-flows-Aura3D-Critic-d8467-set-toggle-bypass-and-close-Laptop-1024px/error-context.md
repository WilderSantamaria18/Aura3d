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
    52 × waiting for element to be visible, enabled and stable
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
          - generic: CALIBRACIÓN
  - banner [ref=f1e9]:
    - generic [ref=f1e18]:
      - generic [ref=f1e19]: Auralis
      - generic [ref=f1e20]: Studio
      - generic "En pausa"
    - generic [ref=f1e21]:
      - button "Seleccionar modo de visualización" [ref=f1e23] [cursor=pointer]:
        - generic [ref=f1e27]: Rainbow Void
      - button "Efectos de Audio y DSP" [ref=f1e31] [cursor=pointer]:
        - generic [ref=f1e34]: Efectos & DSP
      - button "-- Tonalidad | 🌧️ | 🌙 Relajado" [ref=f1e39] [cursor=pointer]:
        - generic [ref=f1e40]: "--"
        - generic [ref=f1e41]: Tonalidad
        - generic [ref=f1e42]: "|"
        - generic [ref=f1e43]: 🌧️
        - generic [ref=f1e45]: "|"
        - generic [ref=f1e46]:
          - generic [ref=f1e47]: 🌙
          - generic [ref=f1e48]: Relajado
    - generic [ref=f1e51]:
      - generic [ref=f1e52]:
        - generic "Analizando tempo de la música (BPM)..." [ref=f1e53]:
          - generic [ref=f1e57]: "---"
          - generic [ref=f1e58]: BPM
        - generic [ref=f1e61]:
          - button "Grabar video MP4" [ref=f1e62]:
            - generic [ref=f1e66]: Rec
          - button "Opciones de grabación" [ref=f1e67]
        - button "Captura Fondo 4K" [ref=f1e70]
        - button "Tarjeta 9:16 para Historias" [ref=f1e74]
      - button "Estudio" [ref=f1e79]
      - button "Ajustes de Sistema y Herramientas" [ref=f1e88] [cursor=pointer]:
        - generic [ref=f1e90]: Ajustes
      - generic [ref=f1e93]:
        - button "Switch to Spanish" [ref=f1e94] [cursor=pointer]:
          - generic [ref=f1e98]: en
        - generic [ref=f1e100]:
          - button "Lúcido" [ref=f1e101]
          - button "Desplegar paleta de colores lúcidos" [ref=f1e106]
        - button "Fondo y Atmósfera" [ref=f1e111]:
          - generic [ref=f1e116]: Fondo
      - generic [ref=f1e117]:
        - button "Compartir" [ref=f1e118]
        - button "Modo Galería" [ref=f1e125]
        - button "Pantalla completa" [ref=f1e129]
  - generic [ref=f1e135]:
    - generic [ref=f1e136]:
      - generic [ref=f1e137]: 0:00
      - generic "Arrastra para buscar en la onda sonora o salta a los marcadores de Drop ⚡" [ref=f1e138] [cursor=pointer]:
        - generic:
          - generic "Drop 1 a los 1:10"
        - generic:
          - generic "Drop 2 a los 2:32"
      - generic [ref=f1e300]: 0:00
    - generic [ref=f1e301]:
      - generic [ref=f1e308]:
        - heading "Sin pista seleccionada" [level=4] [ref=f1e310]
        - paragraph [ref=f1e311]: Aura3D Engine
      - generic [ref=f1e312]:
        - button "Activar modo aleatorio" [ref=f1e313] [cursor=pointer]
        - button "Canción anterior" [ref=f1e320] [cursor=pointer]
        - button "Iniciar reproducción" [ref=f1e323] [cursor=pointer]
        - button "Siguiente canción" [ref=f1e326] [cursor=pointer]
        - 'button "Modo de repetición actual: off. Clic para cambiar." [ref=f1e329] [cursor=pointer]'
        - button "Freno de vinilo analógico" [ref=f1e335] [cursor=pointer]
        - button "Bucle DJ A-B" [ref=f1e342] [cursor=pointer]
      - generic [ref=f1e346]:
        - button "Mutear" [ref=f1e347]
        - 'slider "Volumen: 85% (-1.4 dB)" [ref=f1e353] [cursor=pointer]': "0.85"
        - generic [ref=f1e354]: "-1.4 dB"
  - 'generic "Auto-Dock Zen Ghost: Clic para expandir controles de estudio" [ref=f1e356] [cursor=pointer]':
    - generic [ref=f1e357]:
      - generic "En pausa"
    - generic [ref=f1e358]:
      - generic [ref=f1e359]: Aura 3D
      - generic [ref=f1e360]: DAW Studio
    - button "Reproducir" [ref=f1e361]
  - generic [ref=f1e365] [cursor=pointer]:
    - generic [ref=f1e366]:
      - img "Sin reproducción" [ref=f1e368]
      - generic [ref=f1e370]:
        - generic [ref=f1e371]:
          - generic [ref=f1e372]: Sin reproducción
          - generic [ref=f1e373]: Local
        - generic [ref=f1e379]: Aura3D Audio Visualizer • 0:00 / 0:00
    - generic [ref=f1e380]:
      - button "Buscar canciones (YouTube/Spotify)" [ref=f1e381]
      - button "Reproducir" [ref=f1e385]
      - button "Activar Modo Zen (píldora ultracompacta)" [ref=f1e388]
      - button "Expandir Mini-Player" [ref=f1e394]
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
  - status [ref=f1e397]: Volumen ajustado al 85%
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