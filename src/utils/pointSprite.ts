import * as THREE from 'three';

/**
 * Sprite circular de borde suave para materiales de puntos. Sin él, `THREE.Points` dibuja cuadrados
 * que, además, se agrandan al acercarse a la cámara. Quien lo cree debe llamar a `dispose()`.
 */
export function makePointSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
