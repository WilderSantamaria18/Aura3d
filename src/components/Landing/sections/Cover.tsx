import React, { useRef, useEffect, useState } from 'react';
import './ConicStation.css';

interface CoverProps {
  onEnter: () => void;
}

export const Cover: React.FC<CoverProps> = ({ onEnter }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusElRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Configuration constants
    const N = 160;
    const ELLIPSE_RATIO = 0.40;
    const ROTATION_SPEED = 0.09; // rad/s
    const BOOT_DURATION = 2400; // ms

    // Pre-calculated bar base frequencies & envelopes
    const BASE_AMPS = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      // Spectrum signature: punchy bass, natural scoop in low-mids, lift in presence, gentle air rolloff
      const bass = Math.exp(-t * 8.5) * 0.48;
      const body = Math.sin(t * Math.PI) * 0.16;
      const presence = Math.exp(-Math.pow((t - 0.65) / 0.18, 2)) * 0.22;
      BASE_AMPS[i] = 0.08 + bass + body + presence;
    }

    const currentAmps = new Float32Array(N);
    const peakAmps = new Float32Array(N);
    const barOrder = new Uint16Array(N);
    const sinTable = new Float32Array(N);

    // Pre-allocate color strings for fast rendering without overhead
    function getFrequencyColor(t: number, alpha: number) {
      let r: number, g: number, b: number;
      if (t < 0.35) {
        const p = t / 0.35;
        r = Math.round(110 + (160 - 110) * p);
        g = Math.round(55 + (110 - 55) * p);
        b = Math.round(210 + (250 - 210) * p);
      } else if (t < 0.72) {
        const p = (t - 0.35) / (0.72 - 0.35);
        r = Math.round(160 + (0 - 160) * p);
        g = Math.round(110 + (220 - 110) * p);
        b = Math.round(250 + (255 - 250) * p);
      } else {
        const p = (t - 0.72) / (1.0 - 0.72);
        r = Math.round(0 + (255 - 0) * p);
        g = Math.round(220 + (40 - 220) * p);
        b = Math.round(255 + (185 - 255) * p);
      }
      return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
    }

    let dpr = 1;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let R = 180;
    let centerX = width / 2;
    let centerY = height * 0.46;
    let rotationAngle = 0;
    let startTime = performance.now();
    let lastTime = startTime;
    let isBooting = !prefersReducedMotion;
    let animId = 0;

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isMobile = width < 768;
      const isNarrowMobile = width < 480;

      if (isMobile) {
        R = width * (isNarrowMobile ? 0.36 : 0.34);
        centerY = height * 0.44;
      } else {
        R = Math.min(width, height) * 0.24;
        centerY = height * 0.46;
      }
      centerX = width / 2;

      ctx.fillStyle = '#050710';
      ctx.fillRect(0, 0, width, height);
    }

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    };
    window.addEventListener('resize', handleResize);

    // Initialize sizes
    resize();

    if (prefersReducedMotion) {
      for (let i = 0; i < N; i++) {
        currentAmps[i] = BASE_AMPS[i];
        peakAmps[i] = BASE_AMPS[i];
      }
      if (statusElRef.current) statusElRef.current.textContent = 'Activo';
    }

    function updateStatus(elapsed: number) {
      if (!statusElRef.current) return;
      if (prefersReducedMotion) {
        if (statusElRef.current.textContent !== 'Activo') statusElRef.current.textContent = 'Activo';
        return;
      }

      if (elapsed < 720) {
        if (statusElRef.current.textContent !== 'Iniciando') statusElRef.current.textContent = 'Iniciando';
      } else if (elapsed < 1440) {
        if (statusElRef.current.textContent !== 'Analizando') statusElRef.current.textContent = 'Analizando';
      } else if (elapsed < 2160) {
        if (statusElRef.current.textContent !== 'Sincronizando') statusElRef.current.textContent = 'Sincronizando';
      } else {
        if (statusElRef.current.textContent !== 'Activo') statusElRef.current.textContent = 'Activo';
      }
    }

    function render(now: number) {
      if (!canvas || !ctx) return;
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const elapsed = now - startTime;
      const introP = prefersReducedMotion ? 1.0 : Math.min(1.0, elapsed / BOOT_DURATION);
      if (isBooting && introP >= 1.0) {
        isBooting = false;
      }

      updateStatus(elapsed);

      // 1. Phosphor persistence trail: fill with semi-transparent background
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 7, 16, 0.32)';
      ctx.fillRect(0, 0, width, height);

      // Continuous slow disc rotation
      if (!prefersReducedMotion) {
        rotationAngle += ROTATION_SPEED * delta;
      }

      // 2. Beat Simulator: 120 BPM (period = 0.5s)
      const tSec = now / 1000;
      const beatPeriod = 0.5;
      const beatPhase = (tSec % beatPeriod) / beatPeriod;
      const halfBeatPhase = (tSec % (beatPeriod / 2)) / (beatPeriod / 2);

      // Gaussian pulses
      const kickEnvelope = Math.exp(-Math.pow((beatPhase - 0.02) / 0.075, 2));
      const kick = Math.max(0, kickEnvelope) * 1.0;

      const snareEnvelope = Math.exp(-Math.pow((beatPhase - 0.52) / 0.09, 2));
      const snare = Math.max(0, snareEnvelope) * 0.6;

      const hatEnvelope = Math.exp(-Math.pow((halfBeatPhase - 0.02) / 0.065, 2));
      const hat = Math.max(0, hatEnvelope) * 0.28;

      // 3. Ambient Background Glow breathing with kick
      const ambientAlpha = 0.20 + kick * 0.18;
      const glowRadius = R * 3.4;
      const ambGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      ambGrad.addColorStop(0, `rgba(90, 50, 200, ${ambientAlpha.toFixed(3)})`);
      ambGrad.addColorStop(0.35, `rgba(50, 30, 130, ${(ambientAlpha * 0.4).toFixed(3)})`);
      ambGrad.addColorStop(1, 'rgba(5, 7, 16, 0)');

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = ambGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Intro expanding pulse ring (t = 0 to 720ms)
      if (elapsed < 1440 && !prefersReducedMotion) {
        const ringProgress = Math.min(1.0, elapsed / 1100);
        const ringR = R * 0.20 + (R * 0.90 - R * 0.20) * ringProgress;
        const ringAlpha = Math.pow(Math.max(0, 1 - ringProgress), 2) * 0.90;

        if (ringAlpha > 0.005) {
          // Soft glow ring
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, ringR, ringR * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
          ctx.lineWidth = 4.2;
          ctx.strokeStyle = `rgba(120, 180, 255, ${(ringAlpha * 0.35).toFixed(3)})`;
          ctx.stroke();

          // Sharp core ring
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, ringR, ringR * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = `rgba(220, 240, 255, ${ringAlpha.toFixed(3)})`;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. Base Ellipse Ring + Outer Halo
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(160, 120, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, R, R * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(160, 120, 255, 0.12)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, R * 1.05, R * 1.05 * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle center marker dot pulsing with kick
      const centerMarkerR = 1.8 + kick * 0.9;
      ctx.fillStyle = `rgba(190, 150, 255, ${(0.5 + kick * 0.4).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerMarkerR, 0, Math.PI * 2);
      ctx.fill();

      // 6. Update Bar Amplitudes
      for (let i = 0; i < N; i++) {
        const pos = i / N;
        let beatBoost = 0;
        if (pos < 0.35) {
          beatBoost = kick * (1 - pos / 0.35) * 0.75;
        } else if (pos < 0.72) {
          const midP = (pos - 0.35) / (0.72 - 0.35);
          beatBoost = snare * (1 - Math.abs(midP - 0.5) * 1.8) * 0.55;
        } else {
          beatBoost = hat * (1 - pos * 0.4) * 0.42;
        }

        const lfo = Math.sin(tSec * 1.15 + i * 0.18) * 0.035;
        let targetAmp = BASE_AMPS[i] * 0.72 + beatBoost + lfo;

        // Apply intro boot staging
        if (isBooting) {
          const delay = (i / N) * 0.55;
          let localP = (introP - delay) / (1 - delay * 0.5);
          localP = Math.max(0, Math.min(1, localP));
          const eased = 1 - Math.pow(1 - localP, 3);
          targetAmp *= eased;
        }

        // Attack/release envelope
        const current = currentAmps[i];
        const isRising = targetAmp > current;
        const factor = isRising ? 0.45 : 0.10;
        currentAmps[i] += (targetAmp - current) * factor;

        // Peak hold tracker
        if (currentAmps[i] > peakAmps[i]) {
          peakAmps[i] = currentAmps[i];
        } else {
          peakAmps[i] *= 0.985;
        }

        barOrder[i] = i;
      }

      // 7. Painter's Algorithm: Sort bars by sin(theta) ascending (far to near)
      for (let i = 0; i < N; i++) {
        const theta = (i / N) * (Math.PI * 2) + rotationAngle;
        sinTable[i] = Math.sin(theta);
      }

      barOrder.sort((a, b) => sinTable[a] - sinTable[b]);

      // 8. Draw Bars in Order
      for (let idx = 0; idx < N; idx++) {
        const i = barOrder[idx];
        const theta = (i / N) * (Math.PI * 2) + rotationAngle;
        const cosVal = Math.cos(theta);
        const sinVal = sinTable[i];

        const nearness = (sinVal + 1) / 2; // 0 to 1
        const scale = 0.60 + (1.18 - 0.60) * nearness;

        const screenX = centerX + cosVal * R * scale;
        const screenY = centerY + sinVal * R * ELLIPSE_RATIO * scale;

        const amp = Math.max(0.04, currentAmps[i]);
        const barHeight = amp * R * 1.5 * scale;
        const barWidth = Math.max(0.9, 2.8 * scale);
        const depthAlpha = 0.35 + nearness * 0.65;

        const freqPos = i / N;
        const topY = screenY - barHeight;

        // Layer 1: Glow halo
        const haloWidth = barWidth * 7;
        const haloHeight = barHeight + barWidth * 2;
        const haloGrad = ctx.createLinearGradient(0, topY - barWidth * 2, 0, screenY);
        haloGrad.addColorStop(0, getFrequencyColor(freqPos, 0.32 * depthAlpha));
        haloGrad.addColorStop(0.6, getFrequencyColor(freqPos, 0.06 * depthAlpha));
        haloGrad.addColorStop(1, getFrequencyColor(freqPos, 0));

        ctx.fillStyle = haloGrad;
        ctx.fillRect(screenX - haloWidth / 2, topY - barWidth * 2, haloWidth, haloHeight);

        // Layer 2: Main Bar Body
        const bodyGrad = ctx.createLinearGradient(0, screenY, 0, topY);
        bodyGrad.addColorStop(0, getFrequencyColor(freqPos, 0.35 * depthAlpha));
        bodyGrad.addColorStop(0.65, getFrequencyColor(freqPos, 0.90 * depthAlpha));
        bodyGrad.addColorStop(1, getFrequencyColor(freqPos, 1.0 * depthAlpha));

        ctx.fillStyle = bodyGrad;
        ctx.fillRect(screenX - barWidth / 2, topY, barWidth, barHeight);

        // Layer 3: Tip Glow (Radial gradient)
        const tipRadius = barWidth * 2.6;
        const tipGrad = ctx.createRadialGradient(screenX, topY, 0, screenX, topY, tipRadius);
        tipGrad.addColorStop(0, `rgba(255, 255, 255, ${(0.90 * depthAlpha).toFixed(3)})`);
        tipGrad.addColorStop(0.25, getFrequencyColor(freqPos, 0.85 * depthAlpha));
        tipGrad.addColorStop(1, getFrequencyColor(freqPos, 0));

        ctx.fillStyle = tipGrad;
        ctx.beginPath();
        ctx.arc(screenX, topY, tipRadius, 0, Math.PI * 2);
        ctx.fill();

        // Layer 4: Chromatic aberration on loud peaks (amp > 0.65)
        if (amp > 0.65) {
          const caAlpha = Math.min(1.0, (amp - 0.65) * 2.86) * depthAlpha;
          const caRadius = barWidth * 1.5;

          // Left: Red shift
          ctx.fillStyle = `rgba(255, 40, 90, ${caAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(screenX - 1.3, topY, caRadius, 0, Math.PI * 2);
          ctx.fill();

          // Right: Blue shift
          ctx.fillStyle = `rgba(40, 140, 255, ${caAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(screenX + 1.3, topY, caRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Peak Hold Line
        const peak = peakAmps[i];
        if (peak > 0.15 && peak > amp + 0.02) {
          const peakHeight = peak * R * 1.5 * scale;
          const peakY = screenY - peakHeight;
          const peakWidth = Math.max(1.6, barWidth * 1.2);
          const peakAlpha = Math.min(1.0, (peak - 0.15) * 2.5) * depthAlpha;

          ctx.fillStyle = `rgba(255, 255, 255, ${peakAlpha.toFixed(3)})`;
          ctx.fillRect(screenX - peakWidth / 2, peakY - 0.8, peakWidth, 1.6);
        }
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  const handleScrollToSpecs = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('especificaciones');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="conic-station-root">
      {/* Fixed Background Visualizer Canvas */}
      <canvas ref={canvasRef} className="visualizer-canvas" aria-hidden="true" />

      {/* Master Screen UI Overlay */}
      <div className="viewport-container">
        {/* Zone A: Top Bar */}
        <header className="top-bar">
          <button
            type="button"
            className="brand-lockup interactive"
            onClick={onEnter}
            aria-label="Aura3D Inicio"
          >
            <span className="brand-dot" />
            <span className="brand-wordmark">Aura3D</span>
          </button>

          <div className="status-group">
            <div className="live-status">
              <span className="status-dot" />
              <span className="status-text" ref={statusElRef} id="status-indicator">
                Iniciando
              </span>
            </div>
            <span className="device-label">Estación de audio reactiva</span>
          </div>
        </header>

        {/* Zone B: Empty middle for visualizer perspective */}
        <div className="middle-zone" />

        {/* Zone C: Bottom Bar */}
        <footer className="bottom-bar">
          <div className="title-block">
            <h1 className="headline">
              El sonido<span className="break" />hecho visible.
            </h1>
            <p className="subheadline">
              Visualizador cónico, tracking de manos y word-sync con Kawarp. Un instrumento para hacer música visible en tiempo real.
            </p>

            <div className="actions-row interactive">
              <button
                type="button"
                className="btn-primary"
                id="btn-reboot"
                onClick={onEnter}
              >
                Iniciar motor
              </button>
              <a
                href="#especificaciones"
                className="link-secondary"
                onClick={handleScrollToSpecs}
              >
                Ver especificaciones
              </a>
            </div>
          </div>

          <div className="specs-group">
            <div className="spec-item">
              <span className="spec-label">Entrada</span>
              <span className="spec-value">48 kHz</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Buffer</span>
              <span className="spec-value">128</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Salida</span>
              <span className="spec-value">7.8 ms</span>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};
