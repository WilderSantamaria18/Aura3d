import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import { ArrowRight, Sparkles, SlidersHorizontal, Palette, AlignLeft, Image as ImageIcon, Layers } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import './sections/ConicStation.css';
import {
  AmbientOrbs,
  GlassNav,
  Scene3D,
  SectionLabel,
  SpotlightCard,
  WordReveal,
  motionForced,
  reducedMotion,
  setForceMotion,
  systemReducedMotion,
  type NavLink,
} from './pro/ProParts';

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
    const prefersReducedMotion = reducedMotion();

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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    // VISIBILIDAD: solo se dibuja lo que está en pantalla
    // ==========================================
    const vis: Record<string, boolean> = { hero: true, idle: false, radar: false, cone: false, hand: false, footer: false, kawarp: false };
    const visIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          const k = (en.target as HTMLElement).dataset.vis;
          if (k) vis[k] = en.isIntersecting;
        });
      },
      { rootMargin: '160px' }
    );
    const kawarpRow = document.getElementById('kawarp-lyrics-row');
    ([[heroCanvas, 'hero'], [idleCanvas, 'idle'], [radarCanvas, 'radar'], [miniCanvas, 'cone'], [handCanvas, 'hand'], [footerCanvas, 'footer'], [kawarpRow, 'kawarp']] as Array<[HTMLElement | null, string]>).forEach(([el, k]) => {
      if (el) {
        el.dataset.vis = k;
        visIO.observe(el);
      }
    });

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
      if (heroCtx && heroCanvas && vis.hero) {
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
        if (vis.idle) renderIdleLine(nowSec);
        if (vis.radar) renderRadarLines(nowSec);
        if (vis.cone) renderMiniCone(delta);
        if (vis.hand) renderHandWireframe(nowSec);
        if (vis.kawarp) updateKawarpWordSync(nowSec);
        if (vis.footer) renderFooterCone(delta);
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
      visIO.disconnect();
    };
  }, []);

  // ── Scroll suave (Lenis) ─────────────────────────────────────────────────
  const lenisRef = useRef<Lenis | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenisRef.current = lenis;
    let id = requestAnimationFrame(function raf(t) {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToSection = useCallback((targetId: string) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    scrollToSection(targetId);
  };

  // ── Salida 3D del hero al hacer scroll ───────────────────────────────────
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroSectionRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(heroP, [0, 1], [0, -140]);
  const heroRotX = useTransform(heroP, [0, 1], [0, 12]);
  const heroScale = useTransform(heroP, [0, 1], [1, 0.93]);

  const navLinks: NavLink[] = [
    { id: 'manifiesto', label: 'Manifiesto' },
    { id: 'camino-senal', label: 'Señal', also: ['latencia'] },
    { id: 'conico', label: 'Funciones', also: ['manos', 'kawarp'] },
    { id: 'estudio', label: 'Estudio' },
    { id: 'especificaciones', label: 'Specs' },
  ];

  const eqHeights = [38, 62, 48, 80, 58, 92, 66, 44, 72, 52];

  return (
    <div data-motion={motionForced() ? 'on' : undefined} className="lp-root landing-root selection:bg-cyan-500/30 selection:text-white w-full min-h-[100dvh] overflow-x-clip">
      <AmbientOrbs />
      <GlassNav links={navLinks} onNavigate={scrollToSection} onEnter={handleEnter} />

      {/* Desktop Vertical Scroll Rail Indicator */}
      <aside ref={scrollRailRef} aria-label="Progreso de página" className="hidden md:block" id="scroll-rail" title="Desplazarse por la estación">
        <div ref={scrollThumbRef} id="scroll-thumb" style={{ top: '0%' }} />
      </aside>

      <main className="lp-content">
        {/* ================= HERO ================= */}
        <section ref={heroSectionRef} className="relative w-full h-[100svh] min-h-[600px] overflow-hidden" id="hero">
          <div id="hero-canvas-container">
            <canvas ref={heroCanvasRef} aria-hidden="true" id="visualizer-canvas" />
          </div>

          <motion.div
            style={{ y: heroY, rotateX: heroRotX, scale: heroScale, transformPerspective: 1400, transformOrigin: '50% 100%' }}
            className="relative z-10 w-full h-full flex flex-col justify-between px-6 md:px-12 lg:px-16 pt-24 md:pt-28 pb-8 md:pb-10 pointer-events-none"
          >
            <div className="flex items-start justify-between gap-4">
              <SectionLabel className="hidden sm:flex">Estación de audio reactiva</SectionLabel>
              <div className="inline-flex items-center gap-2 ml-auto">
                <span className="w-[5px] h-[5px] rounded-full bg-auraCyan status-dot-pulse shrink-0" />
                <span className="font-mono text-[11px] tracking-wider text-white/60 tabular-nums min-w-[84px]" ref={statusElRef} id="status-indicator">
                  Iniciando
                </span>
              </div>
            </div>

            <div aria-hidden="true" className="flex-1 w-full" />

            <div className="w-full flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="max-w-[720px]">
                <motion.h1
                  initial={{ opacity: 0, y: 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ fontSize: 'clamp(42px, min(10.5vh, 8vw), 96px)' }}
                  className="lp-h1 text-white mb-4"
                >
                  El sonido
                  <br />
                  <span className="lp-gradient-text">hecho visible.</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="lp-lead text-[14px] sm:text-[16px] max-w-[50ch]"
                >
                  Visualizador cónico, tracking de manos y word-sync con Kawarp. Un instrumento para hacer música visible en tiempo real, directo en tu navegador.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-center gap-3 mt-6 pointer-events-auto"
                >
                  <button type="button" id="btn-reboot" onClick={handleEnter} className="lp-btn lp-btn--primary lp-btn--lg">
                    Iniciar motor
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <a href="#conico" onClick={(e) => handleSmoothScroll(e, 'conico')} className="lp-btn lp-btn--lg">
                    Ver cómo funciona
                  </a>
                </motion.div>
              </div>

              <motion.dl
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 1.1 }}
                className="lp-stats"
              >
                <div>
                  <dt>Entrada</dt>
                  <dd>48 kHz</dd>
                </div>
                <div>
                  <dt>Buffer</dt>
                  <dd>128</dd>
                </div>
                <div>
                  <dt>Salida</dt>
                  <dd>7.8 ms</dd>
                </div>
              </motion.dl>
            </div>
          </motion.div>
        </section>

        {/* ================= MANIFIESTO ================= */}
        <section className="relative min-h-[100svh] w-full flex flex-col items-center justify-center px-6 md:px-12 py-28 overflow-hidden" id="manifiesto">
          <canvas ref={idleCanvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-40" id="idle-line-canvas" />
          <div className="relative z-10 max-w-[980px] flex flex-col gap-10">
            <SectionLabel>Manifiesto de señal</SectionLabel>
            <WordReveal
              text="No dibujamos formas. Dejamos que el sonido se dibuje solo. Cada barra es una banda de frecuencia. Cada frecuencia es una decisión de mezcla. Aura3D no interpreta: traduce."
              className="lp-h2 text-[32px] sm:text-5xl md:text-6xl lg:text-[66px] text-white"
            />
            <p className="font-mono text-[12px] tracking-[0.12em] uppercase text-[color:var(--lp-muted)]">
              Respuesta lineal <span className="mx-3 opacity-40">/</span> Sin post-procesado <span className="mx-3 opacity-40">/</span> Hardware directo
            </p>
          </div>
        </section>

        {/* ================= CAMINO DE LA SEÑAL (sticky) ================= */}
        <section className="relative w-full" id="camino-senal">
          <div ref={signalParentRef} className="signal-sticky-wrapper" id="signal-scroll-parent">
            <div className="signal-sticky-box flex items-center justify-center px-6 md:px-16">
              <div className="w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                <div className="lg:col-span-5 flex flex-col gap-7" id="signal-steps-list">
                  <div className="flex flex-col gap-4">
                    <SectionLabel>Arquitectura en tiempo real</SectionLabel>
                    <h3 className="lp-h2 text-3xl sm:text-4xl md:text-[44px] text-white">El camino de la señal</h3>
                    <p className="lp-lead text-[15px]">Flujo síncrono punto a punto de entrada acústica a fotón.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      ['01', 'Entrada analógica', 'XLR / Line In'],
                      ['02', 'Conversión A/D — 48 kHz', '24-bit delta-sigma'],
                      ['03', 'Motor Aura3D — 128 samples', 'FFT cónica 160b'],
                      ['04', 'Render en GPU', 'Metal / WebGL'],
                      ['05', 'Salida — 7.8 ms round-trip', 'Zero perceived lag'],
                    ].map(([n, title, meta], i) => (
                      <div
                        key={n}
                        className="step-item rounded-2xl border border-transparent px-4 py-3.5 flex items-center justify-between gap-3"
                        data-step={i}
                        style={i === 0 ? undefined : { opacity: 0.4 }}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="font-mono text-[11px] text-auraCyan shrink-0">{n}</span>
                          <span className="text-[15px] font-medium text-white truncate">{title}</span>
                        </div>
                        <span className="hidden sm:inline font-mono text-[11.5px] tabular-nums shrink-0 text-[color:var(--lp-muted)]">{meta}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col items-center justify-center">
                  <div className="lp-glass w-full aspect-[16/10] max-h-[470px] relative overflow-hidden p-4 flex items-center justify-center">
                    <canvas ref={signalCanvasRef} className="w-full h-full block" id="signal-path-canvas" />
                    <div className="absolute top-4 left-5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--lp-muted)]">Buffer activo · 128 s / 2.66 ms</div>
                    <div className="absolute bottom-4 right-5 font-mono text-[10px] tracking-wider text-[color:var(--lp-muted)] tabular-nums">SYNC LOCK 99.98%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= LATENCIA ================= */}
        <section ref={latencySectionRef} className="relative min-h-[100svh] w-full flex flex-col items-center justify-center px-6 md:px-12 py-24 overflow-hidden" id="latencia">
          <canvas ref={radarCanvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-50" id="radar-canvas" />
          <Scene3D className="relative z-10 w-full max-w-[1100px]">
            <div className="text-center flex flex-col items-center">
              <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-[color:var(--lp-muted)]">El tiempo que tarda el sonido en volverse luz</span>
              <div className="flex items-baseline justify-center tracking-[-0.05em] select-none my-3">
                <span ref={latencyCounterRef} className="lp-gradient-text text-[96px] sm:text-[150px] md:text-[210px] lg:text-[250px] leading-none tabular-nums font-medium" id="latency-counter">
                  7.8
                </span>
                <span className="text-3xl sm:text-5xl md:text-7xl text-white/45 font-light ml-2 tracking-tight">ms</span>
              </div>
              <p className="lp-lead text-[14px] sm:text-[15px] max-w-[520px]">
                Medido desde la excitación del transductor hasta el frame desplegado en panel OLED a 120Hz con sincronía por hardware.
              </p>
            </div>
          </Scene3D>
        </section>

        {/* ================= FEATURE 1: CÓNICO ================= */}
        <section className="relative min-h-[100svh] w-full flex items-center justify-center px-6 md:px-16 py-24" id="conico">
          <Scene3D className="w-full max-w-[1240px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-7 flex justify-center">
                <div ref={tiltBoxRef} style={{ transition: 'transform 0.2s ease-out' }} className="lp-glass relative w-full max-w-[560px] overflow-hidden" id="cone-tilt-container">
                  <div className="lp-window-bar">
                    <i />
                    <i />
                    <i />
                    <span>radial-spectrum.live</span>
                  </div>
                  <div className="relative aspect-square p-2">
                    <canvas ref={miniConeCanvasRef} className="w-full h-full block rounded-2xl" id="mini-cone-canvas" />
                    <div className="absolute bottom-4 left-5 font-mono text-[11px] text-[color:var(--lp-muted)]">RADIAL SPECTRUM — 160 BANDS</div>
                    <div className="absolute top-3 right-5 font-mono text-[11px] text-auraCyan">● LIVE</div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col gap-6">
                <SectionLabel index="01">Visualizador cónico</SectionLabel>
                <h2 className="lp-h2 text-4xl sm:text-5xl md:text-[54px] text-white">
                  Forma que sigue
                  <br />
                  <span className="lp-gradient-text">a la frecuencia.</span>
                </h2>
                <p className="lp-lead text-[15px] sm:text-base">
                  Un cono en perspectiva real inclinado 22 grados que organiza el espectro audible en 160 barras continuas. Desde subgraves profundos en la base hasta agudos aireados en la cresta, el volumen se convierte en geometría tridimensional que flota en el espacio.
                </p>
                <dl className="lp-stats mt-2">
                  <div>
                    <dt>Resolución</dt>
                    <dd>160 bandas</dd>
                  </div>
                  <div>
                    <dt>Cadencia</dt>
                    <dd>60 fps</dd>
                  </div>
                  <div>
                    <dt>Ángulo</dt>
                    <dd>22°</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Scene3D>
        </section>

        {/* ================= FEATURE 2: MANOS ================= */}
        <section className="relative min-h-[100svh] w-full flex items-center justify-center px-6 md:px-16 py-24" id="manos">
          <Scene3D className="w-full max-w-[1240px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col gap-6">
                <SectionLabel index="02">Tracking de manos</SectionLabel>
                <h2 className="lp-h2 text-4xl sm:text-5xl md:text-[54px] text-white">
                  Mueve la mano.
                  <br />
                  <span className="lp-gradient-text">Mueve la sala.</span>
                </h2>
                <p className="lp-lead text-[15px] sm:text-base">
                  Control gestual sin latencia gracias a un esqueleto cinemático de 21 puntos clave. Abre la palma para expandir el campo estéreo, cierra los dedos para aplicar filtro pasabajos, o eleva la mano para esculpir la dispersión lumínica en tu entorno escénico.
                </p>
                <dl className="lp-stats mt-2">
                  <div>
                    <dt>Nodos</dt>
                    <dd>21</dd>
                  </div>
                  <div>
                    <dt>Sensor</dt>
                    <dd>30 fps</dd>
                  </div>
                  <div>
                    <dt>Tracking</dt>
                    <dd>&lt; 40 ms</dd>
                  </div>
                </dl>
                <p className="font-mono text-[11.5px] tracking-wider text-[color:var(--lp-muted)]">Impulsado por MediaPipe Vision</p>
              </div>
              <div className="lg:col-span-7 order-1 lg:order-2 flex justify-center">
                <div className="lp-glass relative w-full max-w-[560px] overflow-hidden">
                  <div className="lp-window-bar">
                    <i />
                    <i />
                    <i />
                    <span>hand-tracker.optical</span>
                  </div>
                  <div className="relative aspect-square p-2">
                    <canvas ref={handCanvasRef} className="w-full h-full block rounded-2xl" id="hand-canvas" />
                    <div className="absolute bottom-4 left-5 font-mono text-[11px] text-[color:var(--lp-muted)]">21-POINT SKELETAL RIG</div>
                    <div className="absolute top-3 right-5 font-mono text-[11px] text-auraViolet">● OPTICAL TRACK</div>
                  </div>
                </div>
              </div>
            </div>
          </Scene3D>
        </section>

        {/* ================= FEATURE 3: KAWARP ================= */}
        <section className="relative min-h-[100svh] w-full flex flex-col items-center justify-center px-6 md:px-12 py-24" id="kawarp">
          <Scene3D className="w-full max-w-[1000px]">
            <div className="flex flex-col items-center text-center gap-8">
              <SectionLabel index="03">Kawarp word-sync</SectionLabel>
              <h2 className="lp-h2 text-4xl sm:text-6xl md:text-7xl text-white">
                Cada palabra,
                <br />
                <span className="lp-gradient-text">en su momento exacto.</span>
              </h2>
              <div className="lp-glass lp-glass--tint w-full py-12 sm:py-16 px-6 sm:px-12 flex flex-col items-center justify-center">
                <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-7 gap-y-4 text-2xl sm:text-4xl md:text-5xl font-medium tracking-tight select-none" id="kawarp-lyrics-row">
                  {['el', 'silencio', 'también', 'tiene', 'ritmo'].map((w, i) => (
                    <div key={w} className="flex flex-col items-center gap-3">
                      <span className="sync-word text-white/40" data-idx={i}>{w}</span>
                      <span className="w-1 h-3 rounded-full bg-white/20 sync-bar" />
                    </div>
                  ))}
                </div>
                <div className="w-full max-w-[480px] h-1 bg-white/10 rounded-full mt-10 overflow-hidden relative">
                  <div ref={kawarpProgressFillRef} className="h-full bg-gradient-to-r from-auraCyan to-auraViolet w-0" id="kawarp-progress-fill" />
                </div>
                <div className="flex items-center justify-between w-full max-w-[480px] font-mono text-[11px] text-[color:var(--lp-muted)] mt-3 tabular-nums">
                  <span>120.00 BPM</span>
                  <span ref={bpmPhaseReadoutRef} id="bpm-phase-readout">PASO 01 / 05</span>
                  <span>SYNC LOCK: EXACT</span>
                </div>
              </div>
              <p className="lp-lead text-[15px] sm:text-lg max-w-[640px]">
                Kawarp alinea el texto con el audio a nivel de palabra. No hay desfase. No hay adivinación. Solo timing analítico procesado en búfer circular para directos, visuales escénicos y videoclips generativos.
              </p>
            </div>
          </Scene3D>
        </section>

        {/* ================= ESTUDIO ================= */}
        <section className="relative w-full px-6 md:px-16 py-28" id="estudio">
          <div className="w-full max-w-[1200px] mx-auto">
            <Scene3D intensity={0.6}>
              <div className="flex flex-col gap-5 mb-12 max-w-[760px]">
                <SectionLabel>Estudio</SectionLabel>
                <h2 className="lp-h2 text-4xl sm:text-5xl md:text-6xl text-white">
                  Un estudio completo,
                  <br />
                  <span className="lp-gradient-text">sin instalar nada.</span>
                </h2>
                <p className="lp-lead text-base max-w-[56ch]">Visualiza, mezcla, controla con las manos y publica. Todo corre en el navegador con procesamiento 100% local.</p>
              </div>
            </Scene3D>

            <div className="lp-bento">
              <SpotlightCard tint tilt={3} className="b-7 p-8 md:p-10 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="lp-icon"><Sparkles className="w-5 h-5" aria-hidden="true" /></div>
                  <h3 className="text-2xl md:text-[30px] font-medium tracking-tight text-white mt-6">Visualizadores 3D en tiempo real</h3>
                  <p className="lp-lead text-[15px] mt-3 max-w-[50ch]">Geometrías y shaders que reaccionan al espectro FFT con física de bajos, halos líquidos y cámara reactiva.</p>
                </div>
                <p className="font-mono text-[12px] tracking-wider text-[color:var(--lp-muted)] mt-8">
                  Rainbow Void <span className="mx-2 opacity-40">·</span> Synthwave 3D <span className="mx-2 opacity-40">·</span> Túnel Warp <span className="mx-2 opacity-40">·</span> Terreno 3D
                </p>
              </SpotlightCard>

              <SpotlightCard tilt={3} className="b-5 p-8 md:p-10 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="lp-icon lp-icon--v"><SlidersHorizontal className="w-5 h-5" aria-hidden="true" /></div>
                  <h3 className="text-2xl font-medium tracking-tight text-white mt-6">Ecualizador de 10 bandas</h3>
                  <p className="lp-lead text-[15px] mt-3">Filtros Biquad, curva de respuesta en vivo y 12 presets de estudio.</p>
                </div>
                <div className="flex items-end gap-1.5 h-14 mt-8" aria-hidden="true">
                  {eqHeights.map((h, i) => (
                    <span key={i} className="flex-1 rounded-full bg-gradient-to-t from-[#8b6cff] to-[#00e5ff] opacity-80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </SpotlightCard>
            </div>

            <div className="lp-features mt-12">
              {[
                { icon: <Palette className="w-5 h-5" aria-hidden="true" />, t: 'Modo Lúcido', d: '10 temas neón que tiñen toda la interfaz.' },
                { icon: <AlignLeft className="w-5 h-5" aria-hidden="true" />, t: 'Letras sincronizadas', d: 'Motor LRC con resaltado rítmico y karaoke.' },
                { icon: <ImageIcon className="w-5 h-5" aria-hidden="true" />, t: 'Wallpaper Studio', d: 'Fondos 4K, tus fotos, IA y atmósferas 3D.' },
                { icon: <Layers className="w-5 h-5" aria-hidden="true" />, t: 'Social Studio', d: 'Clips 9:16 y Story Cards HD para redes.' },
              ].map((f, i) => (
                <div key={f.t} className="lp-feature">
                  <div className={`lp-icon ${i % 2 ? 'lp-icon--v' : ''}`}>{f.icon}</div>
                  <h4 className="text-[17px] font-medium tracking-tight text-white mt-5">{f.t}</h4>
                  <p className="text-[14px] leading-relaxed text-[color:var(--lp-text)] mt-2 max-w-[28ch]">{f.d}</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[12px] tracking-wider text-[color:var(--lp-muted)] mt-8">
              FUENTES <span className="mx-3 opacity-40">/</span> Archivos locales · Micrófono · Audio del sistema · Spotify · YouTube · Radio 24/7
            </p>
          </div>
        </section>

        {/* ================= ESPECIFICACIONES ================= */}
        <section className="relative w-full px-6 md:px-16 py-28" id="especificaciones">
          <div className="w-full max-w-[1200px] mx-auto">
            <Scene3D intensity={0.6}>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div className="flex flex-col gap-4">
                  <SectionLabel>Ficha de ingeniería</SectionLabel>
                  <h2 className="lp-h2 text-4xl sm:text-5xl text-white">Especificaciones técnicas</h2>
                </div>
                <div className="font-mono text-[12px] tracking-wider text-auraCyan tabular-nums">MOTOR V3.4.2 — ARQUITECTURA SÍNCRONA</div>
              </div>
              <div ref={specsGridRef} id="specs-grid-parent">
                {[
                  { k: 'Entrada', v: '48 kHz', t: '48', d: 'Sample rate nativo, sin resampleo ni conversión destructiva.', c: false },
                  { k: 'Buffer', v: '128', t: '128', d: 'Ventana de análisis ultra corta en muestras síncronas.', c: false },
                  { k: 'Latencia', v: '7.8 ms', t: '7.8', d: 'Round-trip analógico/digital de captura hasta render visual.', c: true },
                  { k: 'Bandas', v: '160', t: '160', d: 'Barras del espectro cónico distribuidas logarítmicamente.', c: false },
                  { k: 'Frame rate', v: '60 fps', t: '60', d: 'Render por GPU acelerado, vsync-locked y libre de tearing.', c: false },
                  { k: 'Salida', v: 'Estéreo', t: '', d: 'Canales independientes con rango dinámico de 32 bits flotante.', c: false },
                ].map((s) => (
                  <div key={s.k} className="lp-spec">
                    <span className="font-mono text-[12px] tracking-[0.12em] uppercase text-[color:var(--lp-muted)]">{s.k}</span>
                    <span className={`text-3xl sm:text-4xl font-medium tracking-tight tabular-nums ${s.c ? 'text-auraCyan' : 'text-white'}`} {...(s.t ? { 'data-target': s.t } : {})}>
                      {s.v}
                    </span>
                    <span className="text-[14px] leading-relaxed text-[color:var(--lp-text)]">{s.d}</span>
                  </div>
                ))}
              </div>
            </Scene3D>
          </div>
        </section>

        {/* ================= CTA FINAL ================= */}
        <section className="relative min-h-[80svh] w-full flex flex-col justify-between overflow-hidden" id="descargar">
          <canvas ref={footerCanvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-30" id="footer-ambient-canvas" />
          <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
            <Scene3D className="w-full max-w-[980px]" intensity={0.8}>
              <div className="lp-glass lp-glass--tint text-center flex flex-col items-center px-6 sm:px-14 py-16 sm:py-24">
                <h2 className="lp-h1 text-5xl sm:text-7xl md:text-8xl text-white">
                  Enciende
                  <br />
                  <span className="lp-gradient-text">el motor.</span>
                </h2>
                <p className="lp-lead text-base sm:text-lg mt-6 max-w-[500px]">Inicia Aura3D y empieza a hacer visible lo que ya estás escuchando.</p>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-9">
                  <button type="button" onClick={handleEnter} className="lp-btn lp-btn--primary lp-btn--lg">
                    Iniciar Aura3D
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <a href="#especificaciones" onClick={(e) => handleSmoothScroll(e, 'especificaciones')} className="lp-btn lp-btn--lg">
                    Ver especificaciones
                  </a>
                </div>
                <p className="font-mono text-[12px] tracking-wider text-[color:var(--lp-muted)] mt-7">Corre en tu navegador · Sin instalación · Procesamiento local</p>
              </div>
            </Scene3D>
          </div>

          <footer className="relative z-10 w-full px-6 md:px-16 pb-8">
            <div className="max-w-[1200px] mx-auto pt-6 border-t border-[color:var(--lp-line)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[color:var(--lp-muted)]">
              <span>Aura3D © 2026</span>
              <div className="flex items-center gap-5">
                <a className="hover:text-white transition-colors no-underline" href="#">Privacidad</a>
                <a className="hover:text-white transition-colors no-underline" href="#">Términos</a>
                <a className="hover:text-white transition-colors no-underline" href="#">Contacto</a>
              </div>
              {systemReducedMotion() ? (
                <button
                  type="button"
                  className="lp-motion-toggle"
                  onClick={() => {
                    setForceMotion(!motionForced());
                    window.location.reload();
                  }}
                >
                  {motionForced() ? 'Reducir animaciones' : 'Efectos reducidos por tu sistema · Activar animaciones'}
                </button>
              ) : (
                <span>Hecho para quien escucha</span>
              )}
            </div>
          </footer>
        </section>
      </main>

      {/* Transición: fade a negro al entrar al motor 3D */}
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
