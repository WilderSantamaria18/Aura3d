# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-flows.spec.ts >> Aura3D Critical User Flows >> System Modals: Open and verify modal rendering
- Location: e2e/player-flows.spec.ts:110:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Ir a la Plataforma de Entrada|Go to Input Platform/i }).first()
    - locator resolved to <button class="flex items-center gap-1.5 text-[11px] font-mono text-white/40 hover:text-pink-400 transition-colors cursor-pointer">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

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
  - 'generic "Auto-Dock Zen Ghost: Clic para expandir controles de estudio" [ref=f1e329] [cursor=pointer]':
    - generic [ref=f1e330]:
      - generic "En pausa"
    - generic [ref=f1e331]:
      - generic [ref=f1e332]: Aura 3D
      - generic [ref=f1e333]: DAW Studio
    - button "Reproducir" [ref=f1e334]
  - generic [ref=f1e338] [cursor=pointer]:
    - generic [ref=f1e339]:
      - img "Sin reproducción" [ref=f1e341]
      - generic [ref=f1e343]:
        - generic [ref=f1e344]:
          - generic: Sin reproducción
          - generic [ref=f1e345]: Local
        - generic [ref=f1e351]: Aura3D Audio Visualizer • 0:00 / 0:00
    - generic [ref=f1e352]:
      - button "Buscar canciones (YouTube/Spotify)" [ref=f1e353]
      - button "Reproducir" [ref=f1e357]
      - button "Activar Modo Zen (píldora ultracompacta)" [ref=f1e360]
      - button "Expandir Mini-Player" [ref=f1e366]
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
  - dialog [ref=f1e369]:
    - generic [ref=f1e370]:
      - generic [ref=f1e371]:
        - generic [ref=f1e373]:
          - generic [ref=f1e374]:
            - heading "Bienvenido a Aura3D Studio" [level=2] [ref=f1e375]
            - generic [ref=f1e376]: ONBOARDING
          - paragraph [ref=f1e377]: Inicialización de tu entorno de visualización y audio inmersivo
        - button "Cerrar modal" [ref=f1e379] [cursor=pointer]
      - generic [ref=f1e384]:
        - generic [ref=f1e385]:
          - generic [ref=f1e386]:
            - generic [ref=f1e387]: "1"
            - generic [ref=f1e388]: Arquitectura
          - generic [ref=f1e389]:
            - generic [ref=f1e390]: "2"
            - generic [ref=f1e391]: Visualizador
          - generic [ref=f1e392]:
            - generic [ref=f1e393]: "3"
            - generic [ref=f1e394]: Comandos
        - generic [ref=f1e395]:
          - generic [ref=f1e396]: Aura3D transforma tu música en esculturas 3D en tiempo real mediante análisis de transformada rápida de Fourier (FFT) y shaders WebGL de precisión milimétrica.
          - generic [ref=f1e401]:
            - generic [ref=f1e402]:
              - generic [ref=f1e403]: Audio Local / Spotify
              - paragraph [ref=f1e409]: Arrastra archivos MP3, WAV, FLAC o conecta tu cuenta de Spotify Premium.
            - generic [ref=f1e410]:
              - generic [ref=f1e411]: DSP & Ecualizador
              - paragraph [ref=f1e414]: Cadena de ecualización analógica de 5 bandas, limitador y spatial audio 3D.
        - generic [ref=f1e415]:
          - button "Omitir introducción" [ref=f1e416] [cursor=pointer]
          - button [ref=f1e418] [cursor=pointer]
  - status [ref=f1e422]: Volumen ajustado al 85%
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
  17  |     const enterButtons = [
  18  |       page.getByRole('button', { name: /Entrar\s*→|Enter\s*→/i }).first(),
  19  |       page.getByRole('button', { name: /Entrar al Visualizador Aura3D|Enter Aura3D Visualizer/i }).first(),
  20  |       page.getByRole('button', { name: /Ir a la Plataforma de Entrada|Go to Input Platform/i }).first(),
  21  |     ];
  22  | 
  23  |     for (const button of enterButtons) {
  24  |       if (await button.isVisible().catch(() => false)) {
> 25  |         await button.click();
      |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  26  |         await page.waitForTimeout(300);
  27  |       }
  28  |     }
  29  |   });
  30  | 
  31  |   test('Audio Controls: Toggle Play, Pause, Next, and Previous', async ({ page }) => {
  32  |     const playButton = page.locator(
  33  |       'button[aria-label*="reproducción"], button[aria-label*="playback"], button[title*="Reproducir"], button[title*="Pausar"], button[title*="Play"], button[title*="Pause"]'
  34  |     );
  35  |     await expect(playButton).toBeVisible();
  36  | 
  37  |     // Toggle Play
  38  |     await playButton.click();
  39  |     await page.waitForTimeout(300);
  40  | 
  41  |     // Verify button state has updated or responds
  42  |     await expect(playButton).toBeVisible();
  43  | 
  44  |     // Next Track
  45  |     const nextButton = page.locator(
  46  |       'button[aria-label*="Siguiente canción"], button[aria-label*="Siguiente pista"], button[aria-label*="Next"], button[title*="Siguiente canción"], button[title*="Siguiente pista"], button[title*="Next"]'
  47  |     );
  48  |     if (await nextButton.isVisible()) {
  49  |       await nextButton.click();
  50  |       await page.waitForTimeout(200);
  51  |     }
  52  | 
  53  |     // Previous Track
  54  |     const prevButton = page.locator(
  55  |       'button[aria-label*="Canción anterior"], button[aria-label*="Pista anterior"], button[aria-label*="Previous"], button[title*="Canción anterior"], button[title*="Pista anterior"], button[title*="Previous"]'
  56  |     );
  57  |     if (await prevButton.isVisible()) {
  58  |       await prevButton.click();
  59  |       await page.waitForTimeout(200);
  60  |     }
  61  |   });
  62  | 
  63  |   test('Equalizer: Open modal, select preset, toggle bypass, and close', async ({ page }) => {
  64  |     // Open EQ modal via button or keyboard shortcut
  65  |     const eqButton = page.locator('button[aria-label*="Ecualizador"], button[title*="Ecualizador"]');
  66  |     if (await eqButton.count() > 0 && await eqButton.first().isVisible()) {
  67  |       await eqButton.first().click();
  68  |     } else {
  69  |       // Trigger with keyboard shortcut 'E'
  70  |       await page.keyboard.press('KeyE');
  71  |     }
  72  | 
  73  |     // Modal should be visible
  74  |     const eqDialog = page.locator('div[role="dialog"]');
  75  |     await expect(eqDialog.first()).toBeVisible({ timeout: 5000 });
  76  | 
  77  |     // Look for preset buttons inside dialog
  78  |     const presetButtons = eqDialog.locator('button');
  79  |     expect(await presetButtons.count()).toBeGreaterThan(0);
  80  | 
  81  |     // Toggle Bypass if available
  82  |     const bypassButton = eqDialog.locator('button:has-text("Bypass"), button[aria-label*="bypass"]');
  83  |     if (await bypassButton.count() > 0 && await bypassButton.first().isVisible()) {
  84  |       await bypassButton.first().click();
  85  |       await page.waitForTimeout(200);
  86  |     }
  87  | 
  88  |     // Close Modal via Escape or close button
  89  |     await page.keyboard.press('Escape');
  90  |     await page.waitForTimeout(300);
  91  |   });
  92  | 
  93  |   test('Universal Command Palette: Open with shortcut, type query, and close', async ({ page }) => {
  94  |     // Open palette with Ctrl+K or Meta+K
  95  |     await page.keyboard.press('Control+KeyK');
  96  |     await page.waitForTimeout(300);
  97  | 
  98  |     const paletteInput = page.locator('input[placeholder*="comando"], input[placeholder*="busca"]');
  99  |     if (await paletteInput.isVisible()) {
  100 |       await paletteInput.fill('Visualizer');
  101 |       await page.waitForTimeout(200);
  102 | 
  103 |       // Close with Escape
  104 |       await page.keyboard.press('Escape');
  105 |       await page.waitForTimeout(200);
  106 |       await expect(paletteInput).not.toBeVisible();
  107 |     }
  108 |   });
  109 | 
  110 |   test('System Modals: Open and verify modal rendering', async ({ page }) => {
  111 |     // Check if dialog can be closed with escape or backdrop
  112 |     await page.keyboard.press('Escape');
  113 |     await page.waitForTimeout(200);
  114 | 
  115 |     // App shell remains solid
  116 |     const mainShell = page.locator('#root');
  117 |     await expect(mainShell).toBeVisible();
  118 |   });
  119 | });
  120 | 
```