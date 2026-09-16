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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-backdrop material-thick animate-aura-backdrop"
      onClick={() => setSessionStatsOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-modal bg-surface-overlay material-thick border border-border-subtle shadow-modal p-5 flex flex-col gap-4 font-display text-caption text-text-primary z-10 animate-aura-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-control bg-accent-teal/15 text-accent-teal border border-accent-teal/30 flex items-center justify-center shadow-subtle">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-body font-bold text-text-primary font-heading tracking-tight">Estadísticas de la Sesión</h3>
              <p className="text-caption text-text-tertiary tracking-wide font-display">Telemetría de escucha & enfoque en tiempo real</p>
            </div>
          </div>
          <button
            onClick={() => setSessionStatsOpen(false)}
            aria-label="Cerrar modal de estadísticas"
            className="min-h-11 min-w-11 p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-white/10 btn-spring transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Time */}
          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-1">
            <span className="text-caption text-text-tertiary uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Clock className="w-3.5 h-3.5 text-accent-teal" /> Tiempo Total
            </span>
            <span className="text-h2 font-bold text-text-primary font-display font-tabular">
              {formatHoursMinutes(stats.totalSeconds)}
            </span>
            <span className="text-caption text-text-tertiary tracking-wide">Reproducción activa</span>
          </div>

          {/* Focus & Lo-Fi Time */}
          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-1">
            <span className="text-caption text-text-tertiary uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Sparkles className="w-3.5 h-3.5 text-status-warning" /> Modo Focus & Lo-Fi
            </span>
            <span className="text-h2 font-bold text-status-warning font-display font-tabular">
              {formatHoursMinutes(stats.focusSeconds)}
            </span>
            <span className="text-caption text-status-warning font-semibold tracking-wide font-tabular">{focusPercent}% de la sesión</span>
          </div>

          {/* Tracks Count */}
          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-1">
            <span className="text-caption text-text-tertiary uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Music className="w-3.5 h-3.5 text-accent-purple" /> Canciones
            </span>
            <span className="text-h2 font-bold text-accent-purple font-display font-tabular">
              {stats.tracksPlayed}
            </span>
            <span className="text-caption text-text-tertiary tracking-wide">Pistas escuchadas</span>
          </div>

          {/* Dominant Harmonic Key */}
          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-1">
            <span className="text-caption text-text-tertiary uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Radio className="w-3.5 h-3.5 text-status-success" /> Tonalidad Predilecta
            </span>
            <span className="text-h2 font-bold text-status-success font-display font-tabular">
              {dominantKey}
            </span>
            <span className="text-caption text-text-tertiary tracking-wide">Código Camelot dominante</span>
          </div>
        </div>

        {/* Camelot Keys Histogram */}
        {sortedKeys.length > 0 && (
          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-2">
            <span className="text-caption text-text-tertiary uppercase tracking-wider font-display">
              Claves Armónicas Detectadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sortedKeys.map(([k, count]) => (
                <div
                  key={k}
                  className="px-2.5 py-1 rounded-badge bg-surface-base border border-border-subtle flex items-center gap-1 text-caption font-mono font-tabular"
                >
                  <span className="font-bold text-accent-teal">{k}</span>
                  <span className="text-text-tertiary">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <button
            onClick={() => sessionStatsService.resetStats()}
            aria-label="Reiniciar estadísticas de la sesión"
            className="min-h-11 flex items-center gap-1.5 px-3 py-2 rounded-control bg-surface-base/60 hover:bg-white/10 text-text-secondary hover:text-text-primary btn-spring transition-all text-caption cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar Sesión</span>
          </button>

          <button
            onClick={() => setSessionStatsOpen(false)}
            className="min-h-11 px-5 py-2 rounded-control bg-white hover:bg-white/90 text-black font-semibold btn-spring transition-all text-caption shadow-subtle cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionStatsModal;
