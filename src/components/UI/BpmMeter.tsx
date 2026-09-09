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

  const accentColor = isLucid ? lucidPrimaryColor || lucidTheme.primary || '#00e5ff' : '#00f2fe';

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] select-none transition-all duration-150"
      title={bpm > 0 ? `Tempo detectado: ${bpm} BPM (en vivo)` : 'Analizando tempo de la música (BPM)...'}
    >
      {/* Pulsing Metronome LED */}
      <div
        className="w-1.5 h-1.5 rounded-full transition-all duration-75"
        style={{
          backgroundColor: isBeatPulse ? accentColor : 'rgba(255,255,255,0.2)',
          boxShadow: isBeatPulse ? `0 0 8px ${accentColor}` : 'none',
          transform: isBeatPulse ? 'scale(1.4)' : 'scale(1.0)',
        }}
      />

      <Activity className="w-3 h-3 text-white/40" />

      {/* Numerical BPM Display */}
      <span className="text-xs font-mono font-bold tracking-tight text-white/90 tabular-nums">
        {isPlaying && bpm > 0 ? bpm : '---'}
      </span>

      <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">BPM</span>
    </div>
  );
};
