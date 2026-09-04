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
      ? '#39FF14'
      : deferredScore >= 20
      ? '#FFD700'
      : '#8A99AD';

  return (
    <div className="fixed top-16 sm:top-20 left-3 sm:left-6 z-40 select-none pointer-events-auto font-mono">
      {/* ── Compact Floating Badge (Always Visible) ── */}
      <div
        className={`transition-all duration-500 rounded-2xl overflow-hidden backdrop-blur-2xl border ${
          isLucid
            ? 'bg-[#060a17]/90 border-emerald-400/50 shadow-[0_0_25px_rgba(57,255,20,0.25)]'
            : 'bg-[#090e1c]/90 border-white/15 shadow-[0_0_25px_rgba(0,0,0,0.8)]'
        }`}
        style={{
          boxShadow:
            gameState.score > 70
              ? `0 0 30px ${scoreColor}55, 0 10px 30px rgba(0,0,0,0.8)`
              : undefined,
        }}
      >
        {/* Top Header / Mini Pill */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/5 transition-all"
        >
          {/* Live Intensity Gauge Pill */}
          <div className="flex items-center gap-2">
            <span className="text-base">{deferredRank.badge}</span>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/50 uppercase tracking-widest leading-none font-bold">
                SCORE
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className="text-sm font-bold leading-none tracking-tight"
                  style={{ color: scoreColor }}
                >
                  {deferredScore}
                </span>
                <span className="text-[9px] text-white/40">/100</span>
              </div>
            </div>
          </div>

          {/* Rank Badge & Expand Chevron */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10">
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
              style={{
                backgroundColor: `${deferredRank.color}22`,
                color: deferredRank.color,
                border: `1px solid ${deferredRank.color}55`,
              }}
            >
              {deferredRank.tier}
            </span>
            <button className="text-white/50 hover:text-white transition-colors p-0.5">
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Expanded Full Statistics & ML Panel ── */}
        {isExpanded && (
          <div className="p-3 border-t border-white/10 space-y-2.5 w-64 sm:w-72 animate-in fade-in zoom-in-95 duration-200 text-xs">
            {/* Intensity Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/60 flex items-center gap-1 font-bold">
                  <Activity className="w-3 h-3" style={{ color: scoreColor }} />
                  {deferredRank.title}
                </span>
                <span className="font-bold flex items-center gap-1 text-pink-400">
                  <Flame className="w-3 h-3" />
                  {gameState.combo.toFixed(1)}x COMBO
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${deferredScore}%`,
                    background: `linear-gradient(90deg, #00f2fe, ${scoreColor})`,
                    boxShadow: `0 0 10px ${scoreColor}`,
                  }}
                />
              </div>
            </div>

            {/* Stats Grid: High Score, Total Time, Calories, Genre */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {/* High Score */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-0.5">
                <span className="text-white/50 flex items-center gap-1 text-[9px]">
                  <Trophy className="w-3 h-3 text-yellow-400" /> RÉCORD
                </span>
                <span className="text-white font-bold text-xs">
                  {gameState.highScore}{' '}
                  <span className="text-[9px] text-white/40 font-normal">
                    (Max {gameState.allTimeHighScore})
                  </span>
                </span>
              </div>

              {/* Total Listening Time */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-0.5">
                <span className="text-white/50 flex items-center gap-1 text-[9px]">
                  <Clock className="w-3 h-3 text-cyan-400" /> TIEMPO TOTAL
                </span>
                <span className="text-cyan-200 font-bold text-xs">
                  {formatTime(totalListeningTime)}
                </span>
              </div>

              {/* Estimated Calories */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-0.5">
                <span className="text-white/50 flex items-center gap-1 text-[9px]">
                  <Flame className="w-3 h-3 text-pink-400" /> CALORÍAS
                </span>
                <span className="text-pink-300 font-bold text-xs">
                  {gameState.estimatedCalories} kcal
                </span>
              </div>

              {/* ML Genre Classifier */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-0.5">
                <span className="text-white/50 flex items-center gap-1 text-[9px]">
                  <Music className="w-3 h-3" style={{ color: genrePrediction.color }} /> GÉNERO ML
                </span>
                <span
                  className="font-bold text-[11px] truncate"
                  style={{ color: genrePrediction.color }}
                  title={`${deferredGenre} (${Math.round(genrePrediction.confidence * 100)}% conf)`}
                >
                  {deferredGenre}
                </span>
              </div>
            </div>

            {/* Dynamic Status Feedback */}
            <div className="pt-1 flex items-center justify-between text-[9px] border-t border-white/5">
              <span className="text-white/40 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-yellow-400" /> Estado:
              </span>
              <span
                className="font-bold tracking-wider"
                style={{
                  color: gameState.isHyperActive
                    ? isLucid
                      ? lucidTheme.primary
                      : '#ff088a'
                    : gameState.isIdle
                    ? '#8A99AD'
                    : '#00f2fe',
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
