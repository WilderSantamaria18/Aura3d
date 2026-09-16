import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { bpmDetector } from '../../services/bpmDetectorService';

export const BpmMeter: React.FC = () => {
  const { bpm, isBeatPulse, isPlaying, isLucid, lucidTheme, lucidPrimaryColor } = usePlayerStore();

  useEffect(() => {
    bpmDetector.start();
    return () => bpmDetector.stop();
  }, []);

  const accentColor = isLucid ? lucidPrimaryColor || lucidTheme.primary || 'var(--accent-cyan)' : 'var(--accent-cyan)';

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface-dock/60 border border-border-subtle material-thin select-none transition-all duration-fast"
      title={bpm > 0 ? `Tempo detectado: ${bpm} BPM` : 'Analizando tempo (BPM)...'}
    >
      {/* Pulsing Metronome LED */}
      <div
        className="w-1.5 h-1.5 rounded-pill transition-transform duration-fast"
        style={{
          backgroundColor: isBeatPulse ? accentColor : 'var(--border-medium)',
          boxShadow: isBeatPulse ? `0 0 8px ${accentColor}` : 'none',
          transform: isBeatPulse ? 'scale(1.4)' : 'scale(1.0)',
        }}
      />

      <Activity className="w-3 h-3 text-text-muted" />

      {/* Numerical BPM Display */}
      <span className="text-caption font-mono font-bold tracking-tight text-text-primary font-tabular">
        {isPlaying && bpm > 0 ? bpm : '---'}
      </span>

      <span className="text-caption font-mono uppercase tracking-widest text-text-muted">BPM</span>
    </div>
  );
};
