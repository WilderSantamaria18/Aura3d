import React, { useRef, useEffect, useState } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';

interface RGBLight {
  x: number;
  y: number;
  hue: number;
  hueSpeed: number;
  angle: number;
  length: number;
  width: number;
}

// ─── Studio 3D Visualizer (Canvas 2D with perspective projection) ─────────────
export const PartyVisualizer: React.FC = () => {
  const { isPlaying, isMicActive, isLucid, lucidTheme } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.15);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rgbIntensity, setRgbIntensity] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [speakerSize, setSpeakerSize] = useState(1.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // ── Perspective helpers ────────────────────────────────────────────────
    const VP = { x: W / 2, y: H * 0.38 }; // vanishing point
    const HORIZON = H * 0.38;
    const FLOOR_Y = H;

    const project = (worldX: number, worldZ: number) => {
      const scale = HORIZON / (HORIZON + worldZ * 0.6);
      return {
        sx: VP.x + worldX * scale,
        sy: VP.y + worldZ * 0.5 * scale,
        scale,
      };
    };

    // ── Ceiling RGB strip lights ───────────────────────────────────────────
    const rgbLights: RGBLight[] = [];
    for (let i = 0; i < 6; i++) {
      rgbLights.push({
        x: (i - 2.5) * 140,
        y: 0,
        hue: (i / 6) * 360,
        hueSpeed: 0.4 + Math.random() * 0.4,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.4,
        length: 380 + Math.random() * 120,
        width: 6 + Math.random() * 8,
      });
    }

    // ── Speaker woofer ring animation ─────────────────────────────────────
    let wooferPhase = 0;
    let globalHue = 180;
    let time = 0;

    // ── Draw perspective grid floor ────────────────────────────────────────
    const drawFloor = (bass: number) => {
      const gridLines = 16;
      const gridDepth = H * 1.1;
      const gridWidth = W * 1.3;

      for (let i = 0; i <= gridLines; i++) {
        const t = i / gridLines;
        const worldZ = t * 80;
        const p1 = project(-gridWidth / 2, worldZ);
        const p2 = project(gridWidth / 2, worldZ);

        const glowHue = (globalHue + i * 15) % 360;
        const alpha = 0.08 + bass * 0.18 * rgbIntensity;
        ctx.strokeStyle = `hsla(${glowHue}, 100%, 60%, ${alpha})`;
        ctx.lineWidth = 1 + bass * 2;
        ctx.shadowColor = `hsl(${glowHue}, 100%, 50%)`;
        ctx.shadowBlur = 6 + bass * 10;

        ctx.beginPath();
        ctx.moveTo(p1.sx, FLOOR_Y - gridDepth * (1 - t));
        ctx.lineTo(p2.sx, FLOOR_Y - gridDepth * (1 - t));
        ctx.stroke();
      }

      // Vertical floor lines (depth lines)
      const vertLines = 20;
      for (let i = 0; i <= vertLines; i++) {
        const t = i / vertLines;
        const worldX = (t - 0.5) * gridWidth;
        const pNear = project(worldX, 80);
        const pFar = { sx: VP.x + worldX * 0.01, sy: HORIZON };

        const glowHue = (globalHue + i * 18) % 360;
        const alpha = 0.06 + bass * 0.12 * rgbIntensity;
        ctx.strokeStyle = `hsla(${glowHue}, 100%, 60%, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(pFar.sx, pFar.sy);
        ctx.lineTo(pNear.sx, FLOOR_Y - 10);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    };

    // ── Draw ceiling RGB light beams ───────────────────────────────────────
    const drawRGBLights = (highs: number, energy: number) => {
      rgbLights.forEach((light, idx) => {
        light.hue = (light.hue + light.hueSpeed * (1 + highs * 2)) % 360;
        const beamColor = isLucid
          ? idx % 2 === 0
            ? lucidTheme.primary
            : lucidTheme.secondary
          : undefined;

        // Ceiling position (project from world space)
        const ceilX = W / 2 + light.x * (1 - Math.sin(time * 0.08 + idx) * 0.12);
        const ceilY = H * 0.06 + idx * 2;

        const beamLen = light.length * (1 + energy * 0.6 * rgbIntensity);
        const sweep = Math.sin(time * 0.25 + idx * 1.1) * 0.55;
        const endX = ceilX + Math.sin(sweep) * beamLen;
        const endY = ceilY + Math.cos(sweep) * beamLen;

        const grad = ctx.createLinearGradient(ceilX, ceilY, endX, endY);
        if (isLucid && beamColor) {
          grad.addColorStop(0, beamColor);
          grad.addColorStop(0.6, `${beamColor}55`);
          grad.addColorStop(1, 'transparent');
        } else {
          grad.addColorStop(0, `hsla(${light.hue}, 100%, 75%, ${0.55 + energy * 0.4 * rgbIntensity})`);
          grad.addColorStop(0.6, `hsla(${(light.hue + 40) % 360}, 100%, 60%, ${0.18 * rgbIntensity})`);
          grad.addColorStop(1, 'transparent');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = light.width * (1 + energy * 0.5);
        ctx.shadowColor = isLucid && beamColor ? beamColor : `hsl(${light.hue}, 100%, 65%)`;
        ctx.shadowBlur = 18 + energy * 24;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(ceilX, ceilY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Light source bulb on ceiling
        const bulbGrad = ctx.createRadialGradient(ceilX, ceilY, 0, ceilX, ceilY, 18 + energy * 12);
        bulbGrad.addColorStop(0, `hsla(${light.hue}, 100%, 95%, 0.95)`);
        bulbGrad.addColorStop(0.4, `hsla(${light.hue}, 100%, 70%, 0.5)`);
        bulbGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = bulbGrad;
        ctx.beginPath();
        ctx.arc(ceilX, ceilY, 18 + energy * 12, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
    };

    // ── Draw studio monitor speaker ────────────────────────────────────────
    const drawSpeaker = (
      cx: number,
      cy: number,
      size: number,
      bass: number,
      mids: number,
      accentHue: number,
      flipped: boolean
    ) => {
      const R = size;
      const woofer = R * 0.38;
      const excursion = bass * R * 0.09 * rgbIntensity;
      const ledHue = (accentHue + time * 40) % 360;

      // ── Cabinet body ──────────────────────────────────────────────────
      const cabinetW = R * 1.65;
      const cabinetH = R * 2.1;
      const cx0 = cx - cabinetW / 2;
      const cy0 = cy - cabinetH / 2;
      const cornerR = 12;

      // Cabinet shadow
      ctx.shadowColor = `hsla(${ledHue}, 80%, 20%, 0.8)`;
      ctx.shadowBlur = 24 + bass * 20;

      // Cabinet fill
      const cabGrad = ctx.createLinearGradient(cx0, cy0, cx0 + cabinetW, cy0 + cabinetH);
      cabGrad.addColorStop(0, '#1a1d28');
      cabGrad.addColorStop(0.45, '#0f1018');
      cabGrad.addColorStop(1, '#080910');

      ctx.fillStyle = cabGrad;
      ctx.beginPath();
      ctx.roundRect(cx0, cy0, cabinetW, cabinetH, cornerR);
      ctx.fill();

      // Cabinet edge highlight
      ctx.strokeStyle = `rgba(255,255,255,0.08)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // RGB accent strip along the inner edge
      const stripGrad = ctx.createLinearGradient(
        flipped ? cx0 + cabinetW : cx0, cy0,
        flipped ? cx0 + cabinetW : cx0, cy0 + cabinetH
      );
      stripGrad.addColorStop(0, `hsla(${ledHue}, 100%, 65%, 0.9)`);
      stripGrad.addColorStop(0.5, `hsla(${(ledHue + 120) % 360}, 100%, 65%, 0.9)`);
      stripGrad.addColorStop(1, `hsla(${(ledHue + 240) % 360}, 100%, 65%, 0.9)`);

      const stripX = flipped ? cx0 + cabinetW - 4 : cx0;
      ctx.fillStyle = stripGrad;
      ctx.shadowColor = `hsl(${ledHue}, 100%, 60%)`;
      ctx.shadowBlur = 12 + bass * 14;
      ctx.fillRect(stripX, cy0 + cornerR, 4, cabinetH - cornerR * 2);

      ctx.shadowBlur = 0;

      // ── Tweeter (top) ───────────────────────────────────────────────────
      const tweeterY = cy0 + cabinetH * 0.22;
      const tweeterR = R * 0.11;

      const tweetGrad = ctx.createRadialGradient(cx, tweeterY, 0, cx, tweeterY, tweeterR);
      tweetGrad.addColorStop(0, '#e8f4ff');
      tweetGrad.addColorStop(0.4, '#b0d4f4');
      tweetGrad.addColorStop(1, '#2a3040');
      ctx.fillStyle = tweetGrad;
      ctx.beginPath();
      ctx.arc(cx, tweeterY, tweeterR, 0, Math.PI * 2);
      ctx.fill();

      // Tweeter dome shimmer
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, tweeterY, tweeterR * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // ── Woofer cone ───────────────────────────────────────────────────
      const wooferY = cy0 + cabinetH * 0.62;

      // Woofer surround ring
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, wooferY, woofer + excursion + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric cone rings (3D depth illusion)
      for (let r = 0; r < 5; r++) {
        const rr = (woofer + excursion) * (1 - r * 0.16);
        const dark = r / 4;
        ctx.strokeStyle = `rgba(${20 + dark * 30}, ${22 + dark * 30}, ${35 + dark * 30}, 0.9)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, wooferY, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Woofer center cap
      const capGrad = ctx.createRadialGradient(cx, wooferY - excursion * 0.5, 0, cx, wooferY, woofer * 0.28);
      capGrad.addColorStop(0, '#3a3d52');
      capGrad.addColorStop(1, '#1a1c26');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.arc(cx, wooferY - excursion * 0.3, woofer * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Woofer RGB glow ring on heavy bass
      if (bass > 0.25) {
        ctx.shadowColor = `hsl(${ledHue}, 100%, 65%)`;
        ctx.shadowBlur = 16 + bass * 28;
        ctx.strokeStyle = `hsla(${ledHue}, 100%, 70%, ${bass * 0.85 * rgbIntensity})`;
        ctx.lineWidth = 3 + bass * 5;
        ctx.beginPath();
        ctx.arc(cx, wooferY, woofer + excursion, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── Front bass port ────────────────────────────────────────────────
      const portW = R * 0.65;
      const portH = R * 0.085;
      const portY = cy0 + cabinetH * 0.88;
      const portGrad = ctx.createLinearGradient(cx - portW / 2, portY, cx + portW / 2, portY);
      portGrad.addColorStop(0, '#050609');
      portGrad.addColorStop(0.5, '#0a0c14');
      portGrad.addColorStop(1, '#050609');

      ctx.fillStyle = portGrad;
      ctx.beginPath();
      ctx.roundRect(cx - portW / 2, portY, portW, portH, portH / 2);
      ctx.fill();

      // Port RGB glow
      ctx.shadowColor = `hsl(${(ledHue + 60) % 360}, 100%, 65%)`;
      ctx.shadowBlur = 8 + bass * 12;
      ctx.strokeStyle = `hsla(${(ledHue + 60) % 360}, 100%, 65%, ${0.4 + bass * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - portW / 2, portY, portW, portH, portH / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Brand LED indicator ─────────────────────────────────────────────
      ctx.shadowColor = `hsl(${ledHue}, 100%, 60%)`;
      ctx.shadowBlur = 8 + mids * 10;
      ctx.fillStyle = `hsl(${ledHue}, 100%, 65%)`;
      ctx.beginPath();
      ctx.arc(
        flipped ? cx0 + cabinetW - 18 : cx0 + 18,
        cy0 + 14,
        4,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // ── Draw central holographic FFT spectrum ──────────────────────────────
    const drawHoloFFT = (raw: Uint8Array, energy: number, mids: number) => {
      const barCount = 64;
      const step = Math.floor(raw.length / barCount) || 1;
      const totalW = W * 0.42;
      const barW = totalW / barCount;
      const cx = W / 2;
      const baseY = HORIZON + (FLOOR_Y - HORIZON) * 0.28;
      const maxH = (FLOOR_Y - HORIZON) * 0.62;

      // Holographic panel backdrop
      const panelGrad = ctx.createLinearGradient(cx - totalW / 2, baseY - maxH, cx + totalW / 2, baseY);
      panelGrad.addColorStop(0, `rgba(0,242,254, 0.03)`);
      panelGrad.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = panelGrad;
      ctx.fillRect(cx - totalW / 2 - 10, baseY - maxH - 10, totalW + 20, maxH + 20);

      // Subtle panel border
      ctx.strokeStyle = `rgba(0,242,254, ${0.06 + energy * 0.08})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - totalW / 2 - 10, baseY - maxH - 10, totalW + 20, maxH + 20);

      for (let i = 0; i < barCount; i++) {
        const rawVal = raw[i * step] / 255;
        const idleWave = (Math.sin(i * 0.22 + time * 2.2) + 1) * 0.06 + Math.cos(i * 0.14 - time * 1.8) * 0.03;
        const val = Math.max(idleWave, rawVal);
        const bh = Math.max(3, val * maxH);
        const bx = cx - totalW / 2 + i * barW + barW * 0.12;
        const bw = barW * 0.76;

        // Bar gradient by frequency band
        const barHue = isLucid
          ? parseFloat(lucidTheme.primary.replace('#', '').substring(0, 2)) % 360
          : (globalHue + (i / barCount) * 140) % 360;

        const barGrad = ctx.createLinearGradient(bx, baseY, bx, baseY - bh);
        barGrad.addColorStop(0, `hsla(${barHue}, 100%, 55%, 0.9)`);
        barGrad.addColorStop(0.5, `hsla(${(barHue + 30) % 360}, 100%, 70%, 0.7)`);
        barGrad.addColorStop(1, `hsla(${(barHue + 60) % 360}, 100%, 85%, ${0.3 + val * 0.4})`);

        ctx.shadowColor = `hsl(${barHue}, 100%, 65%)`;
        ctx.shadowBlur = 6 + val * 14;
        ctx.fillStyle = barGrad;
        ctx.fillRect(bx, baseY - bh, bw, bh);

        // Reflection below baseline
        const refGrad = ctx.createLinearGradient(bx, baseY, bx, baseY + bh * 0.35);
        refGrad.addColorStop(0, `hsla(${barHue}, 100%, 60%, 0.22)`);
        refGrad.addColorStop(1, 'transparent');
        ctx.shadowBlur = 0;
        ctx.fillStyle = refGrad;
        ctx.fillRect(bx, baseY, bw, bh * 0.35);
      }

      ctx.shadowBlur = 0;

      // Baseline glow line
      ctx.shadowColor = `hsl(${globalHue}, 100%, 60%)`;
      ctx.shadowBlur = 12 + mids * 18;
      ctx.strokeStyle = `hsla(${globalHue}, 100%, 65%, ${0.5 + energy * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - totalW / 2 - 10, baseY);
      ctx.lineTo(cx + totalW / 2 + 10, baseY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // ── Ceiling RGB strip along the back wall ─────────────────────────────
    const drawCeilingStrip = (energy: number) => {
      const stripY = HORIZON - 8;
      const segments = 24;
      const segW = W / segments;

      for (let i = 0; i < segments; i++) {
        const segHue = (globalHue + (i / segments) * 360 + time * 60) % 360;
        const alpha = 0.3 + energy * 0.5 * rgbIntensity;
        ctx.shadowColor = `hsl(${segHue}, 100%, 60%)`;
        ctx.shadowBlur = 10 + energy * 16;
        ctx.fillStyle = `hsla(${segHue}, 100%, 60%, ${alpha})`;
        ctx.fillRect(i * segW, stripY, segW * 0.85, 3);
      }
      ctx.shadowBlur = 0;
    };

    // ── Ambient room glow ─────────────────────────────────────────────────
    const drawAmbientGlow = (bass: number) => {
      // Corner mood lights
      const corners = [
        { x: 0, y: HORIZON },
        { x: W, y: HORIZON },
        { x: 0, y: H },
        { x: W, y: H },
      ];
      corners.forEach((c, idx) => {
        const h = (globalHue + idx * 90) % 360;
        const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 250 + bass * 120);
        glow.addColorStop(0, `hsla(${h}, 100%, 50%, ${0.08 + bass * 0.12 * rgbIntensity})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      });
    };

    // ── Main render loop ──────────────────────────────────────────────────
    const render = () => {
      const { bass, mids, highs, energy, raw } = getSmoothedData();
      const isAudioActive = energy > 0.005 || isPlaying || isMicActive;

      time += 0.016;
      wooferPhase += 0.05 + bass * 0.2;
      globalHue = (globalHue + 0.5 + mids * 1.8) % 360;

      // ── Clear with dark room background ──────────────────────────────
      ctx.fillStyle = '#040509';
      ctx.fillRect(0, 0, W, H);

      // Subtle vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // ── Scene layers ──────────────────────────────────────────────────
      drawAmbientGlow(bass);
      drawCeilingStrip(energy);
      drawFloor(bass);
      drawRGBLights(highs, energy);

      // Speakers — left and right, sized and mirrored
      const spkBase = Math.min(W, H) * 0.22 * speakerSize;
      const spkY = HORIZON + (H - HORIZON) * 0.42;
      const spkLX = W * 0.16;
      const spkRX = W * 0.84;
      const spkHue = (globalHue + 60) % 360;

      drawSpeaker(spkLX, spkY, spkBase, bass, mids, spkHue, false);
      drawSpeaker(spkRX, spkY, spkBase, bass, mids, (spkHue + 180) % 360, true);

      // Central holographic FFT display
      drawHoloFFT(raw, energy, mids);

      // Idle state — cyberpunk system status line (no emojis)
      if (!isAudioActive) {
        const idleAlpha = 0.12 + Math.sin(time * 2.2) * 0.07; // subtle pulse
        ctx.font = '500 11px "JetBrains Mono", "Fira Code", "Courier New", monospace';
        ctx.letterSpacing = '0.25em';
        ctx.fillStyle = `rgba(0, 230, 255, ${idleAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('[ SYS: IDLE ]  AWAITING AUDIO INPUT  [ SYS: IDLE ]', W / 2, H * 0.94);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [getSmoothedData, isPlaying, isMicActive, isLucid, lucidTheme, rgbIntensity, speakerSize]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#040509]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Studio Controls */}
      <div className="fixed top-20 right-6 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`px-4 py-2 rounded-none border text-[10px] font-mono tracking-[0.2em] uppercase transition-all flex items-center gap-2.5 ${
            showSettings
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-400/50 shadow-[0_0_16px_rgba(0,242,254,0.3)]'
              : 'bg-black/70 text-white/40 border-white/10 hover:text-cyan-300 hover:border-cyan-400/30'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          STUDIO CONFIG
        </button>

        {showSettings && (
          <div className="bg-[#05070f]/98 backdrop-blur-2xl border border-cyan-400/20 rounded-none p-4 w-60 shadow-[0_0_40px_rgba(0,0,0,0.8)] space-y-4">
            {/* Panel header */}
            <div className="flex items-center gap-2 border-b border-cyan-400/15 pb-2.5">
              <span className="w-1.5 h-4 bg-cyan-400" />
              <span className="text-[9px] font-mono tracking-[0.3em] text-cyan-400/80 uppercase">
                SYSTEM / DISPLAY
              </span>
            </div>

            {/* RGB Intensity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase">
                  RGB INTENSITY
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {(rgbIntensity * 100).toFixed(0)}
                  <span className="text-white/30">%</span>
                </span>
              </div>
              <div className="relative h-[3px] bg-white/8 w-full">
                <div
                  className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_6px_rgba(0,242,254,0.7)]"
                  style={{ width: `${((rgbIntensity - 0.2) / 1.8) * 100}%` }}
                />
                <input
                  type="range"
                  min="0.2"
                  max="2"
                  step="0.05"
                  value={rgbIntensity}
                  onChange={(e) => setRgbIntensity(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-4 -top-2"
                />
              </div>
            </div>

            {/* Monitor Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase">
                  MONITOR SIZE
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {(speakerSize * 100).toFixed(0)}
                  <span className="text-white/30">%</span>
                </span>
              </div>
              <div className="relative h-[3px] bg-white/8 w-full">
                <div
                  className="absolute top-0 left-0 h-full bg-pink-400 shadow-[0_0_6px_rgba(255,8,138,0.7)]"
                  style={{ width: `${((speakerSize - 0.5) / 1.1) * 100}%` }}
                />
                <input
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.05"
                  value={speakerSize}
                  onChange={(e) => setSpeakerSize(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-4 -top-2"
                />
              </div>
            </div>

            {/* Status readout */}
            <div className="border-t border-white/8 pt-2.5 flex items-center justify-between">
              <span className="text-[8px] font-mono tracking-widest text-white/25 uppercase">
                RENDERER
              </span>
              <span className="text-[8px] font-mono text-cyan-400/60 tracking-wider">
                CANVAS 2D / ACTIVE
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyVisualizer;
