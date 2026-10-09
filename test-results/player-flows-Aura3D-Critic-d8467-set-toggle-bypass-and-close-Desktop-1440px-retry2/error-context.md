# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-flows.spec.ts >> Aura3D Critical User Flows >> Equalizer: Open modal, select preset, toggle bypass, and close
- Location: e2e/player-flows.spec.ts:81:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div[role="dialog"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('div[role="dialog"]').first() with timeout 5000ms
  - waiting for locator('div[role="dialog"]').first()

```

```yaml
- button "Configuración y Estilo de Halo": Rainbow Void CALIBRACIÓN
- banner:
  - text: Auralis Studio
  - button "Comandos ⌘K"
  - button "Seleccionar modo de visualización": Rainbow Void
  - button "Efectos de Audio y DSP": Efectos & DSP
  - button "-- Tonalidad | 🌧️ | 🌙 Relajado"
  - text: "--- BPM"
  - button "Grabar video MP4": Rec
  - button "Opciones de grabación"
  - button "Captura Fondo 4K": 4K
  - button "Tarjeta 9:16 para Historias": 9:16
  - button "Estudio"
  - button "Ajustes de Sistema y Herramientas" [expanded]: Ajustes
  - menu "Ajustes de Sistema":
    - text: Vistas & Utilidades
    - button "Biblioteca de Pistas B"
    - button "Letras Sincronizadas L"
    - button "Ecualizador 10 Bandas E"
    - button "Estadísticas de Sesión"
    - text: Tema Visual & Acento Tema
    - button "Auto"
    - button "Oscuro"
    - button "Claro"
    - text: Acento
    - button "Seleccionar acento Cyan Eléctrico"
    - button "Seleccionar acento Violeta Astral"
    - button "Seleccionar acento Ámbar Cálido"
    - button "Seleccionar acento Rosa Neón"
    - button "Seleccionar acento Esmeralda Aurora"
    - text: Hardware & Temporizador
    - button "Rendimiento Gráfico high"
    - button "Efectos de Cursor Eco"
    - text: Sleep Timer
    - button "Off"
    - button "15m"
    - button "30m"
    - button "Atajos de Teclado (?)"
  - button "Switch to Spanish": en
  - button "Lúcido"
  - button "Desplegar paleta de colores lúcidos"
  - button "Fondo y Atmósfera": Fondo
  - button "Compartir"
  - button "Modo Galería"
  - button "Pantalla completa"
- text: 0:00 0:00
- heading "Sin pista seleccionada" [level=4]
- paragraph: Aura3D Engine
- button "Activar modo aleatorio"
- button "Canción anterior"
- button "Iniciar reproducción"
- button "Siguiente canción"
- 'button "Modo de repetición actual: off. Clic para cambiar."'
- button "Freno de vinilo analógico"
- button "Bucle DJ A-B"
- button "Mutear"
- 'slider "Volumen: 85% (-1.4 dB)"': "0.85"
- text: "-1.4 dB Aura 3D DAW Studio"
- button "Reproducir"
- img "Sin reproducción"
- text: Sin reproducción Local Aura3D Audio Visualizer • 0:00 / 0:00
- button "Buscar canciones (YouTube/Spotify)"
- button "Reproducir"
- button "Activar Modo Zen (píldora ultracompacta)"
- button "Expandir Mini-Player"
- text: MiniPlayer Local
- button "Minimizar a píldora"
- button "PISTA"
- button "BUSCADOR"
- button "COLA (0)"
- button "FAVS (0)"
- img "Sin reproducción"
- heading "Sin reproducción" [level=3]
- paragraph: Aura3D Audio Visualizer
- text: Local 0:00 Onda en Vivo 0:00
- slider "Arrastra para avanzar o retroceder": "0"
- button "Modo aleatorio"
- button "Pista anterior"
- button "Reproducir"
- button "Siguiente pista"
- 'button "Repetir: off"'
- button "Silenciar"
- 'slider "Volumen: 85%"': "0.85"
- text: 85%
- button "EQ 3-Band"
- button "15m"
- button "30m"
- button "60m"
- button "Exportar respaldo de favoritos y listas (JSON)"
- button "Restaurar copia de respaldo (JSON)"
- status: Volumen ajustado al 85%
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
  85  |       await eqButton.first().click();
  86  |     } else {
  87  |       // Trigger with keyboard shortcut 'E'
  88  |       await page.keyboard.press('KeyE');
  89  |     }
  90  | 
  91  |     // Modal should be visible
  92  |     const eqDialog = page.locator('div[role="dialog"]');
> 93  |     await expect(eqDialog.first()).toBeVisible({ timeout: 5000 });
      |                                    ^ Error: expect(locator).toBeVisible() failed
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