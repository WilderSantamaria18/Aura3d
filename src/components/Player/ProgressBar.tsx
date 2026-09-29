import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { usePlaybackLoop, formatClock } from '../../hooks/usePlaybackLoop';
import { waveformService } from '../../services/waveformService';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Barra de progreso con onda.
 *
 * Rendimiento: la onda son dos canvas dibujados UNA vez (base tenue y capa activa); el avance
 * es un `clip-path` sobre la capa activa y un `transform` en el indicador, escritos por un bucle
 * fuera de React. Antes se re-renderizaban ~80 divs con transiciones cada 250 ms.
 */
export const ProgressBar: React.FC = React.memo(() => {
  const { isLucid, lucidPrimary, lucidThemePrimary, isSpotifyConnected, loopA, loopB, isLoopActive, currentTrack, isPlaying } =
    usePlayerStore(
      useShallow((s) => ({
        isLucid: s.isLucid,
        lucidPrimary: s.lucidPrimaryColor,
        lucidThemePrimary: s.lucidTheme.primary,
        isSpotifyConnected: s.isSpotifyConnected,
        loopA: s.loopA,
        loopB: s.loopB,
        isLoopActive: s.isLoopActive,
        currentTrack: s.currentTrack,
        isPlaying: s.isPlaying,
      }))
    );
  const duration = usePlayerStore((s) => s.duration);

  const { seek: engineSeek } = useAudioEngine();
  const { seek: spotifySeek } = useSpotifyPlayer();

  const barRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const playedWrapRef = useRef<HTMLDivElement>(null);
  const playedCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const hoverLabelRef = useRef<HTMLSpanElement>(null);
  const currentLabelRef = useRef<HTMLSpanElement>(null);
  const widthRef = useRef(0);
  const dragRef = useRef<{ active: boolean; time: number }>({ active: false, time: 0 });
  const lastSecondRef = useRef(-1);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const activeColor = isLucid ? lucidPrimary || lucidThemePrimary || '#00e5ff' : '#00e5ff';

  const waveformData = useMemo(() => {
    const trackKey = currentTrack ? `${currentTrack.id || currentTrack.title}_${currentTrack.artist}` : 'auralis_studio_default';
    return waveformService.generateDeterministic(trackKey, duration || 210, 96);
  }, [currentTrack, duration]);

  /* ── Dibujo de la onda (solo al cambiar pista, tamaño o color) ── */
  const drawWave = useCallback(() => {
    const base = baseCanvasRef.current;
    const played = playedCanvasRef.current;
    const host = barRef.current;
    if (!base || !played || !host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    widthRef.current = w;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [base, played]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    const peaks = waveformData.peaks;
    const n = peaks.length;
    const gap = Math.max(1, Math.round(w / n) * 0.28);
    const bw = Math.max(1.2, (w - gap * (n - 1)) / n);

    const paint = (canvas: HTMLCanvasElement, color: string, glow: boolean) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      if (glow) {
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const bh = Math.max(3, peaks[i] * (h - 2));
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, bw, bh, Math.min(bw / 2, 2));
        else ctx.rect(x, y, bw, bh);
      }
      ctx.fill();
    };
    paint(base, 'rgba(255,255,255,0.30)', false);
    paint(played, activeColor, true);
  }, [waveformData, activeColor]);

  useEffect(() => {
    drawWave();
    const host = barRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(drawWave);
    ro.observe(host);
    return () => ro.disconnect();
  }, [drawWave]);

  /* ── Avance: escribe directo al DOM ── */
  const paintProgress = useCallback((time: number, dur: number) => {
    const p = dur > 0 ? clamp01(time / dur) : 0;
    if (playedWrapRef.current) playedWrapRef.current.style.clipPath = `inset(0 ${(100 - p * 100).toFixed(3)}% 0 0)`;
    if (thumbRef.current) thumbRef.current.style.transform = `translate3d(${(p * widthRef.current).toFixed(2)}px,-50%,0)`;
    const sec = Math.floor(time);
    if (sec !== lastSecondRef.current && currentLabelRef.current) {
      lastSecondRef.current = sec;
      currentLabelRef.current.textContent = formatClock(time);
    }
  }, []);

  usePlaybackLoop(
    (t, d) => {
      if (dragRef.current.active) return;
      paintProgress(t, d);
    },
    isPlaying,
    30
  );

  // Duración o pista nuevas con la reproducción en pausa: reflejarlas de inmediato
  useEffect(() => {
    lastSecondRef.current = -1;
  }, [currentTrack, duration]);

  /* ── Interacción ── */
  const posFromEvent = (e: React.PointerEvent) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp01((e.clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!durationRef.current) return;
    const t = posFromEvent(e) * durationRef.current;
    dragRef.current = { active: true, time: t };
    paintProgress(t, durationRef.current);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dur = durationRef.current;
    if (!dur) return;
    const pos = posFromEvent(e);
    if (hoverRef.current) hoverRef.current.style.transform = `translate3d(${(pos * widthRef.current).toFixed(1)}px,0,0)`;
    if (hoverLabelRef.current) hoverLabelRef.current.textContent = formatClock(pos * dur);
    if (dragRef.current.active) {
      dragRef.current.time = pos * dur;
      paintProgress(dragRef.current.time, dur);
    }
  };

  const commitSeek = (time: number) => {
    if (isSpotifyConnected) spotifySeek(Math.round(time * 1000));
    else engineSeek(time);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const t = dragRef.current.time;
    dragRef.current.active = false;
    commitSeek(t);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ya liberado */
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dur = durationRef.current;
    if (!dur) return;
    const step = e.shiftKey ? 15 : 5;
    const cur = usePlayerStore.getState().currentTime;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      commitSeek(Math.min(dur, cur + step));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      commitSeek(Math.max(0, cur - step));
    }
  };

  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / Math.max(1, duration)) * 100))}%`;

  return (
    <div className="w-full flex items-center gap-2 select-none" style={{ color: activeColor }}>
      <span ref={currentLabelRef} className="w-9 text-right font-mono tabular-nums text-[10px] text-white/70 shrink-0">
        0:00
      </span>

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Posición de reproducción"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuetext={currentTrack ? currentTrack.title : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative flex-1 h-6 group cursor-pointer touch-none outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-md"
        title="Arrastra para buscar en la onda"
      >
        <canvas ref={baseCanvasRef} className="absolute inset-0 pointer-events-none opacity-90 group-hover:opacity-100" />
        <div ref={playedWrapRef} className="absolute inset-0 pointer-events-none" style={{ clipPath: 'inset(0 100% 0 0)' }}>
          <canvas ref={playedCanvasRef} />
        </div>

        {/* Bucle A–B */}
        {loopA !== null && loopB !== null && duration > 0 && (
          <div
            className={`absolute inset-y-0.5 rounded-md pointer-events-none ${
              isLoopActive ? 'bg-amber-400/20 border-x-2 border-amber-400' : 'bg-white/10 border-x border-white/30'
            }`}
            style={{ left: pct(loopA), width: pct(loopB - loopA) }}
          />
        )}

        {/* Marcadores de drop */}
        {waveformData.drops.map((drop, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${drop.timePct}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${drop.label} a los ${formatClock(drop.timestampSec)}`} />
            <div className="w-px flex-1 bg-amber-400/30" />
            <span className="hidden group-hover:flex items-center gap-0.5 text-[7px] font-mono font-bold text-amber-300 bg-black/80 px-1 rounded absolute -top-4 -translate-x-1/2 whitespace-nowrap border border-amber-400/30">
              <Zap className="w-2 h-2 text-amber-400" />
              {drop.label}
            </span>
          </div>
        ))}

        {loopA !== null && duration > 0 && (
          <div className="absolute -top-3.5 -translate-x-1/2 pointer-events-none z-20" style={{ left: pct(loopA) }}>
            <span className="text-[8px] font-mono font-bold px-1 rounded bg-amber-500 text-black leading-none">A</span>
          </div>
        )}
        {loopB !== null && duration > 0 && (
          <div className="absolute -top-3.5 -translate-x-1/2 pointer-events-none z-20" style={{ left: pct(loopB) }}>
            <span className="text-[8px] font-mono font-bold px-1 rounded bg-amber-500 text-black leading-none">B</span>
          </div>
        )}

        {/* Línea y tiempo al pasar el cursor */}
        <div
          ref={hoverRef}
          className="absolute top-0 bottom-0 left-0 w-px bg-white/50 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <span
            ref={hoverLabelRef}
            className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/15 text-[10px] font-mono text-white/90 tabular-nums whitespace-nowrap"
          >
            0:00
          </span>
        </div>

        {/* Indicador */}
        <div
          ref={thumbRef}
          className="absolute left-0 top-1/2 -ml-1 w-2 h-2 group-hover:w-2.5 group-hover:h-2.5 group-hover:-ml-[5px] rounded-full pointer-events-none z-20 transition-[width,height,margin] duration-150"
          style={{
            backgroundColor: '#fff',
            boxShadow: `0 0 0 2px ${activeColor}, 0 0 10px ${activeColor}`,
            transform: 'translate3d(0,-50%,0)',
          }}
        />
      </div>

      <span className="w-9 text-left font-mono tabular-nums text-[10px] text-white/45 shrink-0">{formatClock(duration)}</span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
