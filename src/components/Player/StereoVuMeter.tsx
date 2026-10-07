import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';

interface StereoVuMeterProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  segments?: number;
  label?: string;
  showLabels?: boolean;
  showCorrelation?: boolean;
}

/**
 * StereoVuMeter — Medidor VU de Doble Canal Estéreo con Segmentación LED y Peak Hold
 * Ofrece respuesta balística analógica de estudio (ataque inmediato y caída exponencial).
 */
export const StereoVuMeter: React.FC<StereoVuMeterProps> = ({
  className = '',
  orientation = 'horizontal',
  segments = 12,
  label,
  showLabels = true,
  showCorrelation = false,
}) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const primaryColor = isLucid ? lucidTheme?.primary || '#00e5ff' : '#00e5ff';

  const leftLevelRef = useRef(0);
  const rightLevelRef = useRef(0);
  const leftPeakRef = useRef(0);
  const rightPeakRef = useRef(0);
  const leftHoldTimerRef = useRef(0);
  const rightHoldTimerRef = useRef(0);

  const leftSegmentsRef = useRef<HTMLDivElement[]>([]);
  const rightSegmentsRef = useRef<HTMLDivElement[]>([]);
  const corrTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();
    let lastCorrUpdate = 0;

    const updateMeter = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (!isPlaying) {
        // En reposo, decaer suavemente a cero
        leftLevelRef.current = Math.max(0, leftLevelRef.current - dt * 2.5);
        rightLevelRef.current = Math.max(0, rightLevelRef.current - dt * 2.5);
        leftPeakRef.current = Math.max(0, leftPeakRef.current - dt * 1.5);
        rightPeakRef.current = Math.max(0, rightPeakRef.current - dt * 1.5);
      } else {
        const stereoData = AudioEngine.getInstance().getStereoPhaseData();
        const leftBuf = stereoData.left;
        const rightBuf = stereoData.right;

        let rmsL = 0;
        let rmsR = 0;
        const len = leftBuf ? leftBuf.length : 0;
        if (len > 0) {
          for (let i = 0; i < len; i += 2) {
            rmsL += leftBuf[i] * leftBuf[i];
            rmsR += rightBuf[i] * rightBuf[i];
          }
          rmsL = Math.sqrt(rmsL / (len / 2)) * 2.6;
          rmsR = Math.sqrt(rmsR / (len / 2)) * 2.6;
        }

        const freqData = AudioEngine.getInstance().getFrequencyData();
        const energy = freqData.energy || 0;
        const bass = freqData.bass || 0;
        const mids = freqData.mids || 0;
        const highs = freqData.highs || 0;

        // Separación estéreo armónica o física
        const timePhase = now * 0.0025;
        const fallbackLeft = Math.min(
          1,
          Math.max(0, energy * 0.65 + bass * 0.45 + highs * 0.15 + Math.sin(timePhase) * 0.06)
        );
        const fallbackRight = Math.min(
          1,
          Math.max(0, energy * 0.65 + mids * 0.45 + highs * 0.15 + Math.cos(timePhase) * 0.06)
        );

        const targetLeft = Math.min(1, Math.max(0, rmsL > 0.015 ? rmsL : fallbackLeft));
        const targetRight = Math.min(1, Math.max(0, rmsR > 0.015 ? rmsR : fallbackRight));

        // Balística analógica: Ataque ultra rápido, liberación exponencial suave
        leftLevelRef.current += (targetLeft - leftLevelRef.current) * (targetLeft > leftLevelRef.current ? 0.65 : 0.18);
        rightLevelRef.current += (targetRight - rightLevelRef.current) * (targetRight > rightLevelRef.current ? 0.65 : 0.18);

        if (showCorrelation && corrTextRef.current && now - lastCorrUpdate > 80) {
          lastCorrUpdate = now;
          const corr = stereoData.correlation;
          corrTextRef.current.textContent = `${corr >= 0 ? '+' : ''}${corr.toFixed(2)} Ø`;
          corrTextRef.current.style.color = corr < 0 ? '#f43f5e' : corr < 0.3 ? '#fbbf24' : primaryColor;
        }

        // Peak Hold de 1.2 segundos
        if (leftLevelRef.current > leftPeakRef.current) {
          leftPeakRef.current = leftLevelRef.current;
          leftHoldTimerRef.current = now + 1200;
        } else if (now > leftHoldTimerRef.current) {
          leftPeakRef.current = Math.max(leftLevelRef.current, leftPeakRef.current - dt * 0.8);
        }

        if (rightLevelRef.current > rightPeakRef.current) {
          rightPeakRef.current = rightLevelRef.current;
          rightHoldTimerRef.current = now + 1200;
        } else if (now > rightHoldTimerRef.current) {
          rightPeakRef.current = Math.max(rightLevelRef.current, rightPeakRef.current - dt * 0.8);
        }
      }

      // Actualizar DOM directo en elementos de segmentos (evita re-renders en React)
      const lThreshold = leftLevelRef.current * segments;
      const rThreshold = rightLevelRef.current * segments;
      const lPeakIdx = Math.min(segments - 1, Math.floor(leftPeakRef.current * segments));
      const rPeakIdx = Math.min(segments - 1, Math.floor(rightPeakRef.current * segments));

      for (let i = 0; i < segments; i++) {
        const lEl = leftSegmentsRef.current[i];
        if (lEl) {
          const isActive = i < lThreshold;
          const isPeak = i === lPeakIdx && leftPeakRef.current > 0.08;
          lEl.style.opacity = isActive || isPeak ? '1' : '0.12';
          lEl.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
        }

        const rEl = rightSegmentsRef.current[i];
        if (rEl) {
          const isActive = i < rThreshold;
          const isPeak = i === rPeakIdx && rightPeakRef.current > 0.08;
          rEl.style.opacity = isActive || isPeak ? '1' : '0.12';
          rEl.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
        }
      }

      rafId = requestAnimationFrame(updateMeter);
    };

    rafId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, segments, showCorrelation, primaryColor]);

  // Color de los segmentos según umbral dB
  const getSegmentColor = (index: number) => {
    const ratio = index / segments;
    if (ratio < 0.6) return primaryColor; // Zona segura verde/cyan
    if (ratio < 0.85) return '#fbbf24'; // Zona cálida amarilla/ámbar
    return '#f43f5e'; // Zona de saturación roja/rosa
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={`flex select-none pointer-events-none ${
        isHorizontal ? 'flex-col gap-1' : 'flex-row gap-1.5 items-end'
      } ${className}`}
      aria-hidden="true"
    >
      {(label || showCorrelation) && (
        <div className="flex items-center justify-between text-[8px] font-mono text-white/50 tracking-widest uppercase">
          <span>{label || 'VU METER'}</span>
          <div className="flex items-center gap-1.5">
            {showCorrelation && (
              <span ref={corrTextRef} className="font-bold text-[7px] px-1 py-0.5 rounded bg-white/[0.06] transition-colors">
                +1.00 Ø
              </span>
            )}
            {showLabels && <span className="text-[7px] text-white/40">VU dB</span>}
          </div>
        </div>
      )}

      {/* Canal Izquierdo (L) */}
      <div className={`flex items-center gap-1 ${isHorizontal ? 'flex-row' : 'flex-col-reverse'}`}>
        {showLabels && <span className="text-[8px] font-mono font-bold text-white/40 w-2.5 text-center">L</span>}
        <div className={`flex gap-[2px] ${isHorizontal ? 'flex-row flex-1' : 'flex-col-reverse'}`}>
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={`L-${i}`}
              ref={(el) => {
                if (el) leftSegmentsRef.current[i] = el;
              }}
              className={`rounded-[1px] transition-transform duration-75 ${
                isHorizontal ? 'h-1.5 flex-1 min-w-[3px]' : 'w-2 h-1'
              }`}
              style={{
                backgroundColor: getSegmentColor(i),
                boxShadow: i >= segments - 2 ? '0 0 6px rgba(244,63,94,0.6)' : undefined,
                opacity: 0.12,
              }}
            />
          ))}
        </div>
      </div>

      {/* Canal Derecho (R) */}
      <div className={`flex items-center gap-1 ${isHorizontal ? 'flex-row' : 'flex-col-reverse'}`}>
        {showLabels && <span className="text-[8px] font-mono font-bold text-white/40 w-2.5 text-center">R</span>}
        <div className={`flex gap-[2px] ${isHorizontal ? 'flex-row flex-1' : 'flex-col-reverse'}`}>
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={`R-${i}`}
              ref={(el) => {
                if (el) rightSegmentsRef.current[i] = el;
              }}
              className={`rounded-[1px] transition-transform duration-75 ${
                isHorizontal ? 'h-1.5 flex-1 min-w-[3px]' : 'w-2 h-1'
              }`}
              style={{
                backgroundColor: getSegmentColor(i),
                boxShadow: i >= segments - 2 ? '0 0 6px rgba(244,63,94,0.6)' : undefined,
                opacity: 0.12,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
