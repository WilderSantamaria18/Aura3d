import React, { useState, useDeferredValue, useRef, useEffect } from 'react';
import { useGamification } from '../../hooks/useGamification';
import { usePlayerStore } from '../../stores/playerStore';
import {
  Trophy,
  Flame,
  Clock,
  Zap,
  Music,
  Activity,
} from 'lucide-react';
import { BeatTapGame } from './BeatTapGame';

export const GamificationHUD: React.FC = () => {
  const { gameState, genrePrediction } = useGamification();
  const { totalListeningTime, isLucid, lucidTheme, hasStarted } = usePlayerStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBeatTapOpen, setIsBeatTapOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layer 4 UI optimization: useDeferredValue prevents React updates from blocking main thread / 60 FPS
  const deferredScore = useDeferredValue(gameState.score);
  const deferredRank = useDeferredValue(gameState.rank);
  const deferredGenre = useDeferredValue(genrePrediction.genre);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  if (!hasStarted) return null;

  // Format seconds to hh:mm:ss or mm:ss
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const scoreColor =
    deferredScore >= 80
      ? 'var(--ios-pink)'
      : deferredScore >= 60
      ? 'var(--ios-teal)'
      : deferredScore >= 40
      ? 'var(--status-success)'
      : deferredScore >= 20
      ? 'var(--status-warning)'
      : 'var(--label-muted)';

  return (
    <div ref={containerRef} className="relative select-none font-mono">
      {/* ── Compact HeaderBar Pill Button ── */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`min-h-11 flex items-center gap-1.5 px-3 py-1 rounded-control border transition-all duration-150 cursor-pointer ${
          isExpanded
            ? 'bg-white/10 border-white/25 shadow-sm'
            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white/90'
        }`}
        style={
          isLucid
            ? {
                borderColor: `${lucidTheme.primary}40`,
                boxShadow: isExpanded ? `0 0 12px ${lucidTheme.glow}` : 'none',
              }
            : undefined
        }
        title="Telemetría de Intensidad y Score en Vivo (Clic para estadísticas)"
        aria-expanded={isExpanded}
        aria-label="Telemetría de Intensidad y Score en Vivo"
      >
        {/* Tier rank badge (S, A, B, C...) */}
        <span
          className="px-1.5 py-0.5 rounded-badge text-caption font-bold tracking-wider leading-none"
          style={{
            backgroundColor: `${deferredRank.color}25`,
            color: deferredRank.color,
            border: `1px solid ${deferredRank.color}50`,
          }}
        >
          {deferredRank.tier}
        </span>

        {/* Numerical Score */}
        <div className="flex items-baseline gap-1">
          <span className="text-caption text-white/40 uppercase tracking-widest leading-none font-semibold">
            SCORE
          </span>
          <span
            className="text-caption font-bold leading-none tracking-tight font-tabular"
            style={{ color: isLucid ? lucidTheme.primary : scoreColor }}
          >
            {deferredScore}
          </span>
        </div>

        {/* Live Metronome Activity Indicator */}
        <span
          className="w-1.5 h-1.5 rounded-pill transition-all"
          style={{
            backgroundColor: isLucid ? lucidTheme.primary : scoreColor,
            boxShadow: `0 0 6px ${isLucid ? lucidTheme.primary : scoreColor}`,
          }}
        />
      </button>

      {/* ── Dropdown Statistics Panel (Anchored cleanly below HeaderBar) ── */}
      {isExpanded && (
        <div
          className={`absolute top-full mt-2.5 right-0 z-50 p-3.5 rounded-modal material-thick border space-y-3 w-64 sm:w-72 shadow-[0_16px_40px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-150 text-caption ${
            isLucid ? 'lucid-panel' : 'bg-[var(--surface-overlay)]/95 border-white/[0.08]'
          }`}
          style={
            isLucid
              ? {
                  backgroundColor: lucidTheme.glassColor || 'rgba(7, 10, 20, 0.95)',
                  borderColor: `${lucidTheme.primary}45`,
                  boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 25px ${lucidTheme.glow}`,
                }
              : undefined
          }
        >
          {/* Header Title inside Dropdown */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <span className="text-caption font-mono tracking-widest text-white/70 uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              TELEMETRÍA EN VIVO
            </span>
            <span
              className="text-caption font-bold px-2 py-0.5 rounded-badge leading-none"
              style={{
                backgroundColor: `${deferredRank.color}25`,
                color: deferredRank.color,
                border: `1px solid ${deferredRank.color}50`,
              }}
            >
              RANGO {deferredRank.tier}
            </span>
          </div>

          {/* Intensity Progress Meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-caption">
              <span className="text-white/70 flex items-center gap-1.5 font-medium">
                {deferredRank.title}
              </span>
              <span className="font-semibold flex items-center gap-1 text-white/60 font-tabular">
                <Flame className="w-3 h-3 text-amber-400" />
                {gameState.combo.toFixed(1)}x COMBO
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.08] rounded-pill overflow-hidden">
              <div
                className="h-full rounded-pill transition-all duration-300"
                style={{
                  width: `${deferredScore}%`,
                  backgroundColor: isLucid ? lucidTheme.primary : scoreColor,
                }}
              />
            </div>
          </div>

          {/* Studio Metrics Grid */}
          <div className="grid grid-cols-2 gap-px bg-white/[0.06] rounded-control overflow-hidden border border-white/[0.06] text-caption">
            {/* High Score */}
            <div className="p-2.5 bg-[var(--surface-card)] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-caption uppercase tracking-wider">
                <Trophy className="w-3 h-3 text-amber-400" /> Récord
              </span>
              <span className="text-white font-semibold text-caption font-tabular">
                {gameState.highScore}{' '}
                <span className="text-caption text-white/40 font-normal">
                  (Max {gameState.allTimeHighScore})
                </span>
              </span>
            </div>

            {/* Total Listening Time */}
            <div className="p-2.5 bg-[var(--surface-card)] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-caption uppercase tracking-wider">
                <Clock className="w-3 h-3 text-cyan-400" /> Tiempo
              </span>
              <span className="text-white font-semibold text-caption font-tabular">
                {formatTime(totalListeningTime)}
              </span>
            </div>

            {/* Estimated Calories */}
            <div className="p-2.5 bg-[var(--surface-card)] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-caption uppercase tracking-wider">
                <Flame className="w-3 h-3 text-rose-400" /> Calorías
              </span>
              <span className="text-white font-semibold text-caption font-tabular">
                {gameState.estimatedCalories} kcal
              </span>
            </div>

            {/* ML Genre Classifier */}
            <div className="p-2.5 bg-[var(--surface-card)] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-caption uppercase tracking-wider">
                <Music className="w-3 h-3 text-purple-400" /> Género ML
              </span>
              <span
                className="font-semibold text-caption truncate text-white"
                title={`${deferredGenre} (${Math.round(genrePrediction.confidence * 100)}% conf)`}
              >
                {deferredGenre}
              </span>
            </div>
          </div>

          {/* Launch Beat Tap Game Mode Button */}
          <button
            onClick={() => {
              setIsExpanded(false);
              setIsBeatTapOpen(true);
            }}
            className="min-h-11 w-full py-2.5 px-3 rounded-control bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 text-white font-bold text-caption flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md group cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>MODO BEAT TAP (JUGAR)</span>
          </button>

          {/* Dynamic Status Feedback */}
          <div className="pt-1 flex items-center justify-between text-caption border-t border-white/[0.06]">
            <span className="text-white/40 flex items-center gap-1">
              <Zap className="w-3 h-3 text-white/40" /> Estado:
            </span>
            <span
              className="font-semibold tracking-wider flex items-center gap-1"
              style={{
                color: gameState.isHyperActive
                  ? isLucid
                    ? lucidTheme.primary
                    : 'var(--ios-teal)'
                  : gameState.isIdle
                  ? 'var(--label-muted)'
                  : 'var(--label-primary)',
              }}
            >
              {gameState.isHyperActive ? (
                <>
                  <Zap className="w-3 h-3 text-cyan-400" /> MODO LÚCIDO BOOST
                </>
              ) : gameState.isIdle ? (
                <>
                  <Clock className="w-3 h-3 text-yellow-300" /> MODO AHORRO
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3 text-emerald-400" /> EN RITMO
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Beat Tap Interactive Game Modal */}
      <BeatTapGame
        isOpen={isBeatTapOpen}
        onClose={() => setIsBeatTapOpen(false)}
      />
    </div>
  );
};

export default GamificationHUD;
