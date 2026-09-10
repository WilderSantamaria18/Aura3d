# Aura3D — Design System & Visual Authority (DESIGN.md)

> **Visual World**: Audio Hardware Craft / Precision Studio Console  
> **Inspiration**: Teenage Engineering, Ableton, Elektron, Dieter Rams / Braun  
> **Standard**: Impeccable High-Craft Quality Floor  

---

## 1. Filosofía de Diseño

1. **La Interfaz Retrocede, la Música y el 3D Protagonizan**:
   - Los controles de la interfaz son herramientas de precisión quirúrgica: acabado mate, sin luces estridentes ni resplandores que compitan con el renderizado tridimensional WebGL.
2. **Elevación Física Real vs. Halos Neón**:
   - Se prohíbe el uso de `box-shadow: 0 0 Xpx color` como sustituto de profundidad. Toda superficie flotante utiliza desplazamiento vertical en el eje Y y desenfoque progresivo suave.
3. **Tipografía de Audio con Datos Tabulares**:
   - Toda telemetría (frecuencias Hz, decibelios dB, tiempo 03:42, BPM, FPS) utiliza obligatoriamente fuentes monoespaciadas con cifras tabulares (`tabular-nums font-mono`) para garantizar estabilidad visual sin vibraciones de ancho.
4. **Estructura Plana sin Tarjetas Anidadas (*Nested Cards*)**:
   - Los paneles modales se organizan como consolas continuas de rack, separando secciones mediante espaciado generoso (rejilla de 8px) y micro-divisores de 1px con opacidad ≤ 8%, nunca cajas dentro de cajas.

---

## 2. Tokens Oficiales de Superficie y Color

### Paleta de Superficies Neutras (Dark Slate Studio)
```css
--surface-base:      #05070d; /* Fondo inmersivo global de la app */
--surface-canvas:    #090d18; /* Paneles primarios, barra superior y docks */
--surface-raised:    #101524; /* Tarjetas elevadas de control */
--surface-overlay:   #171d30; /* Modales y menús flotantes */
--surface-hover:     #1f263e; /* Estados interactivos activos */

--border-subtle:     rgba(255, 255, 255, 0.06);
--border-medium:     rgba(255, 255, 255, 0.12);
--border-focus:      #00e5ff; /* Foco accesible de alta visibilidad */

--text-primary:      #f0f4fc; /* Contraste máximo ≥ 12:1 */
--text-secondary:    #8b95a5; /* Secundario verificado WCAG AA ≥ 4.5:1 */
--text-tertiary:     #556075; /* Deshabilitados / etiquetas sutiles */
```

### Paleta de Acentos Funcionales
- **Cyan Estudio (`#00e5ff`)**: Estado activo primario, audio DSP, playback y frecuencia principal.
- **Esmeralda Analógica (`#00ff9d`)**: Indicador de señal en vivo, micrófono activo y telemetría de salud (60 FPS).
- **Ámbar / Naranja Válvula (`#ff9100`)**: Modo Bypass de EQ, picos de ganancia y advertencias de sistema.
- **Violeta Atmosférico (`#7928ca`)**: Modo Lúcido y modulaciones cromáticas nocturnas.

---

## 3. Jerarquía y Elevación

### Niveles de Elevación (Shadow System)
- **Nivel 1 (Superficies de control y docks)**:
  `box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3);`
- **Nivel 2 (Modales, consolas flotantes y sidebars)**:
  `box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.85), 0 8px 24px -4px rgba(0, 0, 0, 0.5);`

### Radios de Borde (Corner Radii)
- **Modales y paneles contenedores**: `16px` (`rounded-2xl`).
- **Canales de rack, controles agrupados**: `12px` (`rounded-xl`).
- **Botones pequeños, badges y chips**: `8px` (`rounded-lg`).
- **Controles rotatorios, knobs y toggles circulares**: `9999px` (`rounded-full`).

---

## 4. Curvas de Movimiento y Animación

Toda transición de interfaz (hover, apertura de diálogos, faders) debe utilizar aceleración suave hacia afuera sin rebotes no intencionales:

```css
transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); /* Ease-out exponencial suave */
transition-duration: 180ms; /* Interacciones micro */
transition-duration: 300ms; /* Paneles y diálogos */
```

---

## 5. Prohibiciones Absolutas (Anti-Patrones de IA)

1. ❌ **Prohibido**: Texto en gradiente (`bg-clip-text text-transparent`).
2. ❌ **Prohibido**: Sombras de texto o de caja con desenfoque sin desplazamiento (`shadow-[0_0_Xpx_color]`).
3. ❌ **Prohibido**: Tarjetas dentro de tarjetas con bordes repetitivos (*nested cards*).
4. ❌ **Prohibido**: Botones flotantes tipo píldora (`rounded-full`) para elementos rectangulares con texto largo.
5. ❌ **Prohibido**: Texto gris secundario con contraste menor a 4.5:1 respecto a su fondo.
