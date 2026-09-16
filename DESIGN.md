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

## 3. Materiales y Glassmorphism iOS

El sistema define **exactamente tres materiales estándar** con saturación calibrada. Queda **estrictamente prohibido cualquier valor de blur fuera de estos tres**:

| Token CSS | Definición | Uso Permitido |
| :--- | :--- | :--- |
| `--material-thin` | `blur(8px) saturate(180%)` | Badges, tooltips, tags flotantes, popovers secundarios |
| `--material-regular` | `blur(20px) saturate(180%)` | Tarjetas interactivas (`.ios-glass-card`), HeaderBar, Docks (`.ios-glass-dock`) |
| `--material-thick` | `blur(40px) saturate(180%)` | Modales principales (`.ios-glass-modal`), paneles envolventes, menús desplegables |

---

## 4. Escala Geométrica, Radios y Espaciado Estricto

### Escala de Radios (Border-Radius)

```css
--radius-container: 20px;  /* Modales, ventanas flotantes principales, docks */
--radius-dock:      20px;  /* Docks flotantes de navegación */
--radius-modal:     20px;  /* Modales y hojas de diálogo */
--radius-card:      12px;  /* Tarjetas de pista, popovers, paneles secundarios */
--radius-control:   10px;  /* Botones interactivos, inputs de búsqueda */
--radius-badge:      6px;  /* Badges de atajos <kbd>, tags de estado */
--radius-pill:    9999px;  /* Píldoras de filtro, switches, badges redondeados */
```

### Radios Concéntricos
Para mantener la armonía óptica de iOS, cualquier elemento anidado dentro de un contenedor debe calcular su radio de curvatura restando el padding del contenedor al radio del padre:
$$\text{Radio Hijo} = \text{Radio Padre} - \text{Padding}$$

**Ejemplos obligatorios:**
1. **Tarjeta:** Contenedor con `--radius-card` (12px) y padding de 8px $\rightarrow$ elemento interno con radio de **4px** ($12 - 8 = 4$).
2. **Dock:** Contenedor con `--radius-dock` (20px) y padding de 8px $\rightarrow$ botón interno con radio de **12px** ($20 - 8 = 12$).
3. **Modal:** Contenedor con `--radius-modal` (20px) y padding de 10px $\rightarrow$ sección interna con radio de **10px** ($20 - 10 = 10$).

### Decisiones Responsive de Radio
- **Pantallas Ultracompactas / Plegables ($\le 380\text{px}$):**
  - `--radius-container: 16px;`
  - `--radius-card: 8px;`
  - `--radius-control: 8px;`
  - `--radius-panel: 10px;`

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

## 5. Escala Tipográfica y Cifras Tabulares

### Familia Tipográfica
Una sola familia base para toda la interfaz: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif` y `'Space Grotesk'` como display secundaria para títulos de gran tamaño.

### Mínimo de Legibilidad iOS
El tamaño mínimo permitido en la interfaz es **11px** (`0.6875rem`), reservado **exclusivamente para `.type-caption`**. Por debajo de 11px no existe ningún tamaño de texto en la escala tipográfica de iOS.

| Clase de Utilidad | Tamaño | Line Height | Letter Spacing | Font Weight | Uso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.type-display` | `2.25rem` (36px) | `1.15` | `-0.03em` | `700` | Títulos Hero de bienvenida y landing |
| `.type-h1` | `1.5rem` (24px) | `1.25` | `-0.025em` | `600` | Títulos principales de modales |
| `.type-h2` | `1.125rem` (18px) | `1.35` | `-0.02em` | `600` | Encabezados de sección y tarjetas |
| `.type-h3` | `0.875rem` (14px) | `1.4` | `-0.015em` | `600` | Nombres de pista y títulos de comandos |
| `.type-body` | `0.8125rem` (13px) | `1.5` | `-0.01em` | `400` | Textos explicativos, descripciones |
| `.type-caption` | `0.6875rem` (11px) | `1.4` | `0.01em` | `500` | Metadatos y badges (mínimo absoluto) |
| `.type-mono` | `0.75rem` (12px) | `1.4` | `-0.01em` | `500` | Frecuencias DSP, timestamps |
| `.font-tabular` | Heredado | Heredado | Heredado | Heredado | Cifras tabulares fijas (`tabular-nums`) |

*Todas las cifras de tiempo, BPM, Hz y telemetría deben llevar `.font-tabular` para evitar saltos de layout.*

---

## 6. Motion Design, Accesibilidad y Foco

### Duraciones y Curvas Estándar
```css
--duration-fast: 150ms; /* Feedback táctil, hover, active */
--duration-base: 250ms; /* Dropdowns, popovers, tabs */
--duration-slow: 400ms; /* Modales, transiciones de pantalla */

--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Anillo de Foco Global Accesible
```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--surface-base), 0 0 0 4px var(--accent-active);
  border-radius: inherit;
}
```

### Área Táctil Mínima (Apple HIG / WCAG 2.5.5)
Todo control interactivo debe tener un área táctil de al menos **$44 \times 44\text{px}$**. Cuando el elemento visual sea menor (ej. iconos de 28-32px), se debe extender el área de interacción con padding o hit-slop.

### Reducción de Movimiento (`prefers-reduced-motion`)
- Con `prefers-reduced-motion: reduce`, la duración máxima de animación es de **150ms**.
- Se desactivan rotaciones continuas, efectos de parallax y rebotes.
- Los visualizadores 3D activan el flag `--reduced-motion: 1` para pasar a modo estático por defecto.

---

## 7. Componentes Reutilizables de Estado de UI

- **`EmptyState`** ([`src/components/Common/EmptyState.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/EmptyState.tsx)): Contenedor semántico con icono centrado, título legible, descripción y botón de acción opcional.
- **`Skeleton`** ([`src/components/Common/Skeleton.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/Skeleton.tsx)): Marcador de posición animado con pulso suave para listas de reproducción y cargas asíncronas.
- **`Spinner`** ([`src/components/Common/Spinner.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/Spinner.tsx)): Indicador de carga circular continuo con aceleración GPU.
- **`ErrorState`** ([`src/components/Common/ErrorState.tsx`](file:///c:/Users/WAXIS/Desktop/proy/Aura3d/src/components/Common/ErrorState.tsx)): Tarjeta de fallo en tono semántico de error con botón de reintento.
