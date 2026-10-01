/**
 * Renderizador del aura en Canvas 2D.
 *
 * Técnica: cada color tiene un «sprite» de lóbulo (degradado radial pre-renderizado una sola vez) y cada
 * frame solo se estampa con drawImage, escalado y con globalAlpha. No se crean degradados ni canvases por
 * frame. El buffer es de baja resolución; el navegador lo amplía con filtrado bilineal, y ese reescalado
 * es el desenfoque del aura (sin `filter: blur()` ni `backdrop-filter`), mientras que el disco, el logo y
 * la carátula, que están en otras capas, siguen nítidos.
 */

import { parseColor } from '../effects/color';
import {
  computeAuraLobes,
  createAuraLobes,
  type AuraLobe,
  type AuraParams,
  type AuraSignals,
} from './auraLayout';

const SPRITE_SIZE = 96;

export class AuraRenderer {
  private sprites = new Map<string, HTMLCanvasElement>();
  private body: AuraLobe[] = createAuraLobes();
  private bloom: AuraLobe[] = createAuraLobes();

  private sprite(color: string): HTMLCanvasElement {
    let sprite = this.sprites.get(color);
    if (sprite) return sprite;

    sprite = document.createElement('canvas');
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const ctx = sprite.getContext('2d');
    if (ctx) {
      const [r, g, b] = parseColor(color);
      const c = SPRITE_SIZE / 2;
      const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
      // Caída suave y larga: sin borde visible entre lóbulos vecinos
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.3, `rgba(${r},${g},${b},0.62)`);
      grad.addColorStop(0.65, `rgba(${r},${g},${b},0.16)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
    if (this.sprites.size > 24) this.sprites.clear();
    this.sprites.set(color, sprite);
    return sprite;
  }

  /**
   * Dibuja el aura en `ctx` (canvas cuadrado de `size` px, centro en size/2).
   * @param discRadius radio del disco en px de ESTE buffer
   */
  draw(
    ctx: CanvasRenderingContext2D,
    size: number,
    discRadius: number,
    palette: readonly string[],
    bodySignals: AuraSignals,
    bloomSignals: AuraSignals,
    params: AuraParams
  ): void {
    ctx.clearRect(0, 0, size, size);
    if (discRadius <= 1 || params.intensity <= 0) return;

    const cx = size / 2;
    const cy = size / 2;
    // La luz debe apagarse antes del borde del canvas (94 % del semilado)
    const maxExtent = (size / 2) * 0.94 / discRadius;

    ctx.save();
    // `screen` suma luz sin llegar a blanquear la paleta (a diferencia de `lighter`)
    ctx.globalCompositeOperation = 'screen';

    // Bloom exterior: detrás y más tenue
    computeAuraLobes(this.bloom, 'bloom', bloomSignals, params, maxExtent);
    this.stamp(ctx, this.bloom, palette, cx, cy, discRadius);

    // Cuerpo cromático: la capa principal
    computeAuraLobes(this.body, 'body', bodySignals, params, maxExtent);
    this.stamp(ctx, this.body, palette, cx, cy, discRadius);

    // Halo interior: luz contenida justo detrás del perímetro del disco (separa disco y fondo);
    // sigue la deformación del núcleo y sube un instante con el transitorio
    ctx.globalCompositeOperation = 'source-over';
    const inner = 0.1 + 0.16 * params.intensity + bodySignals.kickEnv * 0.12 * params.kickResponse;
    const ring = ctx.createRadialGradient(cx, cy, discRadius * 0.96, cx, cy, discRadius * (1.3 + bodySignals.kick * 0.18));
    const [r, g, b] = parseColor(palette[2] ?? '#22d3ee');
    ring.addColorStop(0, `rgba(${r},${g},${b},${Math.min(0.5, inner).toFixed(3)})`);
    ring.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, size, size);

    ctx.restore();
  }

  private stamp(
    ctx: CanvasRenderingContext2D,
    lobes: AuraLobe[],
    palette: readonly string[],
    cx: number,
    cy: number,
    discRadius: number
  ): void {
    for (let i = 0; i < lobes.length; i++) {
      const l = lobes[i];
      if (l.alpha < 0.004) continue;
      const rad = l.radius * discRadius;
      const x = cx + Math.cos(l.angle) * l.dist * discRadius;
      const y = cy + Math.sin(l.angle) * l.dist * discRadius;
      ctx.globalAlpha = l.alpha;
      ctx.drawImage(this.sprite(palette[l.colorIndex % palette.length]), x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
  }

  dispose(): void {
    this.sprites.clear();
  }
}
