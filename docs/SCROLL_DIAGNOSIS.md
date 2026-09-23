# Diagnóstico del Scroll en Aura3D Landing

**Fecha:** 22 de Septiembre, 2026  
**Investigador:** Antigravity Engine Architecture Team  
**Estado:** Resuelto (Fase 0 completada)

---

## 1. Problema Reportado
El usuario no puede realizar scroll vertical en la landing de bienvenida de Aura3D. La página aparece bloqueada o estática en el primer viewport, impidiendo explorar los canales y secciones narrativas.

---

## 2. Inspección del DOM y CSS Computado (Causa Raíz)

Tras inspeccionar `index.html`, `src/App.tsx`, `src/index.css` y la configuración de hooks, se identificaron **4 causas interconectadas** que bloqueaban el flujo de scroll:

### Causa 1: `overflow: hidden` global en `index.html`
- **Ubicación:** `index.html` (Líneas 30–41):
  ```css
  html, body {
    margin: 0;
    padding: 0;
    background: #03050c;
    color: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden; /* <--- CAUSA CRÍTICA */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    user-select: none;
    -webkit-user-select: none;
  }
  ```
- **Efecto:** Al tener `overflow: hidden` en `html, body`, el objeto nativo `window` jamás reporta scroll (`window.scrollY === 0` constante). Todos los eventos de wheel se suprimen o no mueven el documento.

### Causa 2: `#root` con `height: 100dvh` fijo en `index.html`
- **Ubicación:** `index.html` (Líneas 43–46):
  ```css
  #root {
    width: 100vw;
    height: 100dvh; /* <--- CAUSA CRÍTICA */
  }
  ```
- **Efecto:** El contenedor raíz de React está rígidamente fijado al 100% de la altura de la pantalla, impidiendo que el contenido interno expanda la altura total navegable.

### Causa 3: Contenedor orquestador en `src/App.tsx` con `overflow-hidden` y `h-[100dvh]`
- **Ubicación:** `src/App.tsx` (Línea 246 y Líneas 288–296):
  ```tsx
  <div
    ref={rootRef}
    className="relative w-full h-[100dvh] overflow-hidden select-none font-sans ..."
  >
    {/* Landing Container */}
    <div className="absolute inset-0 z-50 ...">
      {FEATURES.LANDING_V2 ? <LandingScreenV2 /> : <LandingScreen />}
    </div>
  ```
- **Efecto:** El contenedor padre de la aplicación tiene `h-[100dvh]` y `overflow-hidden`. Además, el envoltorio de la landing tiene `absolute inset-0` sin `overflow-y: auto`, atrapando el scroll dentro de una caja con altura fija sin barra ni desbordamiento permitido.

### Causa 4: Desconexión de Lenis respecto al contenedor real
- **Ubicación:** `src/hooks/useLenis.ts`:
  Lenis se instanciaba escuchando `window`, pero al estar bloqueado el body y no propagarse el scroll del wrapper, la interpolación física nunca ocurría.

---

## 3. Plan de Fix Arquitectónico

1. **Liberar `index.html`:**
   - Quitar `overflow: hidden` de `html, body` en `index.html`.
   - Ajustar `#root` para usar `min-height: 100dvh; width: 100%;` en vez de `height: 100dvh; width: 100vw;`.

2. **Diferenciación de Estado en `src/App.tsx`:**
   - Cuando `hasStarted === false` (Modo Landing):
     - El contenedor raíz usa `min-h-[100dvh] w-full relative` (sin `overflow-hidden`).
     - El envoltorio de la landing es relativo y permite el crecimiento natural de los 7 actos.
   - Cuando `hasStarted === true` (Modo Motor 3D):
     - El contenedor raíz conmuta a `fixed inset-0 overflow-hidden` (o `h-[100dvh] overflow-hidden`), garantizando que los visualizadores Three.js y el lienzo de audio ocupen exactamente el viewport sin barras de scroll accidentales.

3. **Motor Lenis V3 (`src/hooks/useLenis.ts`):**
   - Configuración Apple Liquid Glass (lerp 1.4s, cubic bezier easing, wheelMultiplier 0.9, touchMultiplier 1.8).
   - Fallback inmediato a scroll nativo en móvil (`pointer: coarse`) y en accesibilidad (`prefers-reduced-motion: reduce`).
   - Destrucción inmediata (`lenis.destroy()`) y cancelación de `requestAnimationFrame` al pulsar "Iniciar Aura3D".

4. **Sistema de Reveals y 7 Actos:**
   - Intersección GPU acelerada vía `IntersectionObserver` con `threshold: 0.15` y `rootMargin: '0px 0px -100px 0px'`.
   - Progreso unificado con `useLandingProgress` alimentando la Dynamic Island superior y el Progress Rail lateral.
