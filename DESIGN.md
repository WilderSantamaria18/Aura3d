# Aura3D Design System & Component Guidelines

Aura3D utiliza un **Design System contemporáneo, minimalista y de precisión táctil inspirado en iOS**, optimizado para aplicaciones de audio digital de alto rendimiento, visualización WebGL 3D a 60/120 FPS y accesibilidad universal (WCAG 2.1 AA).

---

## 1. Principios de Diseño
- **Claridad Estructural**: Jerarquía visual limpia con escala geométrica estricta y elevación neutra.
- **Microinteracción Táctil**: Retroalimentación háptica y visual inmediata con transiciones con curvas spring (`--ease-smooth`, `--ease-spring`).
- **Respeto a la Fatiga Visual**: Eliminación de resplandores estridentes o destellos innecesarios; acentos puntuales de alta precisión.
- **Rendimiento Gráfico sin Bloqueos**: Cero recalculo de layout en bucles de animación; uso intensivo de transforms de GPU y delegación de cómputo DSP a Web Workers.

---

## 2. Sistema de Color, Temas y Acentos

### Temas Soportados
La aplicación soporta modos **Oscuro (Dark)**, **Claro (Light)** y **Automático (Auto)** mediante el atributo `data-theme` en el elemento raíz `<html>`:

```html
<!-- Modo Oscuro -->
<html data-theme="dark">

<!-- Modo Claro -->
<html data-theme="light">
```

### Tokens de Superficie y Capas

| Token CSS | Modo Oscuro (Dark) | Modo Claro (Light) | Uso Principal |
| :--- | :--- | :--- | :--- |
| `--surface-base` | `#06080e` | `#f4f6fb` | Fondo general de la aplicación |
| `--surface-canvas` | `#080b14` | `#edf1f8` | Lienzo de renderizado WebGL 3D |
| `--surface-dock` | `rgba(12, 16, 28, 0.92)` | `rgba(255, 255, 255, 0.94)` | HeaderBar flotante y MiniPlayer dock |
| `--surface-card` | `rgba(18, 24, 38, 0.70)` | `rgba(255, 255, 255, 0.88)` | Tarjetas de pista y presets de ecualización |
| `--surface-overlay`| `rgba(10, 14, 24, 0.95)` | `rgba(255, 255, 255, 0.97)` | Modales principales con `backdrop-blur` |
| `--surface-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(0, 0, 0, 0.04)` | Estados interactivos hover |
| `--surface-active`| `rgba(255, 255, 255, 0.10)` | `rgba(0, 0, 0, 0.08)` | Estados interactivos active/pressed |

### Jerarquía de Contraste Tipográfico (WCAG AA)

| Token CSS | Modo Oscuro | Modo Claro | Uso |
| :--- | :--- | :--- | :--- |
| `--text-primary` | `#ffffff` | `#0a0d14` | Títulos principales, valores activos |
| `--text-secondary` | `rgba(245, 247, 252, 0.82)` | `rgba(15, 20, 32, 0.82)` | Subtítulos, artista, etiquetas de control |
| `--text-tertiary` | `rgba(245, 247, 252, 0.62)` | `rgba(15, 20, 32, 0.62)` | Metadatos secundarios, canales de audio |
| `--text-muted` | `rgba(245, 247, 252, 0.48)` | `rgba(15, 20, 32, 0.48)` | Atajos de teclado, placeholders |
| `--text-disabled` | `rgba(245, 247, 252, 0.30)` | `rgba(15, 20, 32, 0.30)` | Elementos y faders inactivos |

### Paleta de Acentos Dinámicos

| Acento | Hex | Variable | Uso |
| :--- | :--- | :--- | :--- |
| **Cyan Eléctrico** (Default) | `#00e5ff` | `--accent-cyan` | Enfoque primario, barras de espectro, curvas DSP |
| **Violeta Astral** | `#a855f7` | `--accent-violet` | Estilo Lúcido, modos ambientales |
| **Ámbar Cálido** | `#ff9500` | `--accent-amber` | Modo Bypass, temporizador de reposo |
| **Rosa Neón** | `#ff2d55` | `--accent-rose` | Favoritos, pistas destacadas |
| **Esmeralda Aurora** | `#34c759` | `--accent-emerald` | Sincronización Spotify, estados de éxito |

---

## 3. Escala Geométrica y Espaciado Estricto

### Escala de Radios (Border-Radius)

```css
--radius-container: 20px;  /* Modales, ventanas flotantes principales, docks */
--radius-card:      12px;  /* Tarjetas de pista, popovers, paneles secundarios */
--radius-control:   10px;  /* Botones interactivos, inputs de búsqueda */
--radius-badge:      6px;  /* Badges de atajos <kbd>, tags de estado */
--radius-pill:    9999px;  /* Píldoras de filtro, switches, badges redondeados */
```

### Escala de Espaciado (8pt System)
- `--space-1`: `4px`
- `--space-2`: `8px`
- `--space-3`: `12px`
- `--space-4`: `16px`
- `--space-5`: `20px`
- `--space-6`: `24px`
- `--space-8`: `32px`
- `--space-10`: `40px`
- `--space-12`: `48px`
- `--space-16`: `64px`

---

## 4. Escala Tipográfica y Cifras Tabulares

| Clase de Utilidad | Tamaño | Line Height | Letter Spacing | Font Weight | Uso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.type-display` | `2.25rem` (36px) | `1.15` | `-0.03em` | `700` | Títulos Hero de bienvenida y landing |
| `.type-h1` | `1.5rem` (24px) | `1.25` | `-0.025em` | `600` | Títulos principales de modales |
| `.type-h2` | `1.125rem` (18px) | `1.35` | `-0.02em` | `600` | Encabezados de sección y tarjetas |
| `.type-h3` | `0.875rem` (14px) | `1.4` | `-0.015em` | `600` | Nombres de pista y títulos de comandos |
| `.type-body` | `0.8125rem` (13px) | `1.5` | `-0.01em` | `400` | Textos explicativos, descripciones |
| `.type-caption` | `0.6875rem` (11px) | `1.4` | `0.01em` | `500` | Metadatos y badges |
| `.type-mono` | `0.75rem` (12px) | `1.4` | `-0.01em` | `500` | Frecuencias DSP, timestaps |
| `.font-tabular` | Inherited | Inherited | Inherited | Inherited | Cifras tabulares fijas (`tabular-nums`) |

---

## 5. Motion Design y Accesibilidad Motriz

### Duraciones y Curvas Estándar
```css
--duration-fast: 150ms; /* Feedback táctil, hover, active */
--duration-base: 250ms; /* Dropdowns, popovers, tabs */
--duration-slow: 400ms; /* Modales, transiciones de pantalla */

--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Clases de Microinteracción Táctil
- `.btn-spring`: Escala de compresión al `0.96` al pulsar con recuperación suave.
- `.btn-press`: Escala rápida de tecla al `0.94`.
- `.card-interactive`: Realce de elevación y contraste de borde en hover.

### Reducción de Movimiento (`prefers-reduced-motion`)
El Design System respeta automáticamente las preferencias del sistema operativo, desactivando giros continuos, vibraciones o desplazamientos bruscos si el usuario lo requiere.

---

## 6. Componentes Reutilizables de Estado de UI

- **`EmptyState`** ([`src/components/Common/EmptyState.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/EmptyState.tsx)): Contenedor semántico con icono centrado, título legible, descripción y botón de acción opcional.
- **`Skeleton`** ([`src/components/Common/Skeleton.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/Skeleton.tsx)): Marcador de posición animado con pulso suave para listas de reproducción y cargas asíncronas.
- **`Spinner`** ([`src/components/Common/Spinner.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/Spinner.tsx)): Indicador de carga circular continuo con aceleración GPU.
- **`ErrorState`** ([`src/components/Common/ErrorState.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/ErrorState.tsx)): Tarjeta de fallo en tono semántico de error con botón de reintento.
