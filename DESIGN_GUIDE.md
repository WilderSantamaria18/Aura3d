# Aura3D — Guía de Diseño Profesional & Anti-Patrones IA (Basada en Impeccable)

> **Estado**: Skill Impeccable instalado en `.agents/skills/impeccable/`.
> **Objetivo**: Elevar la interfaz de Aura3D de un prototipo con patrones genéricos de IA a una experiencia de software de audio profesional, limpia, minimalista y de nivel de estudio (inspirada en *Teenage Engineering*, *Ableton*, *Braun / Dieter Rams* y el estándar *Impeccable*).

---

## 1. Diagnóstico: Anti-Patrones de IA Detectados en Aura3D

El análisis con las reglas de **Impeccable** detecta los siguientes síntomas típicos de interfaces generadas por IA que deben erradicarse:

| Síntoma de "AI Slop" | Dónde se observa en Aura3D | Cómo se corrige a nivel profesional |
| :--- | :--- | :--- |
| **Glow & Neón excesivo en todo** | Halos con `box-shadow: 0 0 20px rgba(0,242,254,0.4)` y bordes brillantes en casi todos los botones y sliders. | **Jerarquía de elevación única**: usar una sola declaración de profundidad (borde sutil *o* sombra suave direccional con offset, nunca un halo de color sin offset como decoración indiscriminada). El brillo debe reservarse únicamente para el visualizador 3D reactivo. |
| **Paleta "Cyberpunk / Synthwave" por defecto** | Uso omnipresente de Cyan (`#00f2fe`) y Magenta (`#ff088a`) sobre negro puro. | **Paleta de estudio tonal**: fondos con tinte profundo (`#080b14`, `#0e1322`), grises cálidos/fríos de alta legibilidad, y acentos de color estratégicos y restringidos (un solo acento funcional por vista). |
| **Tipografía Genérica sin jerarquía** | `system-ui, -apple-system, BlinkMacSystemFont` sin pesos contrastados ni escala tipográfica intencional. | **Tipografía con carácter de audio**: pares intencionales como una sans contemporánea geométrica (*Plus Jakarta Sans*, *Geist*, *Inter Display*) combinada con una monospace técnica (*JetBrains Mono*, *Geist Mono*) para valores de decibelios, hercios y BPM. |
| **Píldoras y botones flotantes repetitivos** | Todos los contenedores usan `rounded-full` con bordes idénticos de `border-white/10` y fondos `bg-black/50 backdrop-blur-xl`. | **Geometría consistente y controlada**: bordes redondeados sobrios (`rounded-xl` o `rounded-2xl` de 12–16px para tarjetas/paneles, reservando `rounded-full` únicamente para knobs, toggles y controles circulares). |
| **Tarjetas anidadas (Nested Cards)** | Modales (`EqualizerModal`, `VisualizerSettingsModal`) con paneles dentro de paneles dentro de paneles. | **Estructura plana y fluida**: separar secciones mediante espaciado generoso, líneas divisorias tenues (`1px` con opacidad ≤ 8%) o sutiles variaciones de tono, en lugar de cajas dentro de cajas. |
| **Texto gris sobre fondos de color** | Textos secundarios en `text-white/40` o `text-white/50` sobre fondos con degradados. | **Contraste WCAG AA**: tintar el texto secundario con el matiz de la superficie o usar contrastes verificados ≥ 4.5:1. |

---

## 2. Los 5 Principios del Diseño "Impeccable" para Aura3D

### Principio 1: La Interfaz Retrocede, la Música y el 3D Protagonizan
- En una aplicación visualizadora de música, los controles UI deben ser **silenciosos y de precisión quirúrgica**.
- La UI debe operar como la consola de un sintetizador de gama alta: mate, táctil, legible, y no competir con las partículas y formas 3D.

### Principio 2: Tipografía de Estudio (Audio Hardware Precision)
- **Titulares & Navegación**: Tipografía geométrica limpia con tracking sutil (`-0.02em`), pesos medios y titulares balanceados.
- **Datos & Telemetría**: Para frecuencias (Hz), ganancia (dB), tiempo (03:42), sensibilidad (1.2x) y FPS, usar siempre fuente monoespaciada tabular (`tabular-nums font-mono`) para evitar saltos de ancho al actualizar datos en tiempo real.

### Principio 3: Sombras con Offset Real vs. Resplandores Neón
- Prohibir `box-shadow: 0 0 15px color` como sustituto de profundidad.
- Utilizar sombras con desplazamiento en el eje Y y desenfoque progresivo suave:
  ```css
  /* Elevación 1 (Superficies de control) */
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3);

  /* Elevación 2 (Modales y paneles flotantes) */
  box-shadow: 0 12px 40px -4px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0, 0, 0, 0.4);
  ```

### Principio 4: Sliders de Precisión de Audio
- En lugar de sliders de estilo "juguete" con tracks translúcidos gruesos y thumbs enormes:
  - Track delgado (2px a 3px) con acabado mate.
  - Indicador de pulgar metálico o circular minimalista (10px a 12px).
  - Ticks sutiles en los valores de referencia (ej. 1.0x).
  - Feedback numérico inmediato sin saltos.

### Principio 5: Movimiento Orgánico con Curva Exponencial
- Eliminar transiciones lineales o con rebote (*bounce/elastic*).
- Toda animación de interfaz (apertura de modales, despliegue de paneles, hover) debe utilizar aceleración suave hacia afuera:
  ```css
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); /* Ease-out exponencial */
  ```

---

## 3. Guía de Tokens y Sistema de Diseño

### Paleta de Superficies Neutras (Dark Slate Studio)
```css
--surface-base:      #05070d; /* Fondo inmersivo global */
--surface-canvas:    #090d18; /* Paneles primarios */
--surface-raised:    #101524; /* Tarjetas de control elevadas */
--surface-overlay:   #171d30; /* Modales y menús flotantes */
--surface-hover:     #1f263e; /* Estados interactivos activos */

--border-subtle:     rgba(255, 255, 255, 0.06);
--border-medium:     rgba(255, 255, 255, 0.12);
--border-focus:      #00e5ff; /* Foco accesible */

--text-primary:      #f0f4fc; /* Alto contraste ≥ 12:1 */
--text-secondary:    #8b95a5; /* Secundario verificado ≥ 4.5:1 */
--text-tertiary:     #556075; /* Deshabilitados / sutiles */
```

### Paleta de Acentos Funcionales
- **Cyan Estudio**: `#00e5ff` (Estado activo, playback, frecuencia principal).
- **Esmeralda Analógica**: `#00ff9d` (Indicadores de señal, sensibilidad de audio, salud de FPS).
- **Ámbar / Naranja Válvula**: `#ff9100` (Advertencias, picos de ganancia, clipping).
- **Violeta Atmosférico**: `#7928ca` (Modo Lucid exclusivo, gradientes de fondo sutiles).

---

## 4. Hoja de Ruta de Refactorización de Componentes

### 1. `VisualizerQuickControls.tsx` (Barra Flotante de Control Rápido)
- **Problema actual**: Barra sobredimensionada con demasiados colores competidores (verde, azul, cian, rosa) y estilo pastilla con glow difuso.
- **Acción**:
  - Reducir la altura visual a 36px.
  - Agrupar los controles por función: Selector de Modo / Forma | Control de Escala | Sensibilidad de Audio (modo blob).
  - Usar un solo tono de acento activo (`#00e5ff` o monocromático con acento activo).
  - Sustituir etiquetas largas por iconos limpios de 14px con tooltips precisos.

### 2. `VisualizerSettingsModal.tsx` y `EqualizerModal.tsx` (Modales)
- **Problema actual**: Estructura de cajas dentro de cajas con scroll interno y bordes saturados.
- **Acción**:
  - Encabezado claro con tipografía técnica y botón de cierre integrado.
  - Distribución en rejilla limpia de 2 columnas sin anidar tarjetas dentro de tarjetas.
  - Sliders de ecualización con aspecto de consola de audio (faders lineales de precisión con marcas de escala en dB).

### 3. `HeaderBar.tsx` (Barra Superior)
- **Problema actual**: Demasiados elementos llamando la atención al mismo tiempo (logo con glow, selector de fuente, botones de modo, selector de temas).
- **Acción**:
  - Aplicar jerarquía visual: el título de la canción actual debe ser legible y limpio.
  - Los controles secundarios (VR, modo Lucid, selector de entrada) deben ser botones compactos minimalistas estilo rack de estudio de 28px.

### 4. `RainbowBlobVisualizer.tsx` (Control Circular 2D)
- **Estado actual**: Escala 0.5x fija y logo contorneado implementados.
- **Mejora de estilo**:
  - Suavizar el disco del vinilo para que parezca un disco de acetato mate pulido con sutil reflexión metálica.
  - Eliminar textos innecesarios que saturen el centro del círculo; mantener solo el logo y la carátula nítida con su borde de 1px.

---

## 5. Comandos Impeccable Disponibles

El skill instalado en `.agents/skills/impeccable` permite ejecutar evaluaciones de diseño directamente:

| Acción | Comando / Referencia | Propósito |
| :--- | :--- | :--- |
| **Auditoría Técnica** | `.agents/skills/impeccable/reference/audit.md` | Escanea accesibilidad (a11y), contraste WCAG, rendimiento y respuesta táctil. |
| **Limpieza de Slop** | `.agents/skills/impeccable/reference/craft-floor.md` | Verifica que no haya kicks, texto degradado, ni cajas anidadas. |
| **Pulido Final** | `.agents/skills/impeccable/reference/polish.md` | Alineación con el sistema de diseño antes de enviar a producción. |
| **Tipografía** | `.agents/skills/impeccable/reference/typeset.md` | Jerarquía y proporciones de texto. |
| **Animación** | `.agents/skills/impeccable/reference/animate.md` | Movimiento intencional sin rebotes ni animaciones gratuitas. |

---

> Con esta guía y el skill instalado, cualquier nuevo componente o rediseño de pantalla en Aura3D cumplirá con un acabado de diseño industrial auténtico, limpio y profesional.
