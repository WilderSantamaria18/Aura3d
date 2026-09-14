import React, { useState, useEffect } from 'react';
import { Clock, Headphones, Music, Radio, X, RotateCcw, Zap, Sparkles, BarChart2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { sessionStatsService } from '../../services/sessionStatsService';
import type { SessionStatsData } from '../../types/audio';

export const SessionStatsModal: React.FC = () => {
  const { isSessionStatsOpen, setSessionStatsOpen } = usePlayerStore();
  const [stats, setStats] = useState<SessionStatsData>(sessionStatsService.getStats());

  useEffect(() => {
    const unsub = sessionStatsService.subscribe((s) => setStats(s));
    return unsub;
  }, []);

  if (!isSessionStatsOpen) return null;

  const formatHoursMinutes = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const focusPercent =
    stats.totalSeconds > 0
      ? Math.round((stats.focusSeconds / stats.totalSeconds) * 100)
      : 0;

  const sortedKeys = Object.entries(stats.keysDistribution).sort((a, b) => b[1] - a[1]);
  const dominantKey = sortedKeys.length > 0 ? sortedKeys[0][0] : '--';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setSessionStatsOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#080b16]/95 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-5 flex flex-col gap-4 font-mono text-xs text-white/90 z-10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Estadísticas de la Sesión</h3>
              <p className="text-[10px] text-white/40">Telemetría de escucha & enfoque en tiempo real</p>
            </div>
          </div>
          <button
            onClick={() => setSessionStatsOpen(false)}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Time */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Tiempo Total
            </span>
            <span className="text-lg font-bold text-white tabular-nums">
              {formatHoursMinutes(stats.totalSeconds)}
            </span>
            <span className="text-[9px] text-white/40">Reproducción activa</span>
          </div>

          {/* Focus & Lo-Fi Time */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Modo Focus & Lo-Fi
            </span>
            <span className="text-lg font-bold text-amber-300 tabular-nums">
              {formatHoursMinutes(stats.focusSeconds)}
            </span>
            <span className="text-[9px] text-amber-400/60 font-semibold">{focusPercent}% de la sesión</span>
          </div>

          {/* Tracks Count */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Music className="w-3 h-3 text-purple-400" /> Canciones
            </span>
            <span className="text-lg font-bold text-purple-300 tabular-nums">
              {stats.tracksPlayed}
            </span>
            <span className="text-[9px] text-white/40">Pistas escuchadas</span>
          </div>

          {/* Dominant Harmonic Key */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" /> Tonalidad Predilecta
            </span>
            <span className="text-lg font-bold text-emerald-300">
              {dominantKey}
            </span>
            <span className="text-[9px] text-white/40">Código Camelot dominante</span>
          </div>
        </div>

        {/* Camelot Keys Histogram */}
        {sortedKeys.length > 0 && (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Claves Armónicas Detectadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sortedKeys.map(([k, count]) => (
                <div
                  key={k}
                  className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1 text-[10px]"
                >
                  <span className="font-bold text-cyan-300">{k}</span>
                  <span className="text-white/40">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => sessionStatsService.resetStats()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reiniciar Sesión</span>
          </button>

          <button
            onClick={() => setSessionStatsOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-all text-[11px]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
