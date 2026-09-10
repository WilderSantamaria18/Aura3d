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

export const GamificationHUD: React.FC = () => {
  const { gameState, genrePrediction } = useGamification();
  const { totalListeningTime, isLucid, lucidTheme, hasStarted } = usePlayerStore();
  const [isExpanded, setIsExpanded] = useState(false);
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
      ? '#ff088a'
      : deferredScore >= 60
      ? '#00f2fe'
      : deferredScore >= 40
      ? '#00ffb3'
      : deferredScore >= 20
      ? '#ffd700'
      : '#8a99ad';

  return (
    <div ref={containerRef} className="relative select-none font-mono">
      {/* ── Compact HeaderBar Pill Button ── */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${
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
      >
        {/* Tier rank badge (S, A, B, C...) */}
        <span
          className="px-1 py-0.2 rounded text-[9px] font-bold tracking-wider leading-none"
          style={{
            backgroundColor: `${deferredRank.color}25`,
            color: deferredRank.color,
            border: `1px solid ${deferredRank.color}50`,
          }}
        >
          {deferredRank.tier}
        </span>

        {/* Numerical Score */}
        <div className="flex items-baseline gap-0.5">
          <span className="text-[9px] text-white/40 uppercase tracking-widest leading-none font-semibold">
            SCORE
          </span>
          <span
            className="text-xs font-bold leading-none tracking-tight tabular-nums"
            style={{ color: isLucid ? lucidTheme.primary : scoreColor }}
          >
            {deferredScore}
          </span>
        </div>

        {/* Live Metronome Activity Indicator */}
        <span
          className="w-1.5 h-1.5 rounded-full transition-all"
          style={{
            backgroundColor: isLucid ? lucidTheme.primary : scoreColor,
            boxShadow: `0 0 6px ${isLucid ? lucidTheme.primary : scoreColor}`,
          }}
        />
      </button>

      {/* ── Dropdown Statistics Panel (Anchored cleanly below HeaderBar) ── */}
      {isExpanded && (
        <div
          className={`absolute top-full mt-2.5 right-0 z-50 p-3 rounded-xl backdrop-blur-2xl border space-y-2.5 w-64 sm:w-72 shadow-[0_16px_40px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-150 text-xs ${
            isLucid ? 'lucid-panel' : 'bg-[#070a14]/95 border-white/[0.08]'
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
            <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              TELEMETRÍA EN VIVO
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
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
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/70 flex items-center gap-1.5 font-medium">
                {deferredRank.title}
              </span>
              <span className="font-semibold flex items-center gap-1 text-white/60 tabular-nums">
                <Flame className="w-3 h-3 text-amber-400" />
                {gameState.combo.toFixed(1)}x COMBO
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${deferredScore}%`,
                  backgroundColor: isLucid ? lucidTheme.primary : scoreColor,
                }}
              />
            </div>
          </div>

          {/* Studio Metrics Grid */}
          <div className="grid grid-cols-2 gap-px bg-white/[0.06] rounded-lg overflow-hidden border border-white/[0.06] text-[10px]">
            {/* High Score */}
            <div className="p-2 bg-[#090d18] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                <Trophy className="w-3 h-3 text-amber-400" /> Récord
              </span>
              <span className="text-white font-semibold text-xs tabular-nums">
                {gameState.highScore}{' '}
                <span className="text-[9px] text-white/40 font-normal">
                  (Max {gameState.allTimeHighScore})
                </span>
              </span>
            </div>

            {/* Total Listening Time */}
            <div className="p-2 bg-[#090d18] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                <Clock className="w-3 h-3 text-cyan-400" /> Tiempo
              </span>
              <span className="text-white font-semibold text-xs tabular-nums">
                {formatTime(totalListeningTime)}
              </span>
            </div>

            {/* Estimated Calories */}
            <div className="p-2 bg-[#090d18] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                <Flame className="w-3 h-3 text-rose-400" /> Calorías
              </span>
              <span className="text-white font-semibold text-xs tabular-nums">
                {gameState.estimatedCalories} kcal
              </span>
            </div>

            {/* ML Genre Classifier */}
            <div className="p-2 bg-[#090d18] flex flex-col gap-0.5">
              <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                <Music className="w-3 h-3 text-purple-400" /> Género ML
              </span>
              <span
                className="font-semibold text-[11px] truncate text-white"
                title={`${deferredGenre} (${Math.round(genrePrediction.confidence * 100)}% conf)`}
              >
                {deferredGenre}
              </span>
            </div>
          </div>

          {/* Dynamic Status Feedback */}
          <div className="pt-1 flex items-center justify-between text-[9px] border-t border-white/[0.06]">
            <span className="text-white/40 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-white/40" /> Estado:
            </span>
            <span
              className="font-semibold tracking-wider"
              style={{
                color: gameState.isHyperActive
                  ? isLucid
                    ? lucidTheme.primary
                    : '#00f2fe'
                  : gameState.isIdle
                  ? '#8a99ad'
                  : '#ffffff',
              }}
            >
              {gameState.isHyperActive
                ? '⚡ MODO LÚCIDO BOOST'
                : gameState.isIdle
                ? '🌙 MODO AHORRO'
                : '✨ EN RITMO'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationHUD;
