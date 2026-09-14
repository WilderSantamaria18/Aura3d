import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { Trophy, Flame, Zap, X, RotateCcw, Volume2 } from 'lucide-react';

interface BeatTapGameProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HitEffect {
  id: number;
  text: string;
  color: string;
  points: number;
}

interface TargetBeat {
  id: number;
  spawnTime: number;
  targetTime: number;
  hit: boolean;
}

const STORAGE_KEY_BEAT_TAP_HIGH = 'auralis_beat_tap_high_score';

export const BeatTapGame: React.FC<BeatTapGameProps> = ({ isOpen, onClose }) => {
  const { isBeat, beatPulse, mood } = useAIAudioEngine();
  const { isPlaying, isLucid, lucidTheme, bpm } = usePlayerStore();

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BEAT_TAP_HIGH);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [isTargetActive, setIsTargetActive] = useState(false);

  // Active incoming beats
  const beatsRef = useRef<TargetBeat[]>([]);
  const nextBeatIdRef = useRef(1);
  const lastBeatSpawnRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Spawn Incoming Target Ring on Audio Beat ─────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const now = performance.now();
    // Throttle spawns to prevent over-crowding rings (min 220ms cooldown ≈ 270 BPM max)
    if (isBeat && now - lastBeatSpawnRef.current >= 220) {
      lastBeatSpawnRef.current = now;
      const travelDuration = 700; // 700ms from outer edge to center target
      beatsRef.current.push({
        id: nextBeatIdRef.current++,
        spawnTime: now,
        targetTime: now + travelDuration,
        hit: false,
      });
    }
  }, [isBeat, isOpen, isPlaying]);

  // ── Multiplier Calculation ──────────────────────────────────────────────────
  const multiplier = combo >= 50 ? 8 : combo >= 25 ? 4 : combo >= 10 ? 2 : 1;

  // ── Trigger Hit Rating ──────────────────────────────────────────────────────
  const triggerHit = useCallback(
    (rating: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS', basePoints: number) => {
      const points = basePoints * multiplier;

      let color = '#00f2fe';
      if (rating === 'PERFECT') color = '#39ff14';
      else if (rating === 'GREAT') color = '#00f2fe';
      else if (rating === 'GOOD') color = '#ffd700';
      else color = '#ff0055';

      const effectId = Date.now() + Math.random();
      setHitEffects((prev) => [
        ...prev.slice(-3),
        { id: effectId, text: rating, color, points },
      ]);

      setTimeout(() => {
        setHitEffects((prev) => prev.filter((e) => e.id !== effectId));
      }, 700);

      if (rating === 'MISS') {
        setCombo(0);
      } else {
        setCombo((c) => {
          const next = c + 1;
          setMaxCombo((mc) => Math.max(mc, next));
          return next;
        });
        setScore((s) => {
          const next = s + points;
          if (next > highScore) {
            setHighScore(next);
            try {
              localStorage.setItem(STORAGE_KEY_BEAT_TAP_HIGH, next.toString());
            } catch {
              // ignore
            }
          }
          return next;
        });
      }
    },
    [multiplier, highScore]
  );

  // ── User Tap / Spacebar Action ──────────────────────────────────────────────
  const handleTap = useCallback(() => {
    setIsTargetActive(true);
    setTimeout(() => setIsTargetActive(false), 100);

    const now = performance.now();
    const beats = beatsRef.current;

    // Find the closest incoming beat to the center target time
    let closestBeat: TargetBeat | null = null;
    let minDelta = Infinity;

    for (let i = 0; i < beats.length; i++) {
      const b = beats[i];
      if (b.hit) continue;
      const delta = Math.abs(now - b.targetTime);
      if (delta < minDelta) {
        minDelta = delta;
        closestBeat = b;
      }
    }

    if (closestBeat && minDelta <= 180) {
      closestBeat.hit = true;
      if (minDelta <= 45) {
        triggerHit('PERFECT', 100);
      } else if (minDelta <= 95) {
        triggerHit('GREAT', 50);
      } else {
        triggerHit('GOOD', 25);
      }
    } else {
      // Tapped completely out of rhythm
      triggerHit('MISS', 0);
    }
  }, [triggerHit]);

  // Keyboard Spacebar / Enter Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') {
        e.preventDefault();
        handleTap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleTap]);

  // ── Canvas Animation Loop for Inward Converging Rings ───────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = (canvas.width = canvas.clientWidth);
      const height = (canvas.height = canvas.clientHeight);
      const centerX = width / 2;
      const centerY = height / 2;
      const targetRadius = 42;
      const spawnRadius = Math.min(width, height) * 0.45;

      ctx.clearRect(0, 0, width, height);

      const now = performance.now();
      const beats = beatsRef.current;

      // Draw Center Target Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isTargetActive ? '#ffffff' : 'rgba(0, 242, 254, 0.45)';
      ctx.lineWidth = isTargetActive ? 4 : 2;
      ctx.stroke();

      // Outer guide ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, spawnRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and draw each incoming contracting ring
      for (let i = beats.length - 1; i >= 0; i--) {
        const beat = beats[i];
        const progress = (now - beat.spawnTime) / (beat.targetTime - beat.spawnTime);

        // If ring exceeded target threshold without hit -> MISS
        if (!beat.hit && now > beat.targetTime + 160) {
          beat.hit = true;
          triggerHit('MISS', 0);
        }

        // Remove old beats
        if (progress > 1.25 || beat.hit) {
          beats.splice(i, 1);
          continue;
        }

        const currentRadius = spawnRadius - (spawnRadius - targetRadius) * progress;

        if (currentRadius > 0) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
          const alpha = Math.min(1, Math.max(0.1, progress * 1.2));
          ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = progress > 0.8 ? 12 : 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isTargetActive, triggerHit]);

  if (!isOpen) return null;

  const activeColor = isLucid ? lucidTheme.primary : '#00f2fe';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto select-none animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#070a16]/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col p-5 font-mono"
        style={{ borderColor: `${activeColor}40` }}
      >
        {/* Glow Header */}
        <div
          className="absolute -top-20 -left-20 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-30"
          style={{ backgroundColor: activeColor }}
        />

        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider text-white">
              BEAT TAP CHALLENGE
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar minijuego"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Multiplier HUD */}
        <div className="grid grid-cols-3 gap-2 my-3 relative z-10 text-center">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] text-white/40 uppercase">Puntos</span>
            <div className="text-xl font-bold text-white tabular-nums">{score}</div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] text-white/40 uppercase">Combo</span>
            <div
              className={`text-xl font-bold tabular-nums transition-transform ${
                combo > 0 ? 'text-amber-400 scale-105' : 'text-white/40'
              }`}
            >
              x{combo}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] text-white/40 uppercase">Multiplicador</span>
            <div className="text-xl font-bold text-cyan-300 tabular-nums">{multiplier}X</div>
          </div>
        </div>

        {/* Game Arena / Canvas */}
        <div
          onClick={handleTap}
          className="relative w-full h-64 sm:h-72 rounded-2xl bg-black/40 border border-white/10 cursor-pointer overflow-hidden flex items-center justify-center group active:scale-[0.99] transition-transform"
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Central Target Button Indicator */}
          <div
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-100 relative z-10 pointer-events-none ${
              isTargetActive
                ? 'scale-110 bg-cyan-500/30 border-2 border-white'
                : 'bg-white/5 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,242,254,0.25)]'
            }`}
            style={{
              transform: `scale(${1.0 + beatPulse * 0.12})`,
            }}
          >
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] font-bold text-white/80 mt-0.5 uppercase tracking-wider">
              ¡PULSA!
            </span>
          </div>

          {/* Floating Rating Effects */}
          <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none gap-1 z-20">
            {hitEffects.map((eff) => (
              <div
                key={eff.id}
                className="animate-in fade-in zoom-in-75 slide-in-from-bottom-2 duration-150 flex items-center gap-1 font-bold text-sm tracking-wider drop-shadow-md"
                style={{ color: eff.color }}
              >
                <span>{eff.text}</span>
                {eff.points > 0 && <span className="text-xs">+{eff.points}</span>}
              </div>
            ))}
          </div>

          {/* Prompt banner if song paused */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-30">
              <Volume2 className="w-8 h-8 text-cyan-400 mb-2 animate-pulse" />
              <span className="text-xs text-white/90 font-bold">
                Reproduce música para activar los beats
              </span>
              <span className="text-[10px] text-white/40 mt-1">
                Los anillos convergen al compás del bombo y el ritmo
              </span>
            </div>
          )}
        </div>

        {/* Footer controls & high score */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.08] text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Récord:</span>
            <span className="text-white font-bold tabular-nums">{highScore}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 hidden sm:inline">
              Usa [ESPACIO] o toca el círculo
            </span>
            <button
              onClick={() => {
                setScore(0);
                setCombo(0);
                beatsRef.current = [];
              }}
              className="flex items-center gap-1 p-1 text-white/40 hover:text-white transition-colors"
              title="Reiniciar partida"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeatTapGame;
