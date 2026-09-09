import React, { useState, useDeferredValue } from 'react';
import { useGamification } from '../../hooks/useGamification';
import { usePlayerStore } from '../../stores/playerStore';
import {
  Trophy,
  Flame,
  Clock,
  Zap,
  Music,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';

export const GamificationHUD: React.FC = () => {
  const { gameState, genrePrediction } = useGamification();
  const { totalListeningTime, isLucid, lucidTheme, hasStarted } = usePlayerStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Layer 4 UI optimization: useDeferredValue prevents React updates from blocking main thread / 60 FPS
  const deferredScore = useDeferredValue(gameState.score);
  const deferredRank = useDeferredValue(gameState.rank);
  const deferredGenre = useDeferredValue(genrePrediction.genre);

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
    <div className="fixed top-24 sm:top-24 right-3 sm:right-6 z-30 select-none pointer-events-auto font-mono">
      {/* ── Compact Floating Telemetry Badge ── */}
      <div
        className={`transition-all duration-300 rounded-xl overflow-hidden backdrop-blur-xl border ${
          isLucid
            ? 'lucid-panel'
            : 'bg-[#070a14]/92 border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.65)]'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: lucidTheme.glassColor,
                borderColor: lucidTheme.borderColor,
                boxShadow: `0 12px 32px rgba(0,0,0,0.65), 0 0 20px ${lucidTheme.glow}`,
              }
            : undefined
        }
      >
        {/* Top Header / Compact Pill Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/[0.04] transition-colors"
          title="Telemetría de Intensidad y Score en Vivo"
        >
          {/* Live Intensity Score & Tier */}
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider leading-none"
              style={{
                backgroundColor: `${deferredRank.color}20`,
                color: deferredRank.color,
                border: `1px solid ${deferredRank.color}45`,
              }}
            >
              {deferredRank.tier}
            </span>

            <div className="flex items-baseline gap-1">
              <span className="text-[9px] text-white/40 uppercase tracking-widest leading-none font-semibold">
                SCORE
              </span>
              <span
                className="text-xs font-bold leading-none tracking-tight tabular-nums"
                style={{ color: isLucid ? lucidTheme.primary : scoreColor }}
              >
                {deferredScore}
              </span>
              <span className="text-[9px] text-white/30">/100</span>
            </div>
          </div>

          {/* Activity Dot & Expand Chevron */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/[0.08]">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isLucid ? lucidTheme.primary : scoreColor,
                opacity: 0.85,
              }}
            />
            <button className="text-white/40 hover:text-white transition-colors p-0.5" aria-label="Expandir estadísticas">
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Expanded Full Statistics Panel (Studio Precision Layout) ── */}
        {isExpanded && (
          <div className="p-3 border-t border-white/[0.06] space-y-2.5 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] animate-in fade-in zoom-in-95 duration-200 text-xs">
            {/* Intensity Progress Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/70 flex items-center gap-1.5 font-medium">
                  <Activity className="w-3 h-3 text-white/50" />
                  {deferredRank.title}
                </span>
                <span className="font-semibold flex items-center gap-1 text-white/60 tabular-nums">
                  <Flame className="w-3 h-3 text-white/40" />
                  {gameState.combo.toFixed(1)}x COMBO
                </span>
              </div>
              <div className="h-1 w-full bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${deferredScore}%`,
                    backgroundColor: isLucid ? lucidTheme.primary : scoreColor,
                  }}
                />
              </div>
            </div>

            {/* Studio Metrics Grid (Clean divider layout without nested card slop) */}
            <div className="grid grid-cols-2 gap-px bg-white/[0.06] rounded-lg overflow-hidden border border-white/[0.06] text-[10px]">
              {/* High Score */}
              <div className="p-2 bg-[#0a0d18] flex flex-col gap-0.5">
                <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                  <Trophy className="w-3 h-3 text-white/50" /> Récord
                </span>
                <span className="text-white font-semibold text-xs tabular-nums">
                  {gameState.highScore}{' '}
                  <span className="text-[9px] text-white/40 font-normal">
                    (Max {gameState.allTimeHighScore})
                  </span>
                </span>
              </div>

              {/* Total Listening Time */}
              <div className="p-2 bg-[#0a0d18] flex flex-col gap-0.5">
                <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-white/50" /> Tiempo
                </span>
                <span className="text-white font-semibold text-xs tabular-nums">
                  {formatTime(totalListeningTime)}
                </span>
              </div>

              {/* Estimated Calories */}
              <div className="p-2 bg-[#0a0d18] flex flex-col gap-0.5">
                <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                  <Flame className="w-3 h-3 text-white/50" /> Calorías
                </span>
                <span className="text-white font-semibold text-xs tabular-nums">
                  {gameState.estimatedCalories} kcal
                </span>
              </div>

              {/* ML Genre Classifier */}
              <div className="p-2 bg-[#0a0d18] flex flex-col gap-0.5">
                <span className="text-white/40 flex items-center gap-1 text-[9px] uppercase tracking-wider">
                  <Music className="w-3 h-3 text-white/50" /> Género ML
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
    </div>
  );
};

export default GamificationHUD;
