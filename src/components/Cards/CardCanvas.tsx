import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, ImageOff } from 'lucide-react';
import { createBrowserCanvas } from '../../services/storyCard/assets';
import type { CardAssets } from '../../services/storyCard/blocks';
import { CARD_FORMATS, type CardConfig, type ResolvedCardContent } from '../../services/storyCard/config';
import { renderStoryCard } from '../../services/storyCard/templates';
import type { Ctx } from '../../services/storyCard/draw';
import { FOCUS_RING } from './controls';

interface CardCanvasProps {
  config: CardConfig;
  content: ResolvedCardContent;
  assets: CardAssets;
  /** Cambia cuando termina de cargar una tipografía: obliga a redibujar */
  fontsVersion: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Dibuja la tarjeta con el MISMO renderizador que la exportación, a la resolución que pide su
 * tamaño en pantalla. Lo que se ve aquí es exactamente lo que se descarga.
 */
export const CardCanvas: React.FC<CardCanvasProps> = ({ config, content, assets, fontsVersion, className, ariaLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cssWidth, setCssWidth] = useState(0);
  const spec = CARD_FORMATS[config.format];

  // Redibujar cuando cambia el tamaño en pantalla (ventana, formato…)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setCssWidth(canvas.clientWidth));
    observer.observe(canvas);
    setCssWidth(canvas.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Un solo redibujado por fotograma aunque cambien varios datos a la vez (p. ej. al arrastrar un slider)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || !cssWidth) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(cssWidth * dpr);
      const h = Math.round((w * spec.height) / spec.width);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d') as Ctx | null;
      if (!ctx) return;
      renderStoryCard(ctx, w, h, { config, content, assets, createCanvas: createBrowserCanvas });
    });
    return () => cancelAnimationFrame(raf);
  }, [config, content, assets, fontsVersion, cssWidth, spec.height, spec.width]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel ?? `Vista previa de la tarjeta: ${content.title}, de ${content.artist}`}
      className={className ?? 'block w-full'}
      style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
    />
  );
};

// ── Vista previa con marco y herramientas ───────────────────────────────────

interface CardPreviewProps extends Omit<CardCanvasProps, 'className' | 'ariaLabel'> {
  onCapture: () => boolean;
  capturedAt: number | null;
}

/** Ancho máximo de la vista previa según el formato (px CSS) */
const PREVIEW_WIDTH = { story: 292, post: 330, square: 350 } as const;

/**
 * Ancho de la vista previa: el máximo del formato, pero reducido si la ventana es baja para que la
 * tarjeta entera quepa a la vista (sin tener que desplazarse para ver la parte de abajo).
 * 330px = cabecera del estudio + pestañas + márgenes + barra de herramientas + pie de la vista previa.
 */
function previewWidth(format: CardConfig['format']): string {
  const spec = CARD_FORMATS[format];
  const aspect = spec.width / spec.height;
  return `max(170px, min(${PREVIEW_WIDTH[format]}px, calc((94vh - 330px) * ${aspect.toFixed(4)})))`;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ config, content, assets, fontsVersion, onCapture, capturedAt }) => {
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [captureNote, setCaptureNote] = useState<string | null>(null);
  const spec = CARD_FORMATS[config.format];
  const isStory = config.format === 'story';

  const handleCapture = () => {
    const ok = onCapture();
    setCaptureNote(ok ? 'Fotograma capturado' : 'No hay ningún visualizador visible para capturar');
    setTimeout(() => setCaptureNote(null), 2800);
  };

  const toolbarBtn = `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${FOCUS_RING}`;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {isStory && (
          <button
            type="button"
            aria-pressed={showSafeZones}
            onClick={() => setShowSafeZones((v) => !v)}
            className={`${toolbarBtn} ${
              showSafeZones
                ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                : 'border-white/12 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white'
            }`}
            title="Muestra lo que Instagram tapa en una historia: la cabecera y el campo de respuesta"
          >
            <Eye className="h-3.5 w-3.5" />
            Zonas de Instagram
          </button>
        )}
        <button
          type="button"
          onClick={handleCapture}
          className={`${toolbarBtn} border-white/12 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white`}
          title="Toma un fotograma nuevo del visualizador que se ve ahora en pantalla"
        >
          <Camera className="h-3.5 w-3.5" />
          Capturar fotograma
        </button>
      </div>

      {/* Marco: teléfono para historias, tarjeta limpia para post y cuadrado */}
      <div
        className={`relative p-2 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] ${
          isStory
            ? 'rounded-[40px] border border-white/20 bg-gradient-to-b from-white/[0.16] to-white/[0.04]'
            : 'rounded-[26px] border border-white/15 bg-white/[0.06]'
        }`}
        style={{ width: previewWidth(config.format) }}
      >
        <div className={`relative overflow-hidden bg-black ${isStory ? 'rounded-[32px]' : 'rounded-[20px]'}`}>
          <CardCanvas config={config} content={content} assets={assets} fontsVersion={fontsVersion} />

          {isStory && showSafeZones && (
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              <div className="flex h-[13.5%] items-end justify-center border-b border-dashed border-rose-300/60 bg-rose-500/20 pb-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                  Instagram: perfil y barra de progreso
                </span>
              </div>
              <div className="flex h-[20%] items-start justify-center border-t border-dashed border-rose-300/60 bg-rose-500/20 pt-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                  Instagram: responder y compartir
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-[2.25rem] flex-col items-center gap-1 text-center" aria-live="polite">
        <span className="font-mono text-[11px] text-white/40">
          {spec.width} × {spec.height} px · {spec.ratio}
        </span>
        {captureNote ? (
          <span className="text-xs text-violet-200">{captureNote}</span>
        ) : !assets.visualizer ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-200/80">
            <ImageOff className="h-3.5 w-3.5" />
            Sin captura del visualizador: se usa un aura generada
          </span>
        ) : capturedAt ? (
          <span className="text-xs text-white/35">Fotograma del visualizador capturado</span>
        ) : null}
      </div>
    </div>
  );
};
