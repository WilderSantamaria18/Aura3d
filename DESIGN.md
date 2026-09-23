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
css
/* ─── Far plane ─────────────────────────────── */
--material-canvas-dark:  rgba(6, 8, 14, 1);
--material-canvas-light: rgba(244, 246, 251, 1);

/* ─── Mid plane (glass estándar) ─────────────── */
--material-glass-dark:   rgba(14, 18, 30, 0.62);
--material-glass-light:  rgba(255, 255, 255, 0.72);

/* ─── Near plane (glass elevado) ─────────────── */
--material-elevated-dark:  rgba(10, 14, 24, 0.82);
--material-elevated-light: rgba(255, 255, 255, 0.88);

/* ─── Overlay modal (más opaco) ──────────────── */
--material-overlay-dark:  rgba(8, 11, 20, 0.94);
--material-overlay-light: rgba(255, 255, 255, 0.96);

/* ─── Blur y saturación ──────────────────────── */
--blur-glass:     20px;
--blur-elevated:  40px;
--blur-overlay:   60px;
--saturate-glass: 180%;
--saturate-elev:  200%;
2.3 Borde especular (light catching)
Ningún vidrio se ve bien sin su borde iluminado. Esta es la firma visual del Liquid Glass.

css
/* Borde superior brillante, borde inferior sutil */
--edge-highlight-dark:
  inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
  inset 0 0 0 1px rgba(255, 255, 255, 0.04);

--edge-highlight-light:
  inset 0 1px 0 0 rgba(255, 255, 255, 0.90),
  inset 0 0 0 1px rgba(0, 0, 0, 0.04);
2.4 Sombras estratificadas (no una sola)
css
/* Tres capas: contacto + difusa + ambiental */
--shadow-mid-dark:
  0 1px 2px rgba(0, 0, 0, 0.30),
  0 4px 12px rgba(0, 0, 0, 0.20),
  0 12px 32px rgba(0, 0, 0, 0.12);

--shadow-near-dark:
  0 2px 4px rgba(0, 0, 0, 0.35),
  0 8px 24px rgba(0, 0, 0, 0.28),
  0 24px 64px rgba(0, 0, 0, 0.20);

/* Light theme: sombras más suaves y difusas */
--shadow-mid-light:
  0 1px 2px rgba(15, 20, 32, 0.06),
  0 4px 12px rgba(15, 20, 32, 0.08),
  0 12px 32px rgba(15, 20, 32, 0.06);
2.5 Definición del material completo
css
.material-glass {
  background: var(--material-glass-dark);
  backdrop-filter: blur(var(--blur-glass)) saturate(var(--saturate-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(var(--saturate-glass));
  border-radius: var(--radius-card);
  box-shadow: var(--edge-highlight-dark), var(--shadow-mid-dark);
}

.material-elevated {
  background: var(--material-elevated-dark);
  backdrop-filter: blur(var(--blur-elevated)) saturate(var(--saturate-elev));
  -webkit-backdrop-filter: blur(var(--blur-elevated)) saturate(var(--saturate-elev));
  border-radius: var(--radius-container);
  box-shadow: var(--edge-highlight-dark), var(--shadow-near-dark);
}

.material-overlay {
  background: var(--material-overlay-dark);
  backdrop-filter: blur(var(--blur-overlay)) saturate(var(--saturate-elev));
  -webkit-backdrop-filter: blur(var(--blur-overlay)) saturate(var(--saturate-elev));
  border-radius: var(--radius-container);
  box-shadow: var(--edge-highlight-dark), var(--shadow-near-dark);
}
2.6 Vibrancy (tinte del contenido de fondo)
En iOS, el vidrio se tiñe con el color del contenido detrás. Se implementa con un acento que varía según el contexto:

css
/* El vidrio hereda un tinte del accent activo */
--glass-tint-cyan:    rgba(0, 229, 255, 0.06);
--glass-tint-violet:  rgba(168, 85, 247, 0.06);
--glass-tint-rose:    rgba(255, 45, 85, 0.06);
--glass-tint-emerald: rgba(52, 199, 89, 0.06);
Se aplica como capa adicional sobre el material base con mix-blend-mode: overlay.

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
--surface-dock	rgba(14, 18, 30, 0.62)	rgba(255, 255, 255, 0.72)	Mid (glass)
--surface-card	rgba(18, 24, 38, 0.70)	rgba(255, 255, 255, 0.88)	Mid (glass)
--surface-overlay	rgba(8, 11, 20, 0.94)	rgba(255, 255, 255, 0.96)	Near (elevated)
--surface-hover	rgba(255, 255, 255, 0.06)	rgba(0, 0, 0, 0.04)	Hover
--surface-active	rgba(255, 255, 255, 0.10)	rgba(0, 0, 0, 0.08)	Active/pressed
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
Usamos radios continuos estilo iOS, más suaves que un border-radius convencional:

css
--radius-container: 22px;  /* Modales, ventanas flotantes, docks */
--radius-card:      14px;  /* Tarjetas de pista, popovers */
--radius-control:   11px;  /* Botones interactivos, inputs */
--radius-badge:      7px;  /* Badges <kbd>, tags de estado */
--radius-pill:    9999px;  /* Píldoras de filtro, switches */
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
Tipografía principal: SF Pro en Apple, con fallback a Inter y Geist para el resto de plataformas.

9. Motion Design y Accesibilidad Motriz
9.1 Duraciones y Curvas Estándar
css
--duration-fast:   150ms;  /* Hover, active, feedback táctil */
--duration-base:   250ms;  /* Dropdowns, popovers, tabs */
--duration-slow:   400ms;  /* Modales, transiciones de pantalla */

--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-glass:  cubic-bezier(0.22, 1, 0.36, 1);  /* Entrada/salida de modales */
9.2 Microinteracciones Táctiles
.btn-spring: escala a 0.96 al pulsar con recuperación spring.

.btn-press: escala rápida a 0.94 para teclas.

.card-interactive: elevación y contraste de borde en hover.

.glass-hover: incrementa el --edge-highlight y aumenta --blur-glass en +4 px en hover, simulando más vidrio.

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
    backdrop-filter: blur(var(--blur-overlay)) saturate(var(--saturate-elev));
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