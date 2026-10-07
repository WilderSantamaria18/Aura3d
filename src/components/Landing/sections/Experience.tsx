import React, { useRef, useEffect, useState } from 'react';
import { 
  Sparkles, 
  Activity, 
  Hand, 
  Zap, 
  ArrowRight
} from 'lucide-react';

export interface ExperienceProps {
  onStartExperience?: () => void;
}

// Web Audio sound synthesizer for interactive sound pads
class PadSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playKick() {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.32);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  public playSnare() {
    const ctx = this.getContext();
    const t = ctx.currentTime;

    const bufLen = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.19);
  }

  public playHiHat() {
    const ctx = this.getContext();
    const t = ctx.currentTime;

    const bufLen = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.07);
  }

  public playSynthLead(freq = 440) {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.4);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.46);
  }

  public playSub808() {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.5);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.56);
  }

  public playChime() {
    const ctx = this.getContext();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      gain.gain.setValueAtTime(0.18, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.65);
    });
  }
}

const padSynth = new PadSynthesizer();

export const Experience: React.FC<ExperienceProps> = ({ onStartExperience }) => {
  // Card 1: Liquid Visualizer Canvas
  const visCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visMode, setVisMode] = useState<'ring' | 'sphere' | 'flow'>('ring');
  const [mouseVis, setMouseVis] = useState<{ x: number; y: number; active: boolean }>({ x: 0.5, y: 0.5, active: false });

  // Card 2: Interactive Pads
  const [activePad, setActivePad] = useState<string | null>(null);
  const [padPulseCount, setPadPulseCount] = useState(0);

  // Card 3: 3D Hand Tracking Canvas
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [handState, setHandState] = useState({
    x: 0,
    y: 0,
    isPinching: false,
    pinchDist: 100,
  });

  // -------------------------------------------------------------
  // 1. Interactive Liquid Audio Visualizer Simulation
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = visCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;

    const render = () => {
      t += 0.02;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const mx = mouseVis.active ? mouseVis.x * w : cx;
      const my = mouseVis.active ? mouseVis.y * h : cy;

      const baseR = Math.min(w, h) * 0.32;
      const points = 72;

      // Glow behind
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
      grad.addColorStop(0.5, 'rgba(160, 120, 255, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (visMode === 'ring') {
        // Outer concentric ripple rings
        for (let layer = 0; layer < 3; layer++) {
          const lr = baseR * (0.65 + layer * 0.35);
          ctx.beginPath();
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const noise = Math.sin(angle * (5 + layer) + t * (2 + layer)) * (8 + layer * 4);
            
            // Mouse deflection
            const px = cx + Math.cos(angle) * (lr + noise);
            const py = cy + Math.sin(angle) * (lr + noise) * 0.65;
            const distToM = Math.hypot(px - mx, py - my);
            const push = Math.max(0, 40 - distToM * 0.4);
            const finalX = px + (px - mx) * (push / 50);
            const finalY = py + (py - my) * (push / 50);

            if (i === 0) ctx.moveTo(finalX, finalY);
            else ctx.lineTo(finalX, finalY);
          }
          ctx.closePath();
          ctx.strokeStyle = layer === 0 ? 'rgba(0, 229, 255, 0.75)' : layer === 1 ? 'rgba(160, 120, 255, 0.5)' : 'rgba(255, 45, 146, 0.3)';
          ctx.lineWidth = 1.6 - layer * 0.3;
          ctx.stroke();
        }
      } else if (visMode === 'sphere') {
        // 3D Spherical Particle Cloud
        const spherePoints = 54;
        for (let i = 0; i < spherePoints; i++) {
          const theta = (i / spherePoints) * Math.PI * 2 + t * 0.4;
          const phi = Math.sin(i * 1.5 + t * 0.7) * (Math.PI * 0.45);
          const r = baseR * (0.85 + Math.sin(t * 2 + i) * 0.1);
          
          const sx = cx + Math.cos(theta) * Math.cos(phi) * r;
          const sy = cy + Math.sin(phi) * r;
          
          const distToM = Math.hypot(sx - mx, sy - my);
          const push = Math.max(0, 36 - distToM * 0.35);
          const finalX = sx + (sx - mx) * (push / 40);
          const finalY = sy + (sy - my) * (push / 40);

          ctx.beginPath();
          ctx.arc(finalX, finalY, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(160, 120, 255, 0.85)';
          ctx.fill();
        }
      } else {
        // Flowing Quantum Streams
        for (let line = 0; line < 5; line++) {
          ctx.beginPath();
          const lineY = cy - 40 + line * 20;
          for (let x = 0; x <= w; x += 6) {
            const normX = x / w;
            const wave = Math.sin(normX * 8 + t * 3 + line * 0.7) * (14 + line * 3);
            const distToM = Math.hypot(x - mx, lineY - my);
            const push = Math.max(0, 35 - distToM * 0.4);
            const y = lineY + wave + (lineY > my ? push : -push);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `hsla(${180 + line * 30}, 90%, 65%, ${0.7 - line * 0.1})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // Center Core
      ctx.beginPath();
      ctx.arc(cx, cy, 5 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mouseVis, visMode]);

  // -------------------------------------------------------------
  // 3. 3D Hand Skeleton Wireframe & Interactive Pinch Simulator
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = handCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;

    const render = () => {
      t += 0.025;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);

      // Grid backdrop
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let x = 16; x < w; x += 24) {
        for (let y = 16; y < h; y += 24) {
          ctx.fillRect(x, y, 1.2, 1.2);
        }
      }

      const cx = w * 0.5 + (handState.x * 24);
      const cy = h * 0.58 + (handState.y * 18);
      const s = w * 0.42;

      const pinchPull = handState.isPinching ? 1.0 : 0.0;
      const breath = Math.sin(t * 1.8) * 0.04;

      // Finger Landmarks (21 points)
      const landmarks: [number, number, number][] = [
        // Wrist
        [0, 0.48, 0],
        // Thumb
        [-0.14, 0.36, -0.05],
        [-0.24, 0.22, -0.08],
        [-0.28, 0.06, -0.1],
        [-0.26 + pinchPull * 0.18, -0.12 + pinchPull * 0.16, -0.08],
        // Index
        [-0.10, 0.04, -0.03],
        [-0.12, -0.16, -0.04],
        [-0.12, -0.32, -0.05],
        [-0.11 - pinchPull * 0.06, -0.44 + pinchPull * 0.24, -0.04],
        // Middle
        [0.02, 0.02, 0],
        [0.02, -0.18, 0],
        [0.02, -0.36, 0],
        [0.02, -0.50 + breath, 0],
        // Ring
        [0.14, 0.06, 0.03],
        [0.15, -0.14, 0.03],
        [0.16, -0.30, 0.03],
        [0.16, -0.42, 0.03],
        // Pinky
        [0.24, 0.14, 0.06],
        [0.26, -0.04, 0.06],
        [0.28, -0.18, 0.06],
        [0.29, -0.30, 0.06],
      ];

      const bones = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17]
      ];

      // Bone connections
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = handState.isPinching ? 'rgba(0, 229, 255, 0.85)' : 'rgba(160, 120, 255, 0.45)';

      bones.forEach(([a, b]) => {
        const ptA = landmarks[a];
        const ptB = landmarks[b];
        ctx.beginPath();
        ctx.moveTo(cx + ptA[0] * s, cy + ptA[1] * s);
        ctx.lineTo(cx + ptB[0] * s, cy + ptB[1] * s);
        ctx.stroke();
      });

      // Pinch aura pulse
      if (handState.isPinching) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinchX = cx + ((thumbTip[0] + indexTip[0]) / 2) * s;
        const pinchY = cy + ((thumbTip[1] + indexTip[1]) / 2) * s;

        const pulseR = 14 + Math.sin(t * 12) * 6;
        ctx.beginPath();
        ctx.arc(pinchX, pinchY, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pinchX, pinchY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      // Landmarks dots
      landmarks.forEach(([lx, ly], idx) => {
        const px = cx + lx * s;
        const py = cy + ly * s;
        const isTip = [4, 8, 12, 16, 20].includes(idx);

        ctx.beginPath();
        ctx.arc(px, py, isTip ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? (handState.isPinching ? '#00e5ff' : '#ff2d92') : 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [handState]);

  // Handlers for tactile pads
  const handleTriggerPad = (id: string, sound: () => void) => {
    sound();
    setActivePad(id);
    setPadPulseCount((c) => c + 1);
    setTimeout(() => {
      setActivePad((curr) => (curr === id ? null : curr));
    }, 200);
  };

  return (
    <section className="relative w-full py-24 px-6 md:px-12 overflow-hidden" id="laboratorio-interactivo">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[480px] bg-gradient-to-r from-cyan-500/10 via-purple-600/10 to-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-[1240px] mx-auto flex flex-col gap-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.08] pb-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-mono uppercase tracking-[0.14em] text-cyan-400 w-fit backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Laboratorio de Pruebas 3D</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Experimenta el Sonido <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">en Vivo</span>
            </h2>
            <p className="text-white/60 text-sm sm:text-base max-w-[58ch]">
              Toca los instrumentos táctiles, desvía la refracción líquida con tu cursor y prueba el motor de captura espacial sin instalar nada.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-white/70">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Web Audio API: 0 ms</span>
            </div>
            {onStartExperience && (
              <button
                type="button"
                onClick={onStartExperience}
                className="px-4 py-2 rounded-xl bg-white text-black font-medium text-xs sm:text-sm hover:bg-cyan-300 transition-all flex items-center gap-2 shadow-[0_0_24px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
              >
                <span>Entrar al Estudio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Interactive Liquid Glass Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* CARD 1: Refracción Líquida & Deflector */}
          <div className="relative rounded-3xl bg-white/[0.03] border border-white/[0.1] hover:border-cyan-400/40 backdrop-blur-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden group transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-100 transition-opacity">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                  Shader 01
                </span>
                <span className="text-xs text-white/40 font-mono">160 Rayos</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-1">Refracción Líquida</h3>
              <p className="text-xs text-white/60 mb-3">Pasa el cursor por el lienzo para desviar la física de las ondas.</p>

              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-1.5 mb-3">
                {(['ring', 'sphere', 'flow'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setVisMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
                      visMode === m
                        ? 'bg-cyan-400 text-black font-semibold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                        : 'bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.1]'
                    }`}
                  >
                    {m === 'ring' ? 'Aro Cónico' : m === 'sphere' ? 'Esfera 3D' : 'Flujo Cuántico'}
                  </button>
                ))}
              </div>

              {/* Interactive Canvas */}
              <div 
                className="relative aspect-square w-full rounded-2xl bg-black/40 border border-white/[0.08] overflow-hidden flex items-center justify-center cursor-crosshair group/canvas"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMouseVis({
                    x: (e.clientX - rect.left) / rect.width,
                    y: (e.clientY - rect.top) / rect.height,
                    active: true,
                  });
                }}
                onMouseLeave={() => setMouseVis((m) => ({ ...m, active: false }))}
              >
                <canvas ref={visCanvasRef} className="w-full h-full block" />
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 pointer-events-none">
                  Deflexión: {mouseVis.active ? `${(mouseVis.x * 100).toFixed(0)}%` : 'Inactivo'}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
              <span>Geometría Dinámica</span>
              <span className="text-cyan-400 font-mono">60 FPS • WebGL 2.0</span>
            </div>
          </div>

          {/* CARD 2: Sintetizador Táctil Auralis (Web Audio) */}
          <div className="relative rounded-3xl bg-white/[0.03] border border-white/[0.1] hover:border-violet-400/40 backdrop-blur-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden group transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-100 transition-opacity">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400/80 bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20">
                  Audio Engine
                </span>
                <span className="text-xs text-white/40 font-mono">Pads: {padPulseCount}</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-1">Sintetizador Auralis Touch</h3>
              <p className="text-xs text-white/60 mb-5">Haz clic en los pads para disparar sintetizadores con latencia cero.</p>

              {/* 6 Tactile Sound Pads */}
              <div className="grid grid-cols-3 gap-2.5 aspect-square w-full">
                {[
                  { id: 'kick', label: '808 Sub', color: 'from-cyan-500/20 to-cyan-500/5', border: 'hover:border-cyan-400', sound: () => padSynth.playKick() },
                  { id: 'snare', label: 'Snare', color: 'from-violet-500/20 to-violet-500/5', border: 'hover:border-violet-400', sound: () => padSynth.playSnare() },
                  { id: 'hihat', label: 'Hi-Hat', color: 'from-pink-500/20 to-pink-500/5', border: 'hover:border-pink-400', sound: () => padSynth.playHiHat() },
                  { id: 'lead1', label: 'Lead C4', color: 'from-amber-500/20 to-amber-500/5', border: 'hover:border-amber-400', sound: () => padSynth.playSynthLead(261.63) },
                  { id: 'lead2', label: 'Lead G4', color: 'from-emerald-500/20 to-emerald-500/5', border: 'hover:border-emerald-400', sound: () => padSynth.playSynthLead(392.00) },
                  { id: 'chime', label: 'Arpegio', color: 'from-purple-500/20 to-purple-500/5', border: 'hover:border-purple-400', sound: () => padSynth.playChime() },
                ].map((pad) => {
                  const isActive = activePad === pad.id;
                  return (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => handleTriggerPad(pad.id, pad.sound)}
                      className={`relative rounded-2xl bg-gradient-to-br ${pad.color} border ${
                        isActive ? 'border-white bg-white/20 scale-95 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : `border-white/10 ${pad.border} hover:scale-[1.03]`
                      } transition-all duration-150 flex flex-col items-center justify-center p-3 select-none active:scale-95 group/btn`}
                    >
                      <span className="text-[11px] font-mono text-white/90 font-medium">{pad.label}</span>
                      <span className="text-[9px] text-white/40 mt-1 uppercase font-mono tracking-wider">Disparar</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
              <span>Osciladores Nativos</span>
              <span className="text-violet-400 font-mono">48 kHz • Sin Descarga</span>
            </div>
          </div>

          {/* CARD 3: Tracking de Manos Espacial & Air Synth */}
          <div className="relative rounded-3xl bg-white/[0.03] border border-white/[0.1] hover:border-pink-400/40 backdrop-blur-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden group transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-100 transition-opacity">
              <Hand className="w-5 h-5 text-pink-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-pink-400/80 bg-pink-400/10 px-2 py-0.5 rounded-full border border-pink-400/20">
                  MediaPipe ML
                </span>
                <span className="text-xs text-white/40 font-mono">21 Nodos 3D</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-1">Air Control Holográfico</h3>
              <p className="text-xs text-white/60 mb-5">Haz clic o mantén presionado en el recuadro para pellizcar (pinch gesture).</p>

              {/* Interactive Hand Canvas */}
              <div 
                className="relative aspect-square w-full rounded-2xl bg-black/40 border border-white/[0.08] overflow-hidden flex items-center justify-center cursor-pointer select-none group/hand"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const normX = (e.clientX - rect.left) / rect.width - 0.5;
                  const normY = (e.clientY - rect.top) / rect.height - 0.5;
                  setHandState((s) => ({ ...s, x: normX, y: normY }));
                }}
                onMouseDown={() => {
                  setHandState((s) => ({ ...s, isPinching: true }));
                  padSynth.playChime();
                }}
                onMouseUp={() => setHandState((s) => ({ ...s, isPinching: false }))}
                onMouseLeave={() => setHandState((s) => ({ ...s, isPinching: false, x: 0, y: 0 }))}
              >
                <canvas ref={handCanvasRef} className="w-full h-full block" />
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-pink-300 pointer-events-none">
                  {handState.isPinching ? '⚡ PINCH DETECTADO' : '🖐 SEGUIMIENTO ACTIVO'}
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-white/40 pointer-events-none">
                  X: {handState.x.toFixed(2)} | Y: {handState.y.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
              <span>IA en Navegador</span>
              <span className="text-pink-400 font-mono">Confianza: 99.4%</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Experience;
