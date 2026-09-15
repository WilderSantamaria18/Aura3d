import React, { useState, useEffect } from 'react';
import { Clock, Music, Radio, X, RotateCcw, Sparkles, BarChart2 } from 'lucide-react';
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-aura-backdrop"
      onClick={() => setSessionStatsOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-modal)] glass-panel p-5 flex flex-col gap-4 font-display text-xs text-white/90 z-10 animate-aura-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading tracking-studio-tight">Estadísticas de la Sesión</h3>
              <p className="text-[10px] text-white/50 tracking-wide font-display">Telemetría de escucha & enfoque en tiempo real</p>
            </div>
          </div>
          <button
            onClick={() => setSessionStatsOpen(false)}
            className="p-1 rounded-[8px] text-white/40 hover:text-white hover:bg-white/[0.06] btn-spring transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Time */}
          <div className="p-3 rounded-[var(--radius-card)] bg-white/[0.03] border border-[var(--border-subtle)] flex flex-col gap-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1 font-display">
              <Clock className="w-3 h-3 text-cyan-400" /> Tiempo Total
            </span>
            <span className="text-2xl font-bold text-white font-display font-tabular">
              {formatHoursMinutes(stats.totalSeconds)}
            </span>
            <span className="text-[10px] text-white/40 tracking-wide">Reproducción activa</span>
          </div>

          {/* Focus & Lo-Fi Time */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1 font-display">
              <Sparkles className="w-3 h-3 text-amber-400" /> Modo Focus & Lo-Fi
            </span>
            <span className="text-2xl font-bold text-amber-300 font-display font-tabular">
              {formatHoursMinutes(stats.focusSeconds)}
            </span>
            <span className="text-[10px] text-amber-400/60 font-semibold tracking-wide">{focusPercent}% de la sesión</span>
          </div>

          {/* Tracks Count */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1 font-display">
              <Music className="w-3 h-3 text-purple-400" /> Canciones
            </span>
            <span className="text-2xl font-bold text-purple-300 font-display font-tabular">
              {stats.tracksPlayed}
            </span>
            <span className="text-[10px] text-white/40 tracking-wide">Pistas escuchadas</span>
          </div>

          {/* Dominant Harmonic Key */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1 font-display">
              <Radio className="w-3 h-3 text-emerald-400" /> Tonalidad Predilecta
            </span>
            <span className="text-2xl font-bold text-emerald-300 font-display font-tabular">
              {dominantKey}
            </span>
            <span className="text-[10px] text-white/40 tracking-wide">Código Camelot dominante</span>
          </div>
        </div>

        {/* Camelot Keys Histogram */}
        {sortedKeys.length > 0 && (
          <div className="p-3 rounded-[var(--radius-card)] bg-white/[0.02] border border-[var(--border-subtle)] flex flex-col gap-2">
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-display">
              Claves Armónicas Detectadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sortedKeys.map(([k, count]) => (
                <div
                  key={k}
                  className="px-2 py-1 rounded-[var(--radius-badge)] bg-white/[0.04] border border-[var(--border-subtle)] flex items-center gap-1 text-[10px]"
                >
                  <span className="font-bold text-cyan-300">{k}</span>
                  <span className="text-white/40">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
          <button
            onClick={() => sessionStatsService.resetStats()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-control)] bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white btn-spring transition-all text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reiniciar Sesión</span>
          </button>

          <button
            onClick={() => setSessionStatsOpen(false)}
            className="px-4 py-1.5 rounded-[var(--radius-control)] bg-white hover:bg-white/90 text-black font-semibold btn-spring transition-all text-[11px] shadow-[var(--shadow-subtle)]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionStatsModal;
