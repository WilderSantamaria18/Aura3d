import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

export const VolumeControl: React.FC = () => {
  const { volume, isMuted, setVolume, toggleMute, isLucid, lucidTheme } = usePlayerStore();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const currentVol = isMuted ? 0 : volume;
  const dbText = isMuted || currentVol <= 0.001 ? '-∞ dB' : `${(20 * Math.log10(currentVol)).toFixed(1)} dB`;

  const getIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <VolumeX className="w-4 h-4 text-rose-400/80 transition-colors" />
      );
    }
    if (volume < 0.5) {
      return (
        <Volume1
          className="w-4 h-4 text-white/60 group-hover:text-white transition-colors"
          style={isLucid ? { color: lucidTheme.primary } : undefined}
        />
      );
    }
    return (
      <Volume2
        className="w-4 h-4 text-white/70 group-hover:text-white transition-colors"
        style={isLucid ? { color: lucidTheme.primary } : undefined}
      />
    );
  };

  return (
    <div className="flex items-center gap-2 group select-none">
      <button
        onClick={toggleMute}
        className="p-1.5 transition-colors rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] active:scale-95"
        title={isMuted ? 'Desmutear' : 'Mutear'}
      >
        {getIcon()}
      </button>

      <div className="w-16 sm:w-20 flex items-center">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={currentVol}
          onChange={handleVolumeChange}
          className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer transition-all hover:bg-white/[0.15] accent-white"
          style={
            isLucid
              ? { accentColor: lucidTheme.primary }
              : undefined
          }
          title={`Volumen: ${Math.round(currentVol * 100)}% (${dbText})`}
        />
      </div>

      <span className="w-12 text-right font-mono text-[10px] tabular-nums text-white/40 group-hover:text-white/70 transition-colors">
        {dbText}
      </span>
    </div>
  );
};


