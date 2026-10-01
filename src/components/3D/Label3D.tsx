import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Etiqueta 3D ligera: texto dibujado una vez en un canvas 2D y usado como textura.
 * Sustituye a drei <Text> (troika), que genera SDF en un contexto WebGL adicional y descarga
 * una fuente por red; en GPU integrada eso compite con el render principal.
 */

interface CachedLabel {
  texture: THREE.CanvasTexture;
  aspect: number;
  refs: number;
}

const cache = new Map<string, CachedLabel>();

function acquire(text: string, color: string): CachedLabel {
  const key = `${color}|${text}`;
  const hit = cache.get(key);
  if (hit) {
    hit.refs++;
    return hit;
  }
  const H = 64;
  const font = `600 ${H * 0.62}px ui-monospace, "SFMono-Regular", Consolas, monospace`;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const W = Math.ceil(measure.measureText(text).width) + 16;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, H / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const entry: CachedLabel = { texture, aspect: W / H, refs: 1 };
  cache.set(key, entry);
  return entry;
}

function release(text: string, color: string) {
  const key = `${color}|${text}`;
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    entry.texture.dispose();
    cache.delete(key);
  }
}

interface Label3DProps {
  text: string;
  color?: string;
  /** Alto del texto en unidades de mundo */
  size?: number;
  position?: [number, number, number];
  anchorX?: 'left' | 'center' | 'right';
}

export const Label3D: React.FC<Label3DProps> = ({
  text,
  color = '#aab4cb',
  size = 0.08,
  position = [0, 0, 0],
  anchorX = 'center',
}) => {
  const label = useMemo(() => acquire(text, color), [text, color]);
  useEffect(() => () => release(text, color), [text, color]);

  const width = size * label.aspect * 1.4;
  const offsetX = anchorX === 'left' ? width / 2 : anchorX === 'right' ? -width / 2 : 0;

  return (
    <mesh position={[position[0] + offsetX, position[1], position[2]]}>
      <planeGeometry args={[width, size * 1.4]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export default Label3D;
