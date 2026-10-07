import React, { useState, useEffect, useRef } from 'react';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { usePlayerStore } from '../../stores/playerStore';
import { hexToRgba } from '../../types/audio';
import { useVisualizer } from '../../hooks/useVisualizer';
import { clampDelta } from '../../utils/frameTiming';
import {
  harmonizeEcosystemWithWallpaper,
  resetWallpaperThemeVariables,
} from '../../services/wallpaperColorService';

interface WallpaperImageLayerProps {
  url: string;
  prompt?: string;
  fit: 'cover' | 'contain' | 'fill';
  scale: number;
  blur: number;
  brightness: number;
  saturation: number;
  blendMode?: string;
  hasCustomFilters: boolean;
  opacity: number;
  zIndex: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * WallpaperImageLayer
 * Capa de renderizado con aceleración GPU para un fondo individual con proporciones
 * cinematográficas exactas y soporte de fondo difuminado ambiental para 'contain'.
 */
const WallpaperImageLayer: React.FC<WallpaperImageLayerProps> = React.memo(
  ({
    url,
    prompt,
    fit,
    scale,
    blur,
    brightness,
    saturation,
    blendMode,
    hasCustomFilters,
    opacity,
    zIndex,
    onLoad,
    onError,
  }) => {
    return (
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none select-none"
        style={{ opacity, zIndex }}
        aria-hidden={zIndex === 1 ? 'true' : undefined}
      >
        {/* Ambient blurred backdrop if fit === 'contain' so vertical/square wallpapers look stunning without harsh voids */}
        {fit === 'contain' && (
          <img
            src={url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-45 scale-110 pointer-events-none select-none"
          />
        )}

        <img
          src={url}
          alt={prompt || 'Fondo Aura3D'}
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={onLoad}
          onError={onError}
          className="w-full h-full select-none pointer-events-none will-change-transform transform-gpu transition-[filter] duration-300 relative z-[2]"
          style={{
            objectFit: fit,
            mixBlendMode: blendMode === 'normal' ? undefined : (blendMode as any),
            transform: `scale(${scale * (blur > 0 ? 1.04 : 1.0)})`,
            filter: hasCustomFilters
              ? `blur(${blur}px) brightness(${brightness}) saturate(${saturation})`
              : undefined,
          }}
        />
      </div>
    );
  }
);

/**
 * WallpaperBackground (Fase 2: Dual-Buffer Crossfade + 3D Parallax Depth + Chameleon Glass)
 * 1. Dual-Buffer: Cero parpadeos negros al cambiar de fondo (transición cruzada cinematográfica).
 * 2. 3D Spatial Parallax: Movimiento suave por aceleración GPU que otorga profundidad tridimensional.
 * 3. Chameleon Glass: Sincronización cromática continua con las superficies Liquid Glass.
 */
export const WallpaperBackground: React.FC = () => {
  const storeWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const applicationSettings = useWallpaperStore((s) => s.applicationSettings);

  const customBg = usePlayerStore((s) => s.blobSettings?.customBackgroundImage);
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme?.primary || '#00f5d4');
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme?.secondary || '#ffd166');

  // URL activa unificada (preset seleccionado o imagen subida por el usuario)
  const effectiveUrl = storeWallpaper?.url || customBg || null;

  // ── 1. Chameleon Glass: Armonización cromática dinámica continua ──
  useEffect(() => {
    if (effectiveUrl) {
      void harmonizeEcosystemWithWallpaper(
        effectiveUrl,
        storeWallpaper?.title || 'Fondo Activo',
        storeWallpaper?.palette,
        storeWallpaper?.style
      );
    } else {
      resetWallpaperThemeVariables();
    }
  }, [effectiveUrl, storeWallpaper?.title, storeWallpaper?.palette, storeWallpaper?.style]);

  // ── 2. Dual-Buffer Crossfader: Elimina el destello negro al alternar fondos ──
  const [baseSrc, setBaseSrc] = useState<string | null>(effectiveUrl);
  const [basePrompt, setBasePrompt] = useState<string | undefined>(storeWallpaper?.prompt);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(null);
  const [incomingPrompt, setIncomingPrompt] = useState<string | undefined>(undefined);
  const [incomingLoaded, setIncomingLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!effectiveUrl) {
      if (baseSrc) {
        setIsClearing(true);
        const timer = setTimeout(() => {
          setBaseSrc(null);
          setIncomingSrc(null);
          setIsClearing(false);
        }, 500);
        return () => clearTimeout(timer);
      }
      return;
    }

    setIsClearing(false);
    setLoadError(false);

    // Montaje inicial
    if (!baseSrc) {
      setBaseSrc(effectiveUrl);
      setBasePrompt(storeWallpaper?.prompt);
      setIncomingSrc(null);
      setIncomingLoaded(false);
      return;
    }

    // Nuevo wallpaper seleccionado mientras ya hay uno visible
    if (effectiveUrl !== baseSrc) {
      setIncomingSrc(effectiveUrl);
      setIncomingPrompt(storeWallpaper?.prompt);
      setIncomingLoaded(false);
    }
  }, [effectiveUrl, storeWallpaper?.prompt]);

  // Al completar la carga de la imagen entrante, tras el crossfade, se consolida como base
  useEffect(() => {
    if (incomingLoaded && incomingSrc) {
      const timer = setTimeout(() => {
        setBaseSrc(incomingSrc);
        setBasePrompt(incomingPrompt);
        setIncomingSrc(null);
        setIncomingLoaded(false);
      }, 720);
      return () => clearTimeout(timer);
    }
  }, [incomingLoaded, incomingSrc, incomingPrompt]);

  // ── 3. 3D Spatial Parallax: Desplazamiento fluido visionOS desacoplado ──
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;
    let isMoving = false;
    let idleTimer: any = null;

    const MAX_OFFSET = 10;
    const LERP = 0.055;

    const updateParallax = () => {
      const targetX = mouseX * -MAX_OFFSET;
      const targetY = mouseY * -MAX_OFFSET;

      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;

      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) scale(1.045)`;
      }

      const dist = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      if (dist > 0.04) {
        rafId = requestAnimationFrame(updateParallax);
      } else {
        isMoving = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

      if (!isMoving) {
        isMoving = true;
        rafId = requestAnimationFrame(updateParallax);
      }

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // settle
      }, 800);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(rafId);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  // ── 4. Reactividad Acústica: Zoom y flash reactivos en compositor GPU ──
  const reactive = blobSettings?.backgroundReactive ?? true;
  const reactiveAmount = blobSettings?.backgroundReactiveAmount ?? 0.6;
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { getSmoothedData } = useVisualizer(0.2, { timeBased: true });
  const stageRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reset = () => {
      if (stageRef.current) stageRef.current.style.transform = '';
      if (flashRef.current) flashRef.current.style.opacity = '0';
    };
    if (!reactive || !isPlaying) {
      reset();
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const amount = reactiveAmount * (reduced ? 0.25 : 1);
    let raf = 0;
    let last = performance.now();
    let kickEnv = 0;
    let pulse = 0;
    let shownPulse = -1;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = clampDelta((now - last) / 1000);
      last = now;
      const data = getSmoothedData();
      kickEnv = Math.max(kickEnv * Math.exp(-dt * 7), data.kick ? data.kickStrength : 0);
      const level = Math.min(1, data.bass * 0.45 + kickEnv * 0.75);
      pulse += (level - pulse) * (1 - Math.exp(-dt * (level > pulse ? 30 : 6)));
      if (Math.abs(pulse - shownPulse) < 0.002) return;
      shownPulse = pulse;
      if (stageRef.current) stageRef.current.style.transform = `scale(${(1 + 0.03 * amount * pulse).toFixed(4)})`;
      if (flashRef.current) flashRef.current.style.opacity = (0.16 * amount * pulse).toFixed(3);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      reset();
    };
  }, [reactive, reactiveAmount, isPlaying, getSmoothedData]);

  if ((!baseSrc && !incomingSrc) || loadError) {
    return null;
  }

  // Ajustes combinados de tienda y blob
  const opacity = blobSettings?.backgroundOpacity ?? applicationSettings?.opacity ?? 1;
  const blur = blobSettings?.backgroundBlur ?? applicationSettings?.blur ?? 0;
  const brightness = applicationSettings?.brightness ?? 1.0;
  const saturation = applicationSettings?.saturation ?? 1.0;
  const fit = blobSettings?.backgroundFit || 'cover';
  const scale = blobSettings?.backgroundScale || 1.0;
  const contrastMode = blobSettings?.backgroundContrastMode || 'text_clarity';
  const textScrim = blobSettings?.backgroundTextScrim ?? 0.35;
  const themeTint = blobSettings?.backgroundThemeTint ?? 0.35;
  const blendMode = applicationSettings?.blendMode ?? 'normal';

  const hasCustomFilters = blur > 0 || brightness !== 1.0 || saturation !== 1.0;

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden">
      {/* Contenedor Parallax 3D (Desplazamiento e inercia espacial independiente) */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 w-full h-full will-change-transform transform-gpu pointer-events-none"
        style={{ transform: 'translate3d(0, 0, 0) scale(1.045)' }}
      >
        {/* Contenedor Acústico GPU (Pulsos de graves y bombo) */}
        <div
          ref={stageRef}
          className="w-full h-full relative will-change-transform transform-gpu"
        >
          {/* Capa Base Buffer 0 (Permanente / Saliente durante crossfade) */}
          {baseSrc && (
            <WallpaperImageLayer
              key={`base-${baseSrc}`}
              url={baseSrc}
              prompt={basePrompt}
              fit={fit}
              scale={scale}
              blur={blur}
              brightness={brightness}
              saturation={saturation}
              blendMode={blendMode}
              hasCustomFilters={hasCustomFilters}
              opacity={isClearing ? 0 : opacity}
              zIndex={1}
              onError={() => {
                console.warn('[WallpaperBackground] Error cargando capa base:', baseSrc);
                setLoadError(true);
              }}
            />
          )}

          {/* Capa Entrante Buffer 1 (Aparece suavemente sobre la base sin destello negro) */}
          {incomingSrc && (
            <WallpaperImageLayer
              key={`incoming-${incomingSrc}`}
              url={incomingSrc}
              prompt={incomingPrompt}
              fit={fit}
              scale={scale}
              blur={blur}
              brightness={brightness}
              saturation={saturation}
              blendMode={blendMode}
              hasCustomFilters={hasCustomFilters}
              opacity={incomingLoaded ? opacity : 0}
              zIndex={2}
              onLoad={() => {
                setIncomingLoaded(true);
              }}
              onError={() => {
                console.warn('[WallpaperBackground] Error cargando capa entrante:', incomingSrc);
                setIncomingSrc(null);
                setIncomingLoaded(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Destello reactivo a los graves (opacidad animada desde el efecto) */}
      {reactive && (
        <div
          ref={flashRef}
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{
            opacity: 0,
            mixBlendMode: 'screen',
            background: `radial-gradient(ellipse at 50% 45%, ${hexToRgba(lucidPrimary, 0.55)} 0%, ${hexToRgba(lucidSecondary, 0.25)} 45%, transparent 75%)`,
          }}
        />
      )}

      {/* Capa de Protección de Contraste y Legibilidad para el Texto de la UI */}
      {contrastMode !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none z-[4] transition-all duration-300"
          style={{
            background:
              contrastMode === 'deep_cinema'
                ? `radial-gradient(ellipse at 50% 50%, rgba(3, 5, 12, ${textScrim * 0.4}) 0%, rgba(1, 2, 6, ${Math.min(0.9, textScrim * 0.95)}) 100%)`
                : contrastMode === 'lucid_tint'
                ? `radial-gradient(ellipse at 50% 40%, ${hexToRgba(lucidPrimary, themeTint * 0.35)} 0%, rgba(4, 6, 14, ${textScrim * 0.85}) 90%), linear-gradient(180deg, rgba(3, 5, 12, ${textScrim * 0.5}) 0%, ${hexToRgba(lucidSecondary, themeTint * 0.2)} 50%, rgba(1, 2, 6, ${textScrim * 0.7}) 100%)`
                : /* text_clarity (default) */
                  `radial-gradient(ellipse at 50% 50%, rgba(3, 6, 14, ${textScrim * 0.2}) 0%, rgba(1, 3, 8, ${Math.min(0.85, textScrim * 0.85)}) 100%), linear-gradient(180deg, rgba(2, 4, 10, ${textScrim * 0.5}) 0%, transparent 35%, transparent 65%, rgba(2, 4, 10, ${textScrim * 0.6}) 100%)`,
          }}
        />
      )}

      {/* Modo Lucid Master Fusion Layer: Unifica el fondo con el ecosistema de Aura3D */}
      {isLucid && (
        <div
          className="absolute inset-0 pointer-events-none z-[5] transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 35%, ${hexToRgba(lucidPrimary, 0.12)} 0%, ${hexToRgba(lucidSecondary, 0.06)} 50%, rgba(2, 4, 10, 0.45) 100%)`,
          }}
        />
      )}

      {/* Cinematographic Vignette Layer */}
      {applicationSettings?.vignette && (
        <div
          className="absolute inset-0 pointer-events-none z-[6]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(1, 2, 6, 0.55) 100%)',
          }}
        />
      )}
    </div>
  );
};

export default WallpaperBackground;

