/**
 * Shared Visualizer Canvas Selector
 * Single source of truth to locate the active audio visualizer canvas,
 * prioritizing tagged visualizers, Rainbow Void, and active WebGL scenes,
 * explicitly ignoring decorative layers (AtmosphereBackground, AmbientGlow).
 */
export function findVisualizerCanvas(): HTMLCanvasElement | null {
  const all = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas'));
  const visible = all.filter((c) => {
    const r = c.getBoundingClientRect();
    return r.width > 120 && r.height > 120 && !c.closest('[aria-hidden="true"]');
  });

  // 1. Explicitly marked visualizer canvases
  const marked = visible.find((c) => c.dataset.visualizer === 'true');
  if (marked) return marked;

  // 2. Rainbow Void Canvas (2D Shaders)
  const rainbow = visible.find((c) => c.id === 'rainbow-void-canvas');
  if (rainbow) return rainbow;

  // 3. WebGL / WebGL2 Canvases (excluding full-screen decorative backdrops if any)
  const gl = visible.find((c) => {
    const isGl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    return isGl && !c.id.includes('atmosphere') && !c.id.includes('ambient');
  });
  if (gl) return gl;

  // 4. Largest visible canvas fallback
  return visible.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  })[0] ?? null;
}
