Aura3D Design System & Component Guidelines
Liquid Glass Edition — iOS 26 / visionOS inspired
Aura3D utiliza un Design System contemporáneo de precisión táctil inspirado en el lenguaje Liquid Glass de iOS 26 y visionOS, optimizado para aplicaciones de audio digital de alto rendimiento, visualización WebGL 3D a 60/120 FPS y accesibilidad universal (WCAG 2.1 AA).

El principio rector es simple: la interfaz flota sobre el contenido, nunca lo tapa. Cada superficie tiene material, profundidad y comportamiento óptico propios. La luz atraviesa el vidrio, se refracta en los bordes, y el contenido detrás tiñe sutilmente la superficie.

1. Principios de Diseño
Materialidad Óptica: cada superficie se comporta como vidrio real — transmite, refracta, refleja y difumina. No hay grises planos: hay materiales con densidad, blur y luz especular.

Profundidad en Capas: la UI vive en tres planos (Near / Mid / Far) con paralaje sutil al scroll y elevación consistente. Los modales no "aparecen": emergen desde el contenido.

Claridad Estructural: jerarquía visual limpia con escala geométrica estricta, radios continuos tipo iOS y elevación neutra.

Microinteracción Táctil: feedback visual inmediato con curvas spring (--ease-smooth, --ease-spring) y compresión física al pulsar.

Respeto a la Fatiga Visual: cero resplandores estridentes; acentos puntuales de alta precisión; vibrancy sutil en lugar de colores planos.

Rendimiento Gráfico sin Bloqueos: cero recálculo de layout en bucles de animación; uso intensivo de transforms GPU, backdrop-filter cacheados y delegación de cómputo DSP a Web Workers.

2. Sistema de Materiales Liquid Glass
El corazón del sistema. Cada superficie es un material, no un color.

2.1 Los tres planos de profundidad
Plano	Elevación	Blur	Uso
Far	0	0 px	Fondo general, canvas WebGL
Mid	1	20–30 px	HeaderBar, dock, cards, popovers
Near	2	40–60 px	Modales, overlays, alertas críticas
La regla: a mayor elevación, mayor blur y mayor saturación de specular. La luz siempre viene de arriba (eje Y negativo), consistente con el resto del design system.

2.2 Tokens de Material (CSS)
Estado: implementado en src/index.css (:root y [data-theme="light"]). Los nombres
--liquid-* son los que consumen las clases; --blur-*/--edge-highlight-*/--shadow-*/
--radius-material son los tokens canónicos de material.

css
/* ─── Far plane ─────────────────────────────── */
--surface-base:   #06080e;
--surface-canvas: #080b14;

/* ─── Mid plane (glass estándar) ─────────────── */
--blur-glass:        40px;
--saturate-glass:    190%;
--contrast-glass:    105%;
--shadow-mid-dark:
  0 2px 4px rgba(0, 0, 0, 0.30),
  0 10px 28px rgba(0, 0, 0, 0.40),
  0 24px 64px -8px rgba(0, 0, 0, 0.65);

/* ─── Near plane (modales) ───────────────────── */
--blur-elevated:     56px;
--saturate-elev:     200%;
--shadow-near-dark:
  0 2px 6px rgba(0, 0, 0, 0.35),
  0 16px 36px rgba(0, 0, 0, 0.45),
  0 36px 84px -12px rgba(0, 0, 0, 0.85);

/* ─── Nivel editorial del landing (blur contenido por coste sobre orbes) ── */
--blur-editorial:    18px;
--saturate-editorial: 170%;

2.3 Borde especular (light catching)
Ningún vidrio se ve bien sin su borde iluminado. Esta es la firma visual del Liquid Glass.

css
/* Borde superior brillante, borde inferior sutil (un solo token para los dos planos) */
--edge-highlight-dark:
  inset 0 1px 1.5px rgba(255, 255, 255, 0.25),
  inset 0 -1px 1px rgba(0, 0, 0, 0.25);

--edge-highlight-light:
  inset 0 1px 0 0 rgba(255, 255, 255, 0.90),
  inset 0 0 0 1px rgba(0, 0, 0, 0.04);

2.4 Sombras estratificadas (no una sola)
Las sombras exteriores viven en --shadow-mid-dark (Mid) y --shadow-near-dark (Near);
el borde especular se compone aparte con --edge-highlight-dark. Métricas tienen su
propio par en claro: --shadow-mid-light / --shadow-near-light.

2.5 Definición del material completo
Las clases implementadas son .liquid-glass (Mid) y .liquid-glass--modal (Near). No
existen .material-glass / .material-elevated / .material-overlay: si un componente
nuevo necesita material, usa estas.

css
.liquid-glass,
.liquid-glass-drawer,
.liquid-glass-dock {
  backdrop-filter: var(--liquid-blur);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.09) 0%,
    var(--glass-tint-active, rgba(0, 229, 255, 0.04)) 28%,
    rgba(18, 22, 34, 0.68) 55%,
    rgba(8, 10, 18, 0.86) 100%
  );
  border-radius: var(--radius-material);
  box-shadow: var(--shadow-mid-dark), var(--edge-highlight-dark);
}

.liquid-glass--modal,
.liquid-glass-modal {
  backdrop-filter: var(--liquid-blur-elevated);
  background: linear-gradient(
    140deg,
    rgba(255, 255, 255, 0.11) 0%,
    var(--glass-tint-active, rgba(0, 229, 255, 0.05)) 25%,
    rgba(14, 18, 30, 0.80) 50%,
    rgba(8, 10, 18, 0.94) 100%
  );
  border-radius: var(--radius-material-lg);
  box-shadow: var(--shadow-near-dark), var(--edge-highlight-dark);
}

2.6 Vibrancy (tinte del contenido de fondo)
El vidrio se tiñe con el acento activo. Los tokens implementados son:

css
--glass-tint-active:    rgba(0, 229, 255, 0.05);  /* acento activo (cyan por defecto) */
--glass-tint-secondary: rgba(168, 85, 247, 0.03); /* acento secundario */
--glass-rim-accent:     rgba(255, 255, 255, 0.32);/* borde superior del vidrio */

El landing editorial usa además su propio par --lp-cyan / --lp-violet sobre .lp-orb
para la luz ambiental que el vidrio refracta.

3. Temas Soportados
La aplicación soporta modos Oscuro (Dark), Claro (Light) y Automático (Auto) mediante el atributo data-theme en <html>:

html
<html data-theme="dark">
<html data-theme="light">
<html data-theme="auto">
auto sigue prefers-color-scheme y reevalúa en tiempo real.

4. Tokens de Superficie y Capas
Token CSS	Dark	Light	Material
--surface-base	#06080e	#f4f6fb	Far (opaco)
--surface-canvas	#080b14	#edf1f8	Far (opaco)
--surface-dock	rgba(12, 16, 28, 0.72)	rgba(255, 255, 255, 0.94)	Mid (glass)
--surface-card	rgba(18, 24, 38, 0.70)	rgba(255, 255, 255, 0.88)	Mid (glass)
--surface-overlay	rgba(10, 14, 24, 0.95)	rgba(255, 255, 255, 0.97)	Near (elevated)
--surface-hover	rgba(255, 255, 255, 0.06)	rgba(0, 0, 0, 0.04)	Hover
--surface-active	rgba(255, 255, 255, 0.10)	rgba(0, 0, 0, 0.08)	Active/pressed

Nota de decisión: --surface-dock se acordó en 0.72 (esta doc pedía 0.62 y el código
tenía 0.92). Conserva el efecto vidrio sin comprometer la legibilidad de los valores
DSP que el dock muestra sobre el canvas 3D.

5. Jerarquía de Contraste Tipográfico (WCAG AA)
Token CSS	Dark	Light	Uso
--text-primary	#ffffff	#0a0d14	Títulos principales, valores activos
--text-secondary	rgba(245, 247, 252, 0.82)	rgba(15, 20, 32, 0.82)	Subtítulos, artista, etiquetas de control
--text-tertiary	rgba(245, 247, 252, 0.62)	rgba(15, 20, 32, 0.62)	Metadatos secundarios
--text-muted	rgba(245, 247, 252, 0.48)	rgba(15, 20, 32, 0.48)	Atajos, placeholders
--text-disabled	rgba(245, 247, 252, 0.30)	rgba(15, 20, 32, 0.30)	Faders inactivos
Todos los textos sobre material glass mantienen contraste ≥ 4.5:1 verificando la opacidad acumulada del material de fondo.

6. Paleta de Acentos Dinámicos
Acento	Hex	Variable	Uso
Cyan Eléctrico (Default)	#00e5ff	--accent-cyan	Enfoque primario, espectro, curvas DSP
Violeta Astral	#a855f7	--accent-violet	Estilo Lúcido, modos ambientales
Ámbar Cálido	#ff9500	--accent-amber	Bypass, temporizador de reposo
Rosa Neón	#ff2d55	--accent-rose	Favoritos, pistas destacadas
Esmeralda Aurora	#34c759	--accent-emerald	Sincronización Spotify, éxito
Cada acento define su propio par --accent-{name} y --accent-{name}-soft (para fondos tintados al 6–10 %).

7. Escala Geométrica y Espaciado Estricto
7.1 Escala de Radios (squircle continuo)
Escala implementada en src/index.css. Los radios de material son los que usan
.liquid-glass* y .lp-glass.

css
/* Controles y contenedores */
--radius-container: 22px;  /* Modales, ventanas flotantes, docks */
--radius-modal:     20px;  /* Modales de diálogo */
--radius-dock:      18px;  /* Dock y drawers */
--radius-card:      16px;  /* Tarjetas de pista, popovers */
--radius-control:    8px;  /* Botones interactivos, inputs */
--radius-badge:      5px;  /* Badges <kbd>, tags de estado */
--radius-pill:    9999px;  /* Píldoras de filtro, switches */

/* Materiales (superficies de vidrio) */
--radius-material:    28px;  /* .liquid-glass, .liquid-glass-dock, .lp-glass */
--radius-material-sm: 24px;  /* .liquid-glass-card */
--radius-material-lg: 32px;  /* .liquid-glass--modal */

Para la curvatura continua real de iOS:

css
.squircle {
  border-radius: var(--radius-card);
  /* Fallback para navegadores sin corner-shape */
}
@supports (corner-shape: squircle) {
  .squircle { corner-shape: squircle; }
}

7.2 Escala de Espaciado (8pt System)
text
--space-1:   4px
--space-2:   8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
8. Escala Tipográfica y Cifras Tabulares
Clase	Tamaño	Line Height	Letter Spacing	Weight	Uso
.type-display	2.25rem (36px)	1.15	-0.03em	700	Hero de bienvenida y landing
.type-h1	1.5rem (24px)	1.25	-0.025em	600	Títulos de modales
.type-h2	1.125rem (18px)	1.35	-0.02em	600	Encabezados de sección
.type-h3	0.875rem (14px)	1.4	-0.015em	600	Nombres de pista
.type-body	0.8125rem (13px)	1.5	-0.01em	400	Textos explicativos
.type-caption	0.6875rem (11px)	1.4	0.01em	500	Metadatos y badges
.type-mono	0.75rem (12px)	1.4	-0.01em	500	Frecuencias DSP, timestamps
.font-tabular	inherited	inherited	inherited	inherited	Cifras tabulares (tabular-nums)

Suelo tipográfico: 12px para cualquier texto de lectura (incluidas etiquetas en
mayúsculas y telemetría). 11px queda reservado a badges y contadores. Ningún texto
de lectura por debajo de 12px y ninguna opacidad de texto por debajo de 0.60 sobre
material: se midió que 0.40 daba 3.78-4.06:1.

Tipografías (declaradas en @theme de src/index.css y cargadas en index.html):
- Sans: SF Pro en Apple; Inter → Geist → Segoe UI → Roboto en el resto.
- Mono: JetBrains Mono (se sirve desde Google Fonts); antes `font-mono` caía en
  ui-monospace (Consolas) e ignoraba la fuente cargada.

9. Motion Design y Accesibilidad Motriz
9.1 Duraciones y Curvas Estándar
css
--duration-fast:   150ms;  /* Hover, active, feedback táctil */
--duration-base:   250ms;  /* Dropdowns, popovers, tabs */
--duration-slow:   400ms;  /* Modales, transiciones de pantalla */

--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* con rebote */
--ease-glass:  cubic-bezier(0.22, 1, 0.36, 1);           /* entrada/salida de modales */

9.2 Microinteracciones Táctiles
.btn-spring: escala y desplazamiento al pulsar con recuperación spring
(transform 0.22s var(--ease-spring)). Una sola definición en src/index.css.

.btn-press: escala rápida a 0.92 para teclas, con --ease-smooth.

.lp-btn (landing): min-height 48px, radio --radius-pill, :focus-visible con
outline cian de 2px y offset 3px.

9.3 Animación de entrada de modales
Los modales no aparecen con fade. Emergen desde el contenido:

css
@keyframes glass-enter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(12px);
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
    backdrop-filter: blur(var(--blur-elevated)) saturate(var(--saturate-elev));
  }
}
Duración: --duration-slow con --ease-glass.

9.4 Reducción de Movimiento
El Design System respeta prefers-reduced-motion:

Se desactivan rotaciones continuas, vibraciones y desplazamientos bruscos.

Los modales se muestran con opacity en lugar de scale + blur.

Las transiciones duran 0.01ms.

10. Componentes Reutilizables de Estado de UI
Todos los componentes respetan el sistema de materiales.

EmptyState (src/components/Common/EmptyState.tsx): contenedor semántico con icono centrado sobre un material glass suave, título legible, descripción y botón de acción opcional.

Skeleton (src/components/Common/Skeleton.tsx): marcador de posición animado con pulso suave, usando --material-glass con opacidad reducida.

Spinner (src/components/Common/Spinner.tsx): indicador circular continuo acelerado por GPU, con el acento activo.

ErrorState (src/components/Common/ErrorState.tsx): tarjeta de fallo con tinte semántico (--accent-rose-soft) sobre material elevated y botón de reintento.

11. Guía de Aplicación Práctica
11.1 HeaderBar flotante
css
.header-bar {
  position: fixed;
  top: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  height: 56px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);

  background: var(--material-glass-dark);
  backdrop-filter: blur(var(--blur-glass)) saturate(var(--saturate-glass));
  box-shadow: var(--edge-highlight-dark), var(--shadow-mid-dark);

  /* El vidrio se separa del canvas 3D */
  isolation: isolate;
}
11.2 Card de pista
css
.track-card {
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--edge-highlight-dark), var(--shadow-mid-dark);
  transition: background var(--duration-fast) var(--ease-smooth),
              box-shadow var(--duration-fast) var(--ease-smooth),
              transform var(--duration-fast) var(--ease-spring);
}

.track-card:hover {
  background: var(--surface-hover);
  transform: translateY(-1px);
}
11.3 Modal principal
css
.modal {
  background: var(--material-overlay-dark);
  backdrop-filter: blur(var(--blur-overlay)) saturate(var(--saturate-elev));
  border-radius: var(--radius-container);
  box-shadow: var(--edge-highlight-dark), var(--shadow-near-dark);

  animation: glass-enter var(--duration-slow) var(--ease-glass);
}
11.4 Botón primario
css
.btn-primary {
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-pill);
  background: var(--accent-cyan);
  color: var(--surface-base);
  font-weight: 600;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 4px 12px rgba(0, 229, 255, 0.25);
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-smooth);
}

.btn-primary:hover {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 6px 20px rgba(0, 229, 255, 0.4);
}

.btn-primary:active {
  transform: scale(0.96);
}
12. Reglas de Composición
Nunca apiles más de 2 materiales glass en el mismo eje visual. Un modal sobre un dock es aceptable; un modal sobre un card sobre un dock no.

El vidrio nunca cubre más del 60 % del viewport en desktop. El canvas 3D debe respirar.

Los acentos viven sobre vidrio, nunca sobre color plano. Un botón cian sobre fondo oscuro plano se ve pobre; sobre glass se ve vivo.

Los bordes especulares siempre apuntan arriba. La luz viene del eje Y negativo, sin excepción.

Cada nuevo material debe justificar su elevación. Si no está claro por qué está más arriba que otra cosa, no lo está.

13. Checklist de Adopción
Antes de mergear cualquier componente nuevo, verificar:

□ Usa tokens de material, no colores hardcodeados.
□ Tiene --edge-highlight en su box-shadow.
□ Tiene sombra estratificada (no una sola).
□ Su radio pertenece a la escala definida.
□ Su animación usa --ease-smooth, --ease-spring o --ease-glass.
□ Respeta prefers-reduced-motion.
□ Su contraste de texto sobre el material pasa WCAG AA.
□ Su backdrop-filter no se recalcula por frame.
□ No apila más de 2 materiales glass en el mismo eje visual.
□ Su acento, si lo tiene, viene de la paleta definida.
□ Ningún texto de lectura por debajo de 12px (11px solo badges) ni con opacidad < 0.60.
□ No declara utilidades de Tailwind a mano en CSS sin capa: eso las suplanta.
□ No redefine tokens en :root desde un archivo importado por una pantalla.

14. Estado de Implementación Verificado
Esta sección registra qué existe de verdad en el código, para que la doc no vuelva a
describir un sistema distinto al implementado.

Material (src/index.css): --blur-glass 40px, --blur-elevated 56px, --saturate-glass
190%, --saturate-elev 200%, --contrast-glass 105%, --edge-highlight-dark/light,
--shadow-mid-dark, --shadow-near-dark, --shadow-mid-light, --shadow-near-light,
--radius-material 28px, --radius-material-sm 24px, --radius-material-lg 32px,
--ease-glass. Consumidos por .liquid-glass / .liquid-glass--modal y por .lp-glass.

Radios: --radius-container 22px, --radius-modal 20px, --radius-dock 18px,
--radius-card 16px, --radius-control 8px, --radius-badge 5px, --radius-pill 9999px.

Acentos de marca: declarados como --color-aura* en @theme (src/index.css), así que
text-auraCyan / bg-auraViolet son utilidades reales de Tailwind. Antes eran clases
escritas a mano en ConicStation.css, sin capa.

Aislamiento entre superficies: ConicStation.css acota sus tokens a .lp-root. Antes
los declaraba en :root y, al importarse desde la landing, pisaba globalmente
--border-subtle (0.12 en lugar de 0.08) y con ello los bordes del estudio
(App.tsx, SessionStatsModal, VisualizerPanel, AutoModeToast).

Pendiente conocido: el landing mantiene su paleta editorial (--lp-*) como nivel
documentado de material, no como un segundo sistema de color; su blur es
--blur-editorial (18px) por coste de rendimiento sobre los orbes animados.
