---
target: landing de Aura3D (src/components/Landing/LandingMinimal.tsx)
total_score: 17
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\WAXXIS\\Documents\\proy\\src\\components\\Landing\\LandingMinimal.tsx"
target_fingerprint: "sha256:9f2e23206cd3c18850dacee5c4594676420e4e3e09532eca5163293007871c7f"
target_path: "C:\\Users\\WAXXIS\\Documents\\proy\\src\\components\\Landing\\LandingMinimal.tsx"
timestamp: 2026-10-13T15-27-06Z
slug: src-components-landing-landingminimal-tsx
---
Method: dual-agent (A: 3836eeaa-3095-4f08-b2da-37eebb70f141 · B: f6e1a219-ad34-4fce-8c85-80e2771a43f7)

Target: `src/components/Landing/LandingMinimal.tsx` (landing activa, sirve `main.lp-content`; modo Persuade con puerta a Operate).

# Design Health Score

| # | Heurística | Puntuación | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | `#status-indicator` sin `aria-live`; el Laboratorio muestra "🖐 SEGUIMIENTO ACTIVO · Confianza: 99.4%" (Experience.tsx:641,651) sobre un demo guiado por **ratón** (Experience.tsx:630). |
| 2 | Sistema ↔ mundo real | 3 | "Iniciar motor", "Kawarp", "PASO 01/05", "SENSIBILIDAD TRANSIENTES": jerga interna sin definir. |
| 3 | Control y libertad | 2 | Arranque sin cancelar ni Esc; el rail de scroll (LandingMinimal.tsx:1091) es un `div` con `onClick`, sin `role`/`tabIndex`. |
| 4 | Consistencia y estándares | 2 | Tres verdades del mismo sistema: DESIGN.md, `designTokens.ts` y `landing-pro.css`; radios fuera de escala (28px, rounded-2xl/3xl). |
| 5 | Prevención de errores | 2 | `keydown` global (LandingMinimal.tsx:56-64): Enter en cualquier punto del documento lanza el motor. |
| 6 | Reconocimiento > recuerdo | 3 | Nav de 6 enlaces y ventana de demo visibles; el Laboratorio presenta simulación como instrumento real. |
| 7 | Flexibilidad y eficiencia | n/a | Persuade: no hay flujo que acelerar. |
| 8 | Estética y minimalismo | 2 | El hero apila aro + h1 + lead + 2 CTA + 3 stems + 3 stats; CTA primario duplicado (nav y hero). |
| 9 | Recuperación de errores | 1 | Cero estados de error: si falla WebGL/Web Audio, la pantalla es idéntica y no ocurre nada. |
| 10 | Ayuda y documentación | n/a | Persuade sin centro de ayuda; la tabla de Specs es marketing. |
| **Total** | | **17/32** | **53 % → banda Aceptable** |

# Veredicto de especificidad de diseño

**Juicio (Assessment A):** el hero está anclado, no es intercambiable: h1 "El sonido / hecho visible", aro cónico de 160 barras ordenadas por espectro real, telemetría en línea (ENTRADA 48 kHz · BUFFER 128 · SALIDA 7,8 ms) y léxico de cadena de señal. Ningún SaaS oscuro con degradados usaría esto. El problema está en el cuerpo de la página (Manifiesto, Kawarp, Estudio, Specs): ahí manda el kit genérico cian/violeta + glass + glow, y parte del azúcar de inmersión es falsa: `Cover.tsx`, `ConicStation.css` y `StudioLaunchDeck.tsx` pertenecen a landings alternativas con feature flag y **no se renderizan** en la ruta activa (verificado: solo `Experience` está montado, y `LandingMinimal` no llama a `getUserMedia` ni una vez); las cifras "medidas" (7,8 ms, SYNC LOCK 99,98 %) son `countUp` hardcodeados (LandingMinimal.tsx:405-419).

**Escaneo determinista (Assessment B):** `impeccable detect --json src/components/Landing` → **12 hallazgos con exit code 0** (el contrato "0 = limpio" no se cumple; el exit code del detector es un falso negativo, verificado 3 veces). Reglas: `gradient-text` ×8, `ai-color-palette` ×3, `overused-font` ×1, `bounce-easing` ×1. **11 de 12 son falsos positivos**: viven en `LandingScreen.tsx`, `Experience.tsx` y los `*Showcase.tsx` (pantallas no renderizadas). Único hallazgo real en ruta activa: `overused-font` en `sections/ConicStation.css:14`. Corrección relevante: `LandingMinimal` **no** usa `bg-clip-text`; su `.lp-gradient-text` es blanco sólido + `text-shadow` (landing-pro.css:143), así que el detector acertó al no marcarlo. Resultado: **0 hallazgos accionables sobre la landing real**; la evidencia útil vino de la medición de píxeles y de la lectura del markup.

**Overlays:** no disponibles. La automatización de navegador está bloqueada en esta sesión (`spawn EPERM` del sandbox al lanzar Chromium por `--remote-debugging-pipe`). Evidencia visual sustituta: los goldens de Playwright versionados (`e2e/visual-regression.spec.ts-snapshots/`, árbol limpio en `be9a612`, navegador real, tema oscuro, reduced-motion) analizados píxel a píxel.

# Impresión general

Es una landing con una idea visual propia y un hero que vende el producto en dos segundos, montada sobre un sistema de diseño que no existe en el código y con un suelo tipográfico demasiado bajo. Lo mejor y lo peor conviven en el mismo encuadre: el aro es el mejor argumento del producto y también su peor enemigo tipográfico, porque en 1024 px atraviesa literalmente el titular. La mayor oportunidad no es "pulir": es hacer que el material y la tipografía documentados en DESIGN.md lleguen al CSS, y liberar el centro del viewport para que el aro y el h1 dejen de pelear por el mismo píxel.

# Lo que funciona bien

1. **El aro como argumento de producto, no como adorno:** 160 barras con `depthAlpha`, `peakHold` y aberración cromática condicionada a `amp > 0.65` (LandingMinimal.tsx:924-1000). Es un analizador de espectro real; basta verlo para entender qué hace el producto.
2. **La telemetría en línea (`.lp-stats`, landing-pro.css:169-173):** tres pares `dt/dd` con `tabular-nums` separados por hairline en lugar de tarjetas glass. Registro de consola filtrado a landing, a coste cero de blur.
3. **Disciplina de movimiento reducido:** el canvas respeta el modo, el aro sustituye rotación por fundido opaco (landing-pro.css:226-230) y hay interruptor de escape en el footer. Verifiqué además que el reset global (`index.css:1441-1449`) sí neutraliza animaciones infinitas con `animation-duration: 0.01ms !important`.

# Problemas prioritarios

**[P1] El aro cónico colisiona con el titular en 1024 y lo roza en 768/1440.** Por qué importa: la primera frase del producto se vuelve ilegible justo donde tiene que ganar. Medido sobre los snapshots: a 1024 px el aro cruza "El sonido" y el final de "hecho visible."; a 768 el glow de las barras entra en "El sonido"; a 1440 roza la "e." final; a 360 px el núcleo se apoya encima de "El sonido". Arreglo: derivar `heroCenterY = heroHeight * 0.46` (LandingMinimal.tsx:182) de `title.getBoundingClientRect().top` en los tres breakpoints, como ya hace la rama móvil (líneas 186-192), y sustituir el `setTimeout(resizeAll, 1800)` (línea 766) por `document.fonts.ready.then(resizeAll)`. Comando: **layout**.

**[P1] DESIGN.md documenta un sistema de materiales que no existe en el código.** Por qué importa: es la causa raíz de casi toda mejora visual pendiente y hoy hay tres verdades distintas. Verificado: **0 usos** de `--material-glass-dark/light`, `--material-elevated-*`, `--material-overlay-*`, `--material-canvas-*`, `--blur-glass/elevated/overlay`, `--saturate-*`, `--edge-highlight-dark/light`, `--shadow-mid/near-dark`, `--shadow-mid-light`, `--glass-tint-cyan/violet` y `--ease-glass` en todo `src/`. En su lugar: `index.css:9` `--surface-dock: rgba(12,16,28,0.92)` (la doc dice 0.62), `index.css:83` `--radius-container: 20px` (doc: 22), `--ease-spring` con la curva *smooth* (index.css:63,685 → sin rebote, así que la "compresión spring" documentada no existe), `designTokens.ts` con 32/48/52 y radios 24/28/32, y un sistema paralelo `.lp-*` (28px, 9999px, sin borde especular). Deriva medida en los 194 `.tsx`: 778 colores hex y 708 `rgba(` hardcodeados, 274 sombras arbitrarias `shadow-[…]`, 174 `backdrop-blur` en 70 archivos. Arreglo: promover los tokens de DESIGN.md a `:root`, migrar `.lp-glass` a `var(--radius-container)` + `var(--edge-highlight-dark)`/`var(--shadow-mid-dark)`, y unificar el suelo tipográfico (hoy 678 usos de 10-11 px contra `.type-caption` = 11 px, y ningún `font-family` de `landing-pro.css` declara fallback para Windows). Comando: **document**, luego **extract**.

**[P1] Enter arranca la aplicación desde cualquier punto del documento.** Por qué importa: quien pulse Enter sobre "Ver cómo funciona" o sobre un chip de demo dispara el arranque completo; es un fallo de accesibilidad y de intención en el paso crítico. Arreglo: en LandingMinimal.tsx:56-64 salir temprano con `if (e.defaultPrevented || (document.activeElement && document.activeElement !== document.body)) return;`. Comando: **harden**.

**[P2] La capa de metadatos mono está exactamente en el borde del AA y lo cruza según el vidrio.** Por qué importa: son los textos que explican el producto (BPM, "1-clic demo • 0 descargas"), y quedan por debajo de 4.5:1. Medido sobre píxeles renderizados: "1-clic demo • 0 descargas" **3.81** (desktop) y **3.98** (móvil); badge "124 BPM" **3.78**; los enlaces de nav dan **4.16** sobre el vidrio del nav (B, resolviendo alfa) y **4.65** sobre la zona oscura del mismo degradado (medición propia) → pasan o fallan según dónde caiga la luz del vidrio, señal de que no hay margen. Además, B calculó 7 elementos a **4.16** en secciones fuera de cuadro (`--lp-muted: rgba(190,202,238,0.58)`, landing-pro.css:15, sobre vidrio), lo que contradice la afirmación de DESIGN.md §5. Arreglo: subir `--lp-muted` a ~0.72, sustituir `text-white/40` por `text-white/60` o `--text-tertiary` y no bajar de 12 px. Comando: **polish**.

**[P2] El paso crítico "Iniciar motor" no da reassurance y no existe ningún estado de error.** Por qué importa: es el momento de máxima ansiedad (audio + cámara + micrófono en un producto que presume de procesamiento local) y la landing llega muda: `handleEnter` (LandingMinimal.tsx:43-53) desbloquea audio y funde a negro sin una línea sobre qué pasará ni qué permisos se pedirán — esa promesa existe, pero enterrada en `text-[12px]` al final de la página (línea 1586). Si WebGL o Web Audio fallan, la pantalla no cambia. Arreglo: añadir bajo `#btn-reboot` (línea 1145) una línea de 12-13 px con "Sin instalación · Audio y cámara se procesan en tu equipo · Te pediremos acceso al micrófono, nunca se sube nada", y un preflight que renderice `ErrorState` si no hay WebGL2/`AudioContext`. Comando: **clarify**.

# Banderas rojas por persona

- **Jordan (primerizo):** se topa con "word-sync con Kawarp" (LandingMinimal.tsx:1137), "PASO 01 / 05", "SENSIBILIDAD TRANSIENTES" y "[ 04 // PLATAFORMA DE LANZAMIENTO ]" (StudioLaunchDeck.tsx:80) sin un solo tooltip; y en el Laboratorio hace clic creyendo que es su cámara cuando el demo va con el ratón y muestra "Confianza: 99.4%" fija (Experience.tsx:641,651).
- **Riley (probador de límites):** abre la página sin WebGL/Web Audio y no recibe ningún mensaje; tabula hasta el rail de scroll y descubre que no funciona con teclado (LandingMinimal.tsx:1091); y comprueba que "7,8 ms medido en panel OLED a 120 Hz" es un contador hardcodeado (línea 410).
- **Casey (móvil 360):** el eyebrow se parte en dos líneas y choca con el h1 (separación de 3 px medida en el snapshot); la cabecera del panel demo solapa "PROBAR SONIDO EN VIVO" con "1-clic demo • 0 descargas" (mismo `flex justify-between` sin `flex-wrap`, línea 1161); el badge "124 BPM" se parte en dos líneas (línea 1212); y el CTA final queda a ~9 pantallas.

# Observaciones menores

- `id="btn-reboot"` en un botón que no reinicia nada.
- El `aria-label="Progreso de página"` del rail describe el estado, no la acción (`title="Desplazarse por la estación"` no es nombre accesible).
- `ProgressRail.tsx:34` usa `focus:outline-none` sin sustituto `focus-visible`.
- Objetivos táctiles en puntero fino: CTA del nav 40 px de alto, enlaces 32 px (solo en móvil el `::after` de `index.css:2312` los lleva a 44 px).
- CTA primario duplicado y repetido 3× en la página; `main.lp-content` sin `id` ni skip-link.
- El aviso "Efectos reducidos por tu sistema" vive al pie de ~9 pantallas.
- `landing-pro.css:21` omite `'Inter'`/`'Geist'`/`'Segoe UI'` como fallback.

# Evidencia secundaria (superficies Operate del README)

- **[P2] `EqualizerModal.tsx:779-780`:** el texto de ayuda es `absolute bottom-2 right-3 text-[8px] text-white/45` y se imprime **encima** de las etiquetas de frecuencia `500 Hz…16 kHz`, dejando ambas ilegibles. 8 px está 3 px por debajo de la escala mínima de DESIGN.md.
- **[P2] Fila de faders cortada:** el modal es `max-h-[92vh] overflow-hidden` (EqualizerModal.tsx:606) con scroll interno (línea 701); a 1440×900 la rejilla de 10 bandas queda seccionada contra el borde inferior sin afordancia de scroll, y se lee como error de render.
- **[P3] `UniversalCommandPalette`:** títulos y categorías en mono de 12/10 px con una jerarquía de 2 px de diferencia; la fila seleccionada solo se distingue por un borde cian (sin cambio de relleno) y las etiquetas "Inactivo" usan 9 px en mayúsculas con tracking, lo que degrada su legibilidad.

# Preguntas para considerar

- Si el aro ya demuestra el producto en dos segundos, ¿por qué el h1 compite con él por el mismo píxel en vez de cederle el centro y quedarse en la banda inferior, como hace `Cover.tsx` (líneas 418-419), que el código dejó de usar?
- ¿Cuántos de los 6 enlaces de la nav sobreviven si se elimina la sección bajo cada uno? Quedan dos con contenido propio; la nav podría ser "Iniciar motor" + 2.
- Un producto que presume de "100 % local" pide cámara y micrófono en el paso crítico: ¿no debería esa frase ser el subtítulo del CTA en vez de una línea de 12 px al final de la página?
