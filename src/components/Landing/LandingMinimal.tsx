import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import './sections/ConicStation.css';

export const LandingMinimal: React.FC = () => {
  const setHasStarted = usePlayerStore((s) => s.setHasStarted);
  const setIsTransitioning = usePlayerStore((s) => s.setIsTransitioning);
  const { unlockAudio } = useAudioEngine();
  const [isTransitioning, setIsTransitioningLocal] = useState(false);

  const handleEnter = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioningLocal(true);
    setIsTransitioning(true);
    unlockAudio();
    setTimeout(() => {
      setHasStarted(true);
      setIsTransitioning(false);
    }, 800);
  }, [isTransitioning, setIsTransitioning, unlockAudio, setHasStarted]);

  // Support Enter key shortcut to launch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter]);

  // Canvas Refs
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const idleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const signalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniConeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const footerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // DOM Refs
  const scrollThumbRef = useRef<HTMLDivElement | null>(null);
  const scrollRailRef = useRef<HTMLElement | null>(null);
  const statusElRef = useRef<HTMLSpanElement | null>(null);
  const signalParentRef = useRef<HTMLDivElement | null>(null);
  const stepItemsRef = useRef<NodeListOf<HTMLElement> | null>(null);
  const latencyCounterRef = useRef<HTMLSpanElement | null>(null);
  const tiltBoxRef = useRef<HTMLDivElement | null>(null);
  const kawarpProgressFillRef = useRef<HTMLDivElement | null>(null);
  const bpmPhaseReadoutRef = useRef<HTMLSpanElement | null>(null);
  const specsGridRef = useRef<HTMLDivElement | null>(null);
  const latencySectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ==========================================
    // 1. SHARED GLOBAL BEAT SIMULATOR (120 BPM)
    // ==========================================
    const BeatSim = {
      bpm: 120,
      period: 0.5, // seconds per beat at 120 BPM
      kick: 0,
      snare: 0,
      hat: 0,
      beatPhase: 0,
      measurePhase: 0,
      update(nowSec: number) {
        this.beatPhase = (nowSec % this.period) / this.period;
        const halfPhase = (nowSec % (this.period / 2)) / (this.period / 2);
        this.measurePhase = (nowSec % (this.period * 4)) / (this.period * 4);

        // Fast attack, natural decay
        this.kick = Math.exp(-Math.pow((this.beatPhase - 0.02) / 0.075, 2));
        this.snare = Math.exp(-Math.pow((this.beatPhase - 0.52) / 0.09, 2)) * 0.65;
        this.hat = Math.exp(-Math.pow((halfPhase - 0.02) / 0.065, 2)) * 0.35;
      }
    };

    // Pre-allocate frequency color gradient function
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

    // ==========================================
    // SECTION 1: HERO CONICAL VISUALIZER
    // ==========================================
    const heroCanvas = heroCanvasRef.current;
    const heroCtx = heroCanvas?.getContext('2d');
    const N = 160;
    const ELLIPSE_RATIO = 0.40;
    const ROTATION_SPEED = 0.09;
    const BOOT_DURATION = 2400;

    const BASE_AMPS = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const bass = Math.exp(-t * 8.5) * 0.48;
      const body = Math.sin(t * Math.PI) * 0.16;
      const presence = Math.exp(-Math.pow((t - 0.65) / 0.18, 2)) * 0.22;
      BASE_AMPS[i] = 0.08 + bass + body + presence;
    }

    const currentAmps = new Float32Array(N);
    const peakAmps = new Float32Array(N);
    const barOrder = new Uint16Array(N);
    const sinTable = new Float32Array(N);

    let heroWidth = window.innerWidth;
    let heroHeight = window.innerHeight;
    let heroR = 180;
    let heroCenterX = heroWidth / 2;
    let heroCenterY = heroHeight * 0.46;
    let rotationAngle = 0;
    let bootStartTime = performance.now();
    let isHeroBooting = !prefersReducedMotion;

    function resizeHero() {
      if (!heroCanvas || !heroCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = heroCanvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      heroWidth = rect.width;
      heroHeight = rect.height;
      heroCanvas.width = Math.floor(heroWidth * dpr);
      heroCanvas.height = Math.floor(heroHeight * dpr);
      heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isMobile = heroWidth < 768;
      heroR = isMobile ? heroWidth * 0.35 : Math.min(heroWidth, heroHeight) * 0.24;
      heroCenterX = heroWidth / 2;
      heroCenterY = heroHeight * 0.46;

      heroCtx.fillStyle = '#050710';
      heroCtx.fillRect(0, 0, heroWidth, heroHeight);
    }

    function updateHeroStatus(elapsed: number) {
      const statusEl = statusElRef.current;
      if (!statusEl) return;
      if (prefersReducedMotion) {
        if (statusEl.textContent !== 'Activo') statusEl.textContent = 'Activo';
        return;
      }
      if (elapsed < 720) {
        if (statusEl.textContent !== 'Iniciando') statusEl.textContent = 'Iniciando';
      } else if (elapsed < 1440) {
        if (statusEl.textContent !== 'Analizando') statusEl.textContent = 'Analizando';
      } else if (elapsed < 2160) {
        if (statusEl.textContent !== 'Sincronizando') statusEl.textContent = 'Sincronizando';
      } else {
        if (statusEl.textContent !== 'Activo') statusEl.textContent = 'Activo';
      }
    }

    // ==========================================
    // SECTION 2: MANIFESTO IDLE SIGNAL SINE LINE
    // ==========================================
    const idleCanvas = idleCanvasRef.current;
    const idleCtx = idleCanvas?.getContext('2d');
    let idleW = 0, idleH = 0;

    function resizeIdle() {
      if (!idleCanvas || !idleCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      idleW = idleCanvas.clientWidth;
      idleH = idleCanvas.clientHeight;
      idleCanvas.width = Math.floor(idleW * dpr);
      idleCanvas.height = Math.floor(idleH * dpr);
      idleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function renderIdleLine(timeSec: number) {
      if (!idleCtx || !idleW) return;
      idleCtx.clearRect(0, 0, idleW, idleH);
      const midY = idleH * 0.52;

      idleCtx.beginPath();
      for (let x = 0; x <= idleW; x += 4) {
        const normX = x / idleW;
        const slowSine = Math.sin(normX * 12 + timeSec * (Math.PI * 0.5));
        const beatWarp = Math.sin(normX * 36 - timeSec * 4) * BeatSim.kick * 14;
        const env = Math.sin(normX * Math.PI);
        const y = midY + (slowSine * 18 + beatWarp) * env;
        if (x === 0) idleCtx.moveTo(x, y);
        else idleCtx.lineTo(x, y);
      }

      idleCtx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      idleCtx.lineWidth = 1.4;
      idleCtx.stroke();
    }

    // ==========================================
    // SECTION 3: SIGNAL PATH SCRUBBER
    // ==========================================
    const signalCanvas = signalCanvasRef.current;
    const signalCtx = signalCanvas?.getContext('2d');
    let sigW = 0, sigH = 0;

    function resizeSignalCanvas() {
      if (!signalCanvas || !signalCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sigW = signalCanvas.clientWidth;
      sigH = signalCanvas.clientHeight;
      signalCanvas.width = Math.floor(sigW * dpr);
      signalCanvas.height = Math.floor(sigH * dpr);
      signalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function renderSignalPath(progress: number) {
      if (!signalCtx || !sigW) return;
      signalCtx.clearRect(0, 0, sigW, sigH);

      const nodes = [
        { label: "ANALOG", x: sigW * 0.12, y: sigH * 0.5 },
        { label: "A/D 48k", x: sigW * 0.31, y: sigH * 0.32 },
        { label: "ENGINE",  x: sigW * 0.50, y: sigH * 0.68 },
        { label: "GPU",     x: sigW * 0.69, y: sigH * 0.32 },
        { label: "LIGHT",   x: sigW * 0.88, y: sigH * 0.5 }
      ];

      // Track line
      signalCtx.beginPath();
      nodes.forEach((n, i) => {
        if (i === 0) signalCtx.moveTo(n.x, n.y);
        else {
          const prev = nodes[i - 1];
          const cx = (prev.x + n.x) / 2;
          signalCtx.bezierCurveTo(cx, prev.y, cx, n.y, n.x, n.y);
        }
      });
      signalCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      signalCtx.lineWidth = 2.5;
      signalCtx.stroke();

      const totalNodes = nodes.length;
      const activeNodeIdx = Math.min(totalNodes - 1, Math.floor(progress * totalNodes));

      // Active pulse track
      signalCtx.save();
      signalCtx.beginPath();
      nodes.forEach((n, i) => {
        if (i === 0) signalCtx.moveTo(n.x, n.y);
        else {
          const prev = nodes[i - 1];
          const cx = (prev.x + n.x) / 2;
          signalCtx.bezierCurveTo(cx, prev.y, cx, n.y, n.x, n.y);
        }
      });
      signalCtx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
      signalCtx.lineWidth = 3.5;
      signalCtx.shadowColor = '#00e5ff';
      signalCtx.shadowBlur = 14;
      signalCtx.stroke();
      signalCtx.restore();

      // Nodes
      nodes.forEach((node, idx) => {
        const isReached = progress >= (idx / (totalNodes - 1)) * 0.85;
        const isCurrent = idx === activeNodeIdx;
        const radius = isCurrent ? 9 + BeatSim.kick * 3 : (isReached ? 6.5 : 4.5);

        if (isReached || isCurrent) {
          signalCtx.beginPath();
          signalCtx.arc(node.x, node.y, radius * 2.2, 0, Math.PI * 2);
          signalCtx.fillStyle = idx === 4 ? 'rgba(255, 45, 146, 0.25)' : 'rgba(0, 229, 255, 0.25)';
          signalCtx.fill();
        }

        signalCtx.beginPath();
        signalCtx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        signalCtx.fillStyle = isReached ? (idx === 4 ? '#ff2d92' : '#00e5ff') : '#404558';
        signalCtx.fill();
        signalCtx.lineWidth = 1.5;
        signalCtx.strokeStyle = '#ffffff';
        signalCtx.stroke();

        signalCtx.font = '10px Geist, monospace';
        signalCtx.fillStyle = isReached ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)';
        signalCtx.textAlign = 'center';
        signalCtx.fillText(node.label, node.x, node.y + (node.y > sigH * 0.5 ? 24 : -18));
      });

      // Update step items in DOM
      const stepItems = document.querySelectorAll('.step-item') as NodeListOf<HTMLElement>;
      stepItems.forEach((el, idx) => {
        if (idx <= activeNodeIdx) {
          el.style.opacity = '1';
          el.style.borderColor = 'rgba(0, 229, 255, 0.4)';
          el.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        } else {
          el.style.opacity = '0.35';
          el.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          el.style.backgroundColor = 'transparent';
        }
      });
    }

    // ==========================================
    // SECTION 4: LATENCY RADAR & COUNTUP
    // ==========================================
    const radarCanvas = radarCanvasRef.current;
    const radarCtx = radarCanvas?.getContext('2d');
    let radarW = 0, radarH = 0;
    let latencyHasRun = false;

    function resizeRadar() {
      if (!radarCanvas || !radarCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      radarW = radarCanvas.clientWidth;
      radarH = radarCanvas.clientHeight;
      radarCanvas.width = Math.floor(radarW * dpr);
      radarCanvas.height = Math.floor(radarH * dpr);
      radarCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function renderRadarLines(timeSec: number) {
      if (!radarCtx || !radarW) return;
      radarCtx.clearRect(0, 0, radarW, radarH);
      const cx = radarW / 2;
      const cy = radarH / 2;
      const sweep = (timeSec * 0.8) % 1;
      radarCtx.lineWidth = 1;

      for (let j = 0; j < 3; j++) {
        const offsetPhase = (sweep + j * 0.333) % 1;
        const spreadX = offsetPhase * (radarW * 0.48);
        const alpha = Math.sin(offsetPhase * Math.PI) * 0.35;

        radarCtx.strokeStyle = `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
        radarCtx.beginPath();
        radarCtx.moveTo(cx, cy);
        radarCtx.lineTo(cx + spreadX, cy);
        radarCtx.stroke();

        radarCtx.beginPath();
        radarCtx.moveTo(cx, cy);
        radarCtx.lineTo(cx - spreadX, cy);
        radarCtx.stroke();
      }
    }

    function triggerLatencyCountUp() {
      if (latencyHasRun) return;
      latencyHasRun = true;
      const start = performance.now();
      const duration = 1200;
      const target = 7.8;

      function step(now: number) {
        const p = Math.min(1, (now - start) / duration);
        const val = (target * p).toFixed(1);
        if (latencyCounterRef.current) latencyCounterRef.current.textContent = val;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // ==========================================
    // SECTION 5: MINI CONE CANVAS (FEATURE 1)
    // ==========================================
    const miniCanvas = miniConeCanvasRef.current;
    const miniCtx = miniCanvas?.getContext('2d');
    const tiltBox = tiltBoxRef.current;
    let miniW = 0, miniH = 0;
    let miniRot = 0;

    function resizeMiniCone() {
      if (!miniCanvas || !miniCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      miniW = miniCanvas.clientWidth;
      miniH = miniCanvas.clientHeight;
      miniCanvas.width = Math.floor(miniW * dpr);
      miniCanvas.height = Math.floor(miniH * dpr);
      miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const handleTiltMove = (e: MouseEvent) => {
      if (!tiltBox) return;
      const rect = tiltBox.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;
      tiltBox.style.transform = `perspective(1000px) rotateY(${normX * 12}deg) rotateX(${-normY * 12}deg)`;
    };

    const handleTiltLeave = () => {
      if (!tiltBox) return;
      tiltBox.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
    };

    if (tiltBox) {
      tiltBox.addEventListener('mousemove', handleTiltMove);
      tiltBox.addEventListener('mouseleave', handleTiltLeave);
    }

    function renderMiniCone(delta: number) {
      if (!miniCtx || !miniW) return;
      miniRot += 0.12 * delta;
      miniCtx.clearRect(0, 0, miniW, miniH);

      const cx = miniW / 2;
      const cy = miniH * 0.56;
      const r = miniW * 0.32;
      const count = 96;

      miniCtx.strokeStyle = 'rgba(160, 120, 255, 0.25)';
      miniCtx.lineWidth = 1;
      miniCtx.beginPath();
      miniCtx.ellipse(cx, cy, r, r * 0.40, 0, 0, Math.PI * 2);
      miniCtx.stroke();

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + miniRot;
        const sinVal = Math.sin(angle);
        const cosVal = Math.cos(angle);
        const scale = 0.65 + (sinVal + 1) * 0.26;
        const x = cx + cosVal * r * scale;
        const y = cy + sinVal * r * 0.40 * scale;

        const freqPos = i / count;
        let amp = 0.12 + Math.sin(freqPos * Math.PI) * 0.25;
        if (freqPos < 0.35) amp += BeatSim.kick * 0.6;
        else if (freqPos < 0.7) amp += BeatSim.snare * 0.4;
        else amp += BeatSim.hat * 0.3;

        const barH = amp * r * 1.3 * scale;
        miniCtx.fillStyle = getFrequencyColor(freqPos, 0.85);
        miniCtx.fillRect(x - 1.2 * scale, y - barH, 2.4 * scale, barH);
      }
    }

    // ==========================================
    // SECTION 6: HAND SKELETON WIREFRAME (FEATURE 2)
    // ==========================================
    const handCanvas = handCanvasRef.current;
    const handCtx = handCanvas?.getContext('2d');
    let handW = 0, handH = 0;

    function resizeHand() {
      if (!handCanvas || !handCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      handW = handCanvas.clientWidth;
      handH = handCanvas.clientHeight;
      handCanvas.width = Math.floor(handW * dpr);
      handCanvas.height = Math.floor(handH * dpr);
      handCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const HAND_BONES = [
      [0,1],[1,2],[2,3],[3,4],        // Thumb
      [0,5],[5,6],[6,7],[7,8],        // Index
      [0,9],[9,10],[10,11],[11,12],   // Middle
      [0,13],[13,14],[14,15],[15,16], // Ring
      [0,17],[17,18],[18,19],[19,20], // Pinky
      [5,9],[9,13],[13,17]            // Palm arch
    ];

    function renderHandWireframe(timeSec: number) {
      if (!handCtx || !handW) return;
      handCtx.clearRect(0, 0, handW, handH);

      handCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let gx = 20; gx < handW; gx += 28) {
        for (let gy = 20; gy < handH; gy += 28) {
          handCtx.fillRect(gx, gy, 1, 1);
        }
      }

      const cx = handW * 0.5;
      const cy = handH * 0.62;
      const scale = handW * 0.42;

      const openWave = Math.sin(timeSec * 2) * 0.15 + BeatSim.kick * 0.12;
      const sway = Math.sin(timeSec * 1.5) * 0.08;

      const rawLandmarks = [
        [0, 0],
        [-0.22 - openWave, -0.15], [-0.34 - openWave, -0.28], [-0.42 - openWave, -0.42], [-0.48 - openWave, -0.55],
        [-0.15, -0.42], [-0.20, -0.65], [-0.22, -0.82], [-0.23, -0.98 - openWave * 0.5],
        [0.0, -0.45], [0.0, -0.72], [0.0, -0.92], [0.0, -1.10 - openWave * 0.6],
        [0.15, -0.42], [0.18, -0.68], [0.20, -0.88], [0.22, -1.04 - openWave * 0.5],
        [0.28 + openWave, -0.32], [0.35 + openWave, -0.52], [0.40 + openWave, -0.68], [0.44 + openWave, -0.82]
      ];

      const pts = rawLandmarks.map(([lx, ly]) => {
        const rotX = lx * Math.cos(sway) - ly * Math.sin(sway);
        const rotY = lx * Math.sin(sway) + ly * Math.cos(sway);
        return [cx + rotX * scale, cy + rotY * scale];
      });

      handCtx.beginPath();
      HAND_BONES.forEach(([a, b]) => {
        handCtx.moveTo(pts[a][0], pts[a][1]);
        handCtx.lineTo(pts[b][0], pts[b][1]);
      });
      handCtx.strokeStyle = 'rgba(160, 120, 255, 0.6)';
      handCtx.lineWidth = 1.8;
      handCtx.stroke();

      pts.forEach(([px, py], i) => {
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const r = isTip ? 4.5 + BeatSim.kick * 2 : 2.8;

        handCtx.beginPath();
        handCtx.arc(px, py, r * 2.2, 0, Math.PI * 2);
        handCtx.fillStyle = isTip ? 'rgba(0, 229, 255, 0.25)' : 'rgba(160, 120, 255, 0.15)';
        handCtx.fill();

        handCtx.beginPath();
        handCtx.arc(px, py, r, 0, Math.PI * 2);
        handCtx.fillStyle = isTip ? '#00e5ff' : '#ffffff';
        handCtx.fill();
      });
    }

    // ==========================================
    // SECTION 7: KAWARP WORD-SYNC CADENCE
    // ==========================================
    function updateKawarpWordSync(timeSec: number) {
      const syncWords = document.querySelectorAll('.sync-word') as NodeListOf<HTMLElement>;
      const syncBars = document.querySelectorAll('.sync-bar') as NodeListOf<HTMLElement>;
      const totalWords = 5;
      const stepTime = BeatSim.period;
      const stepIdx = Math.floor(timeSec / stepTime) % totalWords;
      const progressPct = ((timeSec % (stepTime * totalWords)) / (stepTime * totalWords)) * 100;

      if (kawarpProgressFillRef.current) {
        kawarpProgressFillRef.current.style.width = `${progressPct}%`;
      }

      if (bpmPhaseReadoutRef.current) {
        bpmPhaseReadoutRef.current.textContent = `PASO 0${stepIdx + 1} / 05`;
      }

      syncWords.forEach((el, idx) => {
        if (idx === stepIdx) {
          el.className = 'sync-word text-white font-medium scale-105 transition-all text-auraCyan';
          el.style.textShadow = '0 0 16px rgba(0, 229, 255, 0.8)';
          if (syncBars[idx]) {
            syncBars[idx].className = 'w-1.5 h-6 rounded-full bg-auraCyan shadow-[0_0_12px_#00e5ff] sync-bar transition-all';
          }
        } else {
          el.className = 'sync-word text-white/40 font-normal scale-100 transition-all';
          el.style.textShadow = 'none';
          if (syncBars[idx]) {
            syncBars[idx].className = 'w-1 h-3 rounded-full bg-white/20 sync-bar transition-all';
          }
        }
      });
    }

    // ==========================================
    // SECTION 8: TECH SPECS COUNTER INTERSECTION
    // ==========================================
    let specsCounted = false;
    const specsGrid = specsGridRef.current;

    const specsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !specsCounted) {
          specsCounted = true;
          triggerLatencyCountUp();
          if (!specsGrid) return;
          const items = specsGrid.querySelectorAll('[data-target]') as NodeListOf<HTMLElement>;
          items.forEach(item => {
            const target = parseFloat(item.getAttribute('data-target') || '0');
            const isDecimal = target % 1 !== 0;
            const start = performance.now();
            const duration = 1000;
            function countStep(now: number) {
              const p = Math.min(1, (now - start) / duration);
              const current = (target * p).toFixed(isDecimal ? 1 : 0);
              if (target === 48) item.textContent = `${current} kHz`;
              else if (target === 128) item.textContent = `${current}`;
              else if (target === 7.8) item.textContent = `${current} ms`;
              else if (target === 160) item.textContent = `${current}`;
              else if (target === 60) item.textContent = `${current} fps`;
              if (p < 1) requestAnimationFrame(countStep);
            }
            requestAnimationFrame(countStep);
          });
        }
      });
    }, { threshold: 0.2 });

    if (specsGrid) specsObserver.observe(specsGrid);

    // Latency observer
    const latencySection = latencySectionRef.current;
    const latencyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          triggerLatencyCountUp();
        }
      });
    }, { threshold: 0.3 });
    if (latencySection) latencyObserver.observe(latencySection);

    // ==========================================
    // SECTION 9: FOOTER AMBIENT CONE CANVAS
    // ==========================================
    const footerCanvas = footerCanvasRef.current;
    const footerCtx = footerCanvas?.getContext('2d');
    let footW = 0, footH = 0;
    let footRot = 0;

    function resizeFooterCanvas() {
      if (!footerCanvas || !footerCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      footW = footerCanvas.clientWidth;
      footH = footerCanvas.clientHeight;
      footerCanvas.width = Math.floor(footW * dpr);
      footerCanvas.height = Math.floor(footH * dpr);
      footerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function renderFooterCone(delta: number) {
      if (!footerCtx || !footW) return;
      footRot += 0.04 * delta;
      footerCtx.clearRect(0, 0, footW, footH);

      const cx = footW / 2;
      const cy = footH * 0.6;
      const r = Math.min(footW, footH) * 0.35;
      const count = 80;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + footRot;
        const sinVal = Math.sin(angle);
        const cosVal = Math.cos(angle);
        const scale = 0.7 + (sinVal + 1) * 0.2;
        const x = cx + cosVal * r * scale;
        const y = cy + sinVal * r * 0.38 * scale;
        const amp = (0.05 + Math.sin(i * 0.2) * 0.05 + BeatSim.kick * 0.15) * 0.5;
        const barH = amp * r * scale;

        footerCtx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        footerCtx.fillRect(x - 1, y - barH, 2, barH);
      }
    }

    // ==========================================
    // GLOBAL SCROLL TRACKER & RAIL INDICATOR
    // ==========================================
    function updateScrollState() {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;

      if (scrollThumbRef.current) {
        scrollThumbRef.current.style.top = `${progress * 100}%`;
      }

      if (signalParentRef.current) {
        const rect = signalParentRef.current.getBoundingClientRect();
        const parentH = signalParentRef.current.offsetHeight - window.innerHeight;
        if (parentH > 0) {
          const sigProgress = Math.min(1, Math.max(0, -rect.top / parentH));
          renderSignalPath(sigProgress);
        }
      }
    }

    window.addEventListener('scroll', updateScrollState, { passive: true });

    const scrollRail = scrollRailRef.current;
    const handleRailClick = (e: MouseEvent) => {
      if (!scrollRail) return;
      const rect = scrollRail.getBoundingClientRect();
      const p = (e.clientY - rect.top) / rect.height;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: p * maxScroll, behavior: 'smooth' });
    };

    if (scrollRail) {
      scrollRail.addEventListener('click', handleRailClick);
    }

    // ==========================================
    // RESIZE DISPATCHER
    // ==========================================
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function resizeAll() {
      resizeHero();
      resizeIdle();
      resizeSignalCanvas();
      resizeRadar();
      resizeMiniCone();
      resizeHand();
      resizeFooterCanvas();
      updateScrollState();
    }

    const handleWindowResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeAll, 100);
    };

    window.addEventListener('resize', handleWindowResize);

    // Initial resize setup
    resizeAll();

    // ==========================================
    // MASTER RAF RENDER LOOP
    // ==========================================
    let lastTime = performance.now();
    let animId = 0;

    function masterLoop(now: number) {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const nowSec = now / 1000;

      // Update Shared Global Beat Simulation
      BeatSim.update(nowSec);

      // 1. Render Hero Visualizer
      if (heroCtx && heroCanvas) {
        const heroElapsed = now - bootStartTime;
        const introP = prefersReducedMotion ? 1.0 : Math.min(1.0, heroElapsed / BOOT_DURATION);
        if (isHeroBooting && introP >= 1.0) isHeroBooting = false;
        updateHeroStatus(heroElapsed);

        heroCtx.globalCompositeOperation = 'source-over';
        heroCtx.fillStyle = 'rgba(5, 7, 16, 0.32)';
        heroCtx.fillRect(0, 0, heroWidth, heroHeight);

        if (!prefersReducedMotion) {
          rotationAngle += ROTATION_SPEED * delta;
        }

        const ambAlpha = 0.20 + BeatSim.kick * 0.18;
        const glowRadius = heroR * 3.4;
        const ambGrad = heroCtx.createRadialGradient(heroCenterX, heroCenterY, 0, heroCenterX, heroCenterY, glowRadius);
        ambGrad.addColorStop(0, `rgba(90, 50, 200, ${ambAlpha.toFixed(3)})`);
        ambGrad.addColorStop(0.35, `rgba(50, 30, 130, ${(ambAlpha * 0.4).toFixed(3)})`);
        ambGrad.addColorStop(1, 'rgba(5, 7, 16, 0)');

        heroCtx.globalCompositeOperation = 'lighter';
        heroCtx.fillStyle = ambGrad;
        heroCtx.beginPath();
        heroCtx.arc(heroCenterX, heroCenterY, glowRadius, 0, Math.PI * 2);
        heroCtx.fill();

        // Expanding Boot Ring
        if (heroElapsed < 1440 && !prefersReducedMotion) {
          const ringProgress = Math.min(1.0, heroElapsed / 1100);
          const ringR = heroR * 0.20 + (heroR * 0.90 - heroR * 0.20) * ringProgress;
          const ringAlpha = Math.pow(Math.max(0, 1 - ringProgress), 2) * 0.90;

          if (ringAlpha > 0.005) {
            heroCtx.beginPath();
            heroCtx.ellipse(heroCenterX, heroCenterY, ringR, ringR * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
            heroCtx.lineWidth = 3.6;
            heroCtx.strokeStyle = `rgba(120, 180, 255, ${(ringAlpha * 0.35).toFixed(3)})`;
            heroCtx.stroke();

            heroCtx.beginPath();
            heroCtx.ellipse(heroCenterX, heroCenterY, ringR, ringR * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
            heroCtx.lineWidth = 1.4;
            heroCtx.strokeStyle = `rgba(220, 240, 255, ${ringAlpha.toFixed(3)})`;
            heroCtx.stroke();
          }
        }

        // Base Ellipse Rings
        heroCtx.lineWidth = 1.4;
        heroCtx.strokeStyle = 'rgba(160, 120, 255, 0.28)';
        heroCtx.beginPath();
        heroCtx.ellipse(heroCenterX, heroCenterY, heroR, heroR * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
        heroCtx.stroke();

        heroCtx.lineWidth = 1.0;
        heroCtx.strokeStyle = 'rgba(160, 120, 255, 0.12)';
        heroCtx.beginPath();
        heroCtx.ellipse(heroCenterX, heroCenterY, heroR * 1.05, heroR * 1.05 * ELLIPSE_RATIO, 0, 0, Math.PI * 2);
        heroCtx.stroke();

        const centerMarkerR = 1.8 + BeatSim.kick * 0.9;
        heroCtx.fillStyle = `rgba(190, 150, 255, ${(0.5 + BeatSim.kick * 0.4).toFixed(2)})`;
        heroCtx.beginPath();
        heroCtx.arc(heroCenterX, heroCenterY, centerMarkerR, 0, Math.PI * 2);
        heroCtx.fill();

        // Update Hero Bars
        for (let i = 0; i < N; i++) {
          const pos = i / N;
          let beatBoost = 0;
          if (pos < 0.35) {
            beatBoost = BeatSim.kick * (1 - pos / 0.35) * 0.75;
          } else if (pos < 0.72) {
            const midP = (pos - 0.35) / (0.72 - 0.35);
            beatBoost = BeatSim.snare * (1 - Math.abs(midP - 0.5) * 1.8) * 0.55;
          } else {
            beatBoost = BeatSim.hat * (1 - pos * 0.4) * 0.42;
          }

          const lfo = Math.sin(nowSec * 1.15 + i * 0.18) * 0.035;
          let targetAmp = BASE_AMPS[i] * 0.72 + beatBoost + lfo;

          if (isHeroBooting) {
            const delay = (i / N) * 0.55;
            let localP = (introP - delay) / (1 - delay * 0.5);
            localP = Math.max(0, Math.min(1, localP));
            targetAmp *= (1 - Math.pow(1 - localP, 3));
          }

          const factor = targetAmp > currentAmps[i] ? 0.45 : 0.10;
          currentAmps[i] += (targetAmp - currentAmps[i]) * factor;

          if (currentAmps[i] > peakAmps[i]) peakAmps[i] = currentAmps[i];
          else peakAmps[i] *= 0.985;

          barOrder[i] = i;
        }

        for (let i = 0; i < N; i++) {
          sinTable[i] = Math.sin((i / N) * (Math.PI * 2) + rotationAngle);
        }
        barOrder.sort((a, b) => sinTable[a] - sinTable[b]);

        for (let idx = 0; idx < N; idx++) {
          const i = barOrder[idx];
          const theta = (i / N) * (Math.PI * 2) + rotationAngle;
          const cosVal = Math.cos(theta);
          const sinVal = sinTable[i];
          const nearness = (sinVal + 1) / 2;
          const scale = 0.60 + (1.18 - 0.60) * nearness;

          const screenX = heroCenterX + cosVal * heroR * scale;
          const screenY = heroCenterY + sinVal * heroR * ELLIPSE_RATIO * scale;

          const amp = Math.max(0.04, currentAmps[i]);
          const barHeight = amp * heroR * 1.5 * scale;
          const barWidth = Math.max(0.9, 2.8 * scale);
          const depthAlpha = 0.35 + nearness * 0.65;
          const freqPos = i / N;
          const topY = screenY - barHeight;

          // Glow halo
          const haloWidth = barWidth * 7;
          const haloHeight = barHeight + barWidth * 2;
          const haloGrad = heroCtx.createLinearGradient(0, topY - barWidth * 2, 0, screenY);
          haloGrad.addColorStop(0, getFrequencyColor(freqPos, 0.32 * depthAlpha));
          haloGrad.addColorStop(0.6, getFrequencyColor(freqPos, 0.06 * depthAlpha));
          haloGrad.addColorStop(1, getFrequencyColor(freqPos, 0));
          heroCtx.fillStyle = haloGrad;
          heroCtx.fillRect(screenX - haloWidth / 2, topY - barWidth * 2, haloWidth, haloHeight);

          // Body
          const bodyGrad = heroCtx.createLinearGradient(0, screenY, 0, topY);
          bodyGrad.addColorStop(0, getFrequencyColor(freqPos, 0.35 * depthAlpha));
          bodyGrad.addColorStop(0.65, getFrequencyColor(freqPos, 0.90 * depthAlpha));
          bodyGrad.addColorStop(1, getFrequencyColor(freqPos, 1.0 * depthAlpha));
          heroCtx.fillStyle = bodyGrad;
          heroCtx.fillRect(screenX - barWidth / 2, topY, barWidth, barHeight);

          // Tip Glow
          const tipRadius = barWidth * 2.6;
          const tipGrad = heroCtx.createRadialGradient(screenX, topY, 0, screenX, topY, tipRadius);
          tipGrad.addColorStop(0, `rgba(255, 255, 255, ${(0.90 * depthAlpha).toFixed(3)})`);
          tipGrad.addColorStop(0.25, getFrequencyColor(freqPos, 0.85 * depthAlpha));
          tipGrad.addColorStop(1, getFrequencyColor(freqPos, 0));
          heroCtx.fillStyle = tipGrad;
          heroCtx.beginPath();
          heroCtx.arc(screenX, topY, tipRadius, 0, Math.PI * 2);
          heroCtx.fill();

          // Chromatic aberration on loud peaks
          if (amp > 0.65) {
            const caAlpha = Math.min(1.0, (amp - 0.65) * 2.86) * depthAlpha;
            const caRadius = barWidth * 1.5;

            heroCtx.fillStyle = `rgba(255, 40, 90, ${caAlpha.toFixed(3)})`;
            heroCtx.beginPath();
            heroCtx.arc(screenX - 1.3, topY, caRadius, 0, Math.PI * 2);
            heroCtx.fill();

            heroCtx.fillStyle = `rgba(40, 140, 255, ${caAlpha.toFixed(3)})`;
            heroCtx.beginPath();
            heroCtx.arc(screenX + 1.3, topY, caRadius, 0, Math.PI * 2);
            heroCtx.fill();
          }

          // Peak Hold
          const peak = peakAmps[i];
          if (peak > 0.15 && peak > amp + 0.02) {
            const peakY = screenY - (peak * heroR * 1.5 * scale);
            const peakWidth = Math.max(1.6, barWidth * 1.2);
            const peakAlpha = Math.min(1.0, (peak - 0.15) * 2.5) * depthAlpha;
            heroCtx.fillStyle = `rgba(255, 255, 255, ${peakAlpha.toFixed(3)})`;
            heroCtx.fillRect(screenX - peakWidth / 2, peakY - 0.8, peakWidth, 1.6);
          }
        }
      }

      // 2. Render Secondary Canvases (if not reduced motion)
      if (!prefersReducedMotion) {
        renderIdleLine(nowSec);
        renderRadarLines(nowSec);
        renderMiniCone(delta);
        renderHandWireframe(nowSec);
        updateKawarpWordSync(nowSec);
        renderFooterCone(delta);
      }

      animId = requestAnimationFrame(masterLoop);
    }

    animId = requestAnimationFrame(masterLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', updateScrollState);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (tiltBox) {
        tiltBox.removeEventListener('mousemove', handleTiltMove);
        tiltBox.removeEventListener('mouseleave', handleTiltLeave);
      }
      if (scrollRail) {
        scrollRail.removeEventListener('click', handleRailClick);
      }
      specsObserver.disconnect();
      latencyObserver.disconnect();
    };
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-root bg-auraBg text-white selection:bg-cyan-500/30 selection:text-white select-none w-full min-h-[100dvh] overflow-x-clip font-sans">
      {/* Desktop Vertical Scroll Rail Indicator */}
      <aside
        ref={scrollRailRef}
        aria-label="Progreso de página"
        className="hidden md:block"
        id="scroll-rail"
        title="Desplazarse por la estación"
      >
        <div ref={scrollThumbRef} id="scroll-thumb" style={{ top: '0%' }} />
      </aside>

      {/* ================= SECTION 1: HERO (100svh) ================= */}
      <section className="relative w-full h-[100svh] min-h-[640px] overflow-hidden bg-auraBg" id="hero">
        <div id="hero-canvas-container">
          <canvas ref={heroCanvasRef} aria-hidden="true" id="visualizer-canvas" />
        </div>

        {/* UI Overlay Grid */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between px-6 md:px-12 lg:px-16 py-7 md:py-10 pointer-events-none">
          {/* Top Bar (Zone A) */}
          <header className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={handleEnter}
              aria-label="Aura3D Inicio"
              className="inline-flex items-center gap-2.5 pointer-events-auto text-white/90 hover:text-white transition-opacity bg-transparent border-0 cursor-pointer p-0"
            >
              <span className="w-[7px] h-[7px] rounded-full bg-auraCyan shadow-[0_0_10px_#00e5ff,0_0_3px_#00e5ff] inline-block shrink-0" />
              <span className="text-[13px] font-medium tracking-tight text-white/90">Aura3D</span>
            </button>
            <div className="flex items-center gap-5">
              <div className="inline-flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full bg-auraCyan shadow-[0_0_6px_#00e5ff] status-dot-pulse shrink-0" />
                <span className="text-[11px] font-normal tracking-wider text-white/40 tabular-nums min-w-[84px]" ref={statusElRef} id="status-indicator">
                  Iniciando
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] font-normal tracking-wide text-white/30">
                Estación de audio reactiva
              </span>
            </div>
          </header>

          {/* Center Space Reserved for Visualizer Geometry */}
          <div aria-hidden="true" className="flex-1 w-full" />

          {/* Bottom Bar (Zone C) */}
          <footer className="w-full flex flex-col md:flex-row md:items-end justify-between gap-8 pb-1">
            <div className="max-w-[640px]">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[76px] font-medium tracking-[-0.045em] leading-[0.96] text-white balance mb-4">
                El sonido<br />hecho visible.
              </h1>
              <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-white/50 max-w-[46ch] font-normal tracking-tight">
                Visualizador cónico, tracking de manos y word-sync con Kawarp. Un instrumento para hacer música visible en tiempo real.
              </p>
              <div className="inline-flex items-center gap-5 mt-6 sm:mt-7 pointer-events-auto">
                <button
                  type="button"
                  id="btn-reboot"
                  onClick={handleEnter}
                  className="inline-flex items-center justify-center bg-white text-auraBg px-5 sm:px-6 py-3 rounded-full text-[13px] font-medium tracking-tight shadow-[0_6px_24px_rgba(0,229,255,0.28)] hover:shadow-[0_10px_36px_rgba(0,229,255,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border-0"
                >
                  Iniciar motor
                </button>
                <a
                  href="#especificaciones"
                  onClick={(e) => handleSmoothScroll(e, 'especificaciones')}
                  className="text-[13px] text-white/60 hover:text-white border-b border-white/20 hover:border-white pb-0.5 transition-colors tracking-tight text-decoration-none"
                >
                  Ver especificaciones
                </a>
              </div>
            </div>

            {/* Specs right column */}
            <div className="flex items-end justify-between md:justify-end gap-8 sm:gap-10 pt-4 md:pt-0 border-t border-white/10 md:border-none">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-normal text-white/30 tracking-tight">Entrada</span>
                <span className="text-lg md:text-xl lg:text-[22px] font-normal tracking-tight text-white/85 tabular-nums">48 kHz</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-normal text-white/30 tracking-tight">Buffer</span>
                <span className="text-lg md:text-xl lg:text-[22px] font-normal tracking-tight text-white/85 tabular-nums">128</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-normal text-white/30 tracking-tight">Salida</span>
                <span className="text-lg md:text-xl lg:text-[22px] font-normal tracking-tight text-white/85 tabular-nums">7.8 ms</span>
              </div>
            </div>
          </footer>
        </div>
      </section>

      {/* ================= SECTION 2: MANIFESTO (min 90svh) ================= */}
      <section className="relative min-h-[90svh] w-full flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-auraBg overflow-hidden border-t border-white/[0.06]" id="manifiesto">
        <canvas ref={idleCanvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-40" id="idle-line-canvas" />
        <div className="relative z-10 max-w-[780px] text-center flex flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02]">
            <span className="w-1.5 h-1.5 rounded-full bg-auraCyan" />
            <span className="text-[11px] font-normal text-white/50 tracking-wider uppercase">Manifiesto de señal</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-[1.08] text-balance" id="manifesto-heading">
            No dibujamos formas.<br />
            <span className="text-white/85">Dejamos que el sonido se dibuje solo.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/50 font-normal leading-relaxed max-w-[620px] text-balance">
            Cada barra es una banda de frecuencia. Cada frecuencia es una decisión de mezcla. Aura3D no interpreta: traduce. 48 kHz entran, luz sale, y todo ocurre antes de que el oído pueda notarlo.
          </p>
          <div className="flex items-center gap-6 mt-4 text-xs tracking-wider text-white/30 tabular-nums uppercase">
            <span>Respuesta lineal</span>
            <span className="text-white/15">/</span>
            <span>Sin post-procesado</span>
            <span className="text-white/15">/</span>
            <span>Hardware directo</span>
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: THE SIGNAL PATH (Sticky scrubber) ================= */}
      <section className="relative w-full bg-gradient-to-b from-auraBg to-auraDark" id="camino-senal">
        <div ref={signalParentRef} className="signal-sticky-wrapper" id="signal-scroll-parent">
          <div className="signal-sticky-box flex items-center justify-center px-6 md:px-16">
            <div className="w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: 5 Steps */}
              <div className="lg:col-span-5 flex flex-col gap-6" id="signal-steps-list">
                <div>
                  <span className="text-[11px] font-normal text-auraCyan tracking-wider uppercase">Arquitectura en tiempo real</span>
                  <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mt-1">El camino de la señal</h3>
                  <p className="text-sm text-white/45 mt-2">Flujo síncrono punto a punto de entrada acústica a fotón.</p>
                </div>
                <div className="flex flex-col gap-3.5 mt-2">
                  <div className="step-item p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between" data-step="0">
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-full border border-auraCyan/40 flex items-center justify-center text-[11px] text-auraCyan font-mono">01</span>
                      <span className="text-sm md:text-base font-medium text-white/80">Entrada analógica</span>
                    </div>
                    <span className="text-xs text-white/30 tabular-nums">XLR / Line In</span>
                  </div>
                  <div className="step-item p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between opacity-40" data-step="1">
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[11px] text-white/40 font-mono">02</span>
                      <span className="text-sm md:text-base font-medium text-white/80">Conversión A/D — 48 kHz</span>
                    </div>
                    <span className="text-xs text-white/30 tabular-nums">24-bit delta-sigma</span>
                  </div>
                  <div className="step-item p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between opacity-40" data-step="2">
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[11px] text-white/40 font-mono">03</span>
                      <span className="text-sm md:text-base font-medium text-white/80">Motor Aura3D — 128 samples</span>
                    </div>
                    <span className="text-xs text-white/30 tabular-nums">FFT cónica 160b</span>
                  </div>
                  <div className="step-item p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between opacity-40" data-step="3">
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[11px] text-white/40 font-mono">04</span>
                      <span className="text-sm md:text-base font-medium text-white/80">Render en GPU</span>
                    </div>
                    <span className="text-xs text-white/30 tabular-nums">Metal / WebGL</span>
                  </div>
                  <div className="step-item p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between opacity-40" data-step="4">
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[11px] text-white/40 font-mono">05</span>
                      <span className="text-sm md:text-base font-medium text-white/80">Salida — 7.8 ms round-trip</span>
                    </div>
                    <span className="text-xs text-auraCyan font-mono tabular-nums">Zero perceived lag</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Signal Path Canvas */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center">
                <div className="w-full aspect-[16/10] max-h-[460px] relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl p-4 flex items-center justify-center">
                  <canvas ref={signalCanvasRef} className="w-full h-full block" id="signal-path-canvas" />
                  <div className="absolute top-4 left-5 text-[10px] font-mono uppercase tracking-wider text-white/35 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Buffer activo: 128 s / 2.66 ms
                  </div>
                  <div className="absolute bottom-4 right-5 text-[10px] font-mono tracking-wider text-white/35 tabular-nums">
                    SYNC LOCK: 99.98%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: LATENCY PROOF (min 100svh) ================= */}
      <section ref={latencySectionRef} className="relative min-h-[100svh] w-full flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-auraDeep overflow-hidden" id="latencia">
        <canvas ref={radarCanvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-50" id="radar-canvas" />
        <div className="relative z-10 max-w-[1100px] w-full text-center flex flex-col items-center">
          <span className="text-xs sm:text-sm font-normal text-white/50 tracking-wider uppercase mb-3">
            El tiempo que tarda el sonido en volverse luz
          </span>
          <div className="flex items-baseline justify-center font-normal tracking-[-0.05em] select-none my-2">
            <span ref={latencyCounterRef} className="text-[90px] sm:text-[140px] md:text-[200px] lg:text-[240px] leading-none text-white tabular-nums font-medium" id="latency-counter">
              7.8
            </span>
            <span className="text-3xl sm:text-5xl md:text-7xl text-white/40 font-light ml-2 tracking-tight">ms</span>
          </div>
          <div className="w-full max-w-[560px] h-[1px] bg-gradient-to-r from-transparent via-auraCyan/60 to-transparent my-8 relative">
            <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-auraCyan shadow-[0_0_12px_#00e5ff]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12 w-full max-w-[820px] mt-2">
            <div className="flex flex-col items-center gap-1.5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <span className="text-2xl sm:text-3xl font-normal text-white tabular-nums">48 kHz</span>
              <span className="text-xs text-white/40 tracking-wide uppercase">Entrada directa</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <span className="text-2xl sm:text-3xl font-normal text-white tabular-nums">128</span>
              <span className="text-xs text-white/40 tracking-wide uppercase">Buffer muestras</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <span className="text-2xl sm:text-3xl font-normal text-auraCyan tabular-nums">7.8 ms</span>
              <span className="text-xs text-white/40 tracking-wide uppercase">Round-trip total</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-white/40 max-w-[480px] mt-8 text-balance">
            Medido desde la excitación del transductor hasta el frame desplegado en panel OLED a 120Hz con sincronía por hardware.
          </p>
        </div>
      </section>

      {/* ================= SECTION 5: FEATURE 1: VISUALIZADOR CÓNICO (min 110svh) ================= */}
      <section className="relative min-h-[110svh] w-full flex items-center justify-center px-6 md:px-16 py-24 bg-auraBg border-t border-white/[0.06]" id="conico">
        <div className="w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 flex justify-center">
            <div ref={tiltBoxRef} className="relative w-full max-w-[540px] aspect-square rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-2xl p-2 transition-transform duration-200 ease-out" id="cone-tilt-container">
              <canvas ref={miniConeCanvasRef} className="w-full h-full block rounded-xl" id="mini-cone-canvas" />
              <div className="absolute bottom-4 left-5 text-[11px] font-mono text-white/40">
                RADIAL SPECTRUM — 160 BANDS
              </div>
              <div className="absolute top-4 right-5 text-[11px] font-mono text-auraCyan flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-auraCyan animate-ping" />
                LIVE RENDER
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-5">
            <span className="text-[11px] font-medium text-auraCyan tracking-widest uppercase">01 — Visualizador cónico</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white leading-tight">
              Forma que sigue<br />a la frecuencia.
            </h2>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed font-normal">
              Un cono en perspectiva real inclinado 22 grados que organiza el espectro audible en 160 barras continuas. Desde subgraves profundos en la base hasta agudos aireados en la cresta, el volumen se convierte en geometría tridimensional que flota en el espacio.
            </p>
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-6 text-sm text-white/80 tabular-nums">
              <div>
                <div className="text-xs text-white/40 uppercase">Resolución</div>
                <div className="text-base font-mono text-white mt-0.5">160 bandas</div>
              </div>
              <div>
                <div className="text-xs text-white/40 uppercase">Cadencia</div>
                <div className="text-base font-mono text-white mt-0.5">60 fps locked</div>
              </div>
              <div>
                <div className="text-xs text-white/40 uppercase">Ángulo zenit</div>
                <div className="text-base font-mono text-white mt-0.5">Perspectiva 22°</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 6: FEATURE 2: TRACKING DE MANOS (min 110svh) ================= */}
      <section className="relative min-h-[110svh] w-full flex items-center justify-center px-6 md:px-16 py-24 bg-auraDark border-t border-white/[0.06]" id="manos">
        <div className="w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1 flex flex-col gap-5">
            <span className="text-[11px] font-medium text-auraViolet tracking-widest uppercase">02 — Tracking de manos</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white leading-tight">
              Mueve la mano.<br />Mueve la sala.
            </h2>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed font-normal">
              Control gestual sin latencia gracias a un esqueleto cinemático de 21 puntos clave. Abre la palma para expandir el campo estéreo, cierra los dedos para aplicar filtro pasabajos, o eleva la mano para esculpir la dispersión lumínica en tu entorno escénico.
            </p>
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-auraViolet" />
                <span className="text-xs font-mono text-white/70">MediaPipe Vision AI</span>
              </div>
              <span className="text-xs font-mono text-auraCyan tabular-nums">&lt; 40 ms de tracking</span>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-6 text-sm text-white/80 tabular-nums">
              <div>
                <div className="text-xs text-white/40 uppercase">Nodos</div>
                <div className="text-base font-mono text-white mt-0.5">21 landmarks 3D</div>
              </div>
              <div>
                <div className="text-xs text-white/40 uppercase">Frecuencia</div>
                <div className="text-base font-mono text-white mt-0.5">30 fps sensor</div>
              </div>
              <div>
                <div className="text-xs text-white/40 uppercase">Precisión</div>
                <div className="text-base font-mono text-white mt-0.5">Sub-milimétrica</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-[520px] aspect-square rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-2xl p-2">
              <canvas ref={handCanvasRef} className="w-full h-full block rounded-xl" id="hand-canvas" />
              <div className="absolute bottom-4 left-5 text-[11px] font-mono text-white/40">
                21-POINT SKELETAL RIG
              </div>
              <div className="absolute top-4 right-5 text-[11px] font-mono text-auraViolet flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-auraViolet" />
                OPTICAL TRACK
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 7: FEATURE 3: KAWARP WORD-SYNC (min 110svh) ================= */}
      <section className="relative min-h-[110svh] w-full flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-auraDeep border-t border-white/[0.06]" id="kawarp">
        <div className="w-full max-w-[960px] text-center flex flex-col items-center gap-8">
          <span className="text-[11px] font-medium text-auraPink tracking-widest uppercase">03 — Kawarp word-sync</span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-tight">
            Cada palabra,<br />en su momento exacto.
          </h2>
          <div className="w-full py-12 sm:py-16 px-6 sm:px-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm my-4 flex flex-col items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-7 gap-y-4 text-2xl sm:text-4xl md:text-5xl font-medium tracking-tight select-none" id="kawarp-lyrics-row">
              <div className="flex flex-col items-center gap-3">
                <span className="sync-word text-white/40" data-idx="0">el</span>
                <span className="w-1 h-3 rounded-full bg-white/20 sync-bar" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="sync-word text-white/40" data-idx="1">silencio</span>
                <span className="w-1 h-3 rounded-full bg-white/20 sync-bar" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="sync-word text-white/40" data-idx="2">también</span>
                <span className="w-1 h-3 rounded-full bg-white/20 sync-bar" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="sync-word text-white/40" data-idx="3">tiene</span>
                <span className="w-1 h-3 rounded-full bg-white/20 sync-bar" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="sync-word text-white/40" data-idx="4">ritmo</span>
                <span className="w-1 h-3 rounded-full bg-white/20 sync-bar" />
              </div>
            </div>
            <div className="w-full max-w-[480px] h-1 bg-white/10 rounded-full mt-10 overflow-hidden relative">
              <div ref={kawarpProgressFillRef} className="h-full bg-gradient-to-r from-auraCyan via-auraViolet to-auraPink w-0 transition-all duration-75" id="kawarp-progress-fill" />
            </div>
            <div className="flex items-center justify-between w-full max-w-[480px] text-[11px] font-mono text-white/40 mt-3 tabular-nums">
              <span>120.00 BPM</span>
              <span ref={bpmPhaseReadoutRef} id="bpm-phase-readout">PASO 01 / 05</span>
              <span>SYNC LOCK: EXACT</span>
            </div>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-white/50 font-normal leading-relaxed max-w-[640px] text-balance">
            Kawarp alinea el texto con el audio a nivel de palabra. No hay desfase. No hay adivinación. Solo timing analítico procesado en búfer circular para directos, visuales escénicos y videoclips generativos.
          </p>
        </div>
      </section>

      {/* ================= SECTION 8: TECHNICAL SPECS GRID (min 80svh) ================= */}
      <section className="relative min-h-[80svh] w-full flex flex-col items-center justify-center px-6 md:px-16 py-28 bg-auraBg border-t border-white/[0.08]" id="especificaciones">
        <div className="w-full max-w-[1200px]">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-white/10 gap-4">
            <div>
              <span className="text-[11px] font-normal text-white/40 tracking-wider uppercase">Ficha de ingeniería</span>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white mt-1">Especificaciones técnicas</h2>
            </div>
            <div className="text-xs font-mono text-auraCyan tabular-nums">
              MOTOR V3.4.2 — ARQUITECTURA SÍNCRONA
            </div>
          </div>
          <div ref={specsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.08] rounded-2xl overflow-hidden border border-white/[0.08]" id="specs-grid-parent">
            {/* 1: Entrada */}
            <div className="bg-auraBg p-8 flex flex-col justify-between min-h-[190px] group hover:bg-white/[0.015] transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Entrada</span>
                <span className="text-[11px] font-mono text-white/25">01</span>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-medium text-white tracking-tight tabular-nums" data-target="48">
                  48 kHz
                </div>
                <p className="text-xs text-white/50 mt-2 font-normal">
                  Sample rate nativo, sin resampleo ni conversión destructiva.
                </p>
              </div>
            </div>
            {/* 2: Buffer */}
            <div className="bg-auraBg p-8 flex flex-col justify-between min-h-[190px] group hover:bg-white/[0.015] transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Buffer</span>
                <span className="text-[11px] font-mono text-white/25">02</span>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-medium text-white tracking-tight tabular-nums" data-target="128">
                  128
                </div>
                <p className="text-xs text-white/50 mt-2 font-normal">
                  Ventana de análisis ultra corta en muestras síncronas.
                </p>
              </div>
            </div>
            {/* 3: Latencia */}
            <div className="bg-auraBg p-8 flex flex-col justify-between min-h-[190px] group hover:bg-white/[0.015] transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Latencia</span>
                <span className="text-[11px] font-mono text-white/25">03</span>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-medium text-auraCyan tracking-tight tabular-nums" data-target="7.8">
                  7.8 ms
                </div>
                <p className="text-xs text-white/50 mt-2 font-normal">
                  Round-trip analógico/digital de captura hasta render visual.
                </p>
              </div>
            </div>
            {/* 4: Bandas */}
            <div className="bg-auraBg p-8 flex flex-col justify-between min-h-[190px] group hover:bg-white/[0.015] transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Bandas</span>
                <span className="text-[11px] font-mono text-white/25">04</span>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-medium text-white tracking-tight tabular-nums" data-target="160">
                  160
                </div>
                <p className="text-xs text-white/50 mt-2 font-normal">
                  Barras del espectro cónico distribuidas logarítmicamente.
                </p>
              </div>
            </div>
            {/* 5: Frame rate */}
            <div className="bg-auraBg p-8 flex flex-col justify-between min-h-[190px] group hover:bg-white/[0.015] transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Frame rate</span>
                <span className="text-[11px] font-mono text-white/25">05</span>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-medium text-white tracking-tight tabular-nums" data-target="60">
                  60 fps
                </div>
                <p className="text-xs text-white/50 mt-2 font-normal">
                  Render por GPU acelerado, vsync-locked y libre de tearing.
                </p>
              </div>
            </div>
            {/* 6: Salida */}
            <div className="bg-auraBg p-8 flex flex-col justify-between min-h-[190px] group hover:bg-white/[0.015] transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Salida</span>
                <span className="text-[11px] font-mono text-white/25">06</span>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-medium text-white tracking-tight">
                  Estéreo
                </div>
                <p className="text-xs text-white/50 mt-2 font-normal">
                  Canales independientes con rango dinámico de 32 bits flotante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 9: FINAL CTA & FOOTER (min 70svh) ================= */}
      <section className="relative min-h-[70svh] w-full flex flex-col justify-between bg-gradient-to-b from-auraDark to-auraBg overflow-hidden border-t border-white/[0.08]" id="descargar">
        <canvas ref={footerCanvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-25" id="footer-ambient-canvas" />
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-auraCyan/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-white leading-none">
            Enciende el motor.
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white/50 font-normal mt-4 max-w-[520px] text-balance">
            Inicia Aura3D y empieza a hacer visible lo que ya estás escuchando.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
            <button
              type="button"
              onClick={handleEnter}
              className="inline-flex items-center justify-center bg-white text-auraBg px-8 py-3.5 rounded-full text-sm font-medium tracking-tight shadow-[0_6px_28px_rgba(0,229,255,0.35)] hover:shadow-[0_12px_44px_rgba(0,229,255,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border-0"
            >
              Iniciar Aura3D
            </button>
            <a
              href="#especificaciones"
              onClick={(e) => handleSmoothScroll(e, 'especificaciones')}
              className="text-sm text-white/60 hover:text-white px-5 py-3 border-b border-transparent hover:border-white/30 transition-colors text-decoration-none"
            >
              Ver documentación técnica
            </a>
          </div>
          <div className="text-[11px] text-white/35 font-mono mt-6">
            macOS 13+ · Windows 11 · Linux (ALSA / PipeWire)
          </div>
        </div>

        {/* Footer Bar */}
        <footer className="relative z-10 w-full border-t border-white/[0.08] px-6 md:px-16 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-auraCyan" />
            <span>Aura3D © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a className="hover:text-white transition-colors text-decoration-none" href="#">Privacidad</a>
            <span className="text-white/20">·</span>
            <a className="hover:text-white transition-colors text-decoration-none" href="#">Términos</a>
            <span className="text-white/20">·</span>
            <a className="hover:text-white transition-colors text-decoration-none" href="#">Contacto</a>
          </div>
          <span className="text-white/30 font-normal">
            Hecho para quien escucha
          </span>
        </footer>
      </section>

      {/* Transición simple: fade a negro al entrar al motor 3D */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[999] bg-[#050710] pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
