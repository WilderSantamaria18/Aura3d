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
    <div className="flex items-center gap-1.5 group select-none">
      <button
        onClick={toggleMute}
        className="w-8 h-8 p-1.5 transition-colors rounded-control text-white/50 hover:text-white hover:bg-white/[0.06] active:scale-95 flex items-center justify-center cursor-pointer btn-spring"
        title={isMuted ? 'Desmutear' : 'Mutear'}
        aria-label={isMuted ? 'Desmutear' : 'Silenciar'}
      >
        {getIcon()}
      </button>

      <div className="w-14 sm:w-16 h-6 flex items-center">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={currentVol}
          onChange={handleVolumeChange}
          className="w-full h-1.5 bg-white/[0.12] rounded-pill appearance-none cursor-pointer transition-all hover:bg-white/[0.25] accent-white"
          style={
            isLucid
              ? { accentColor: lucidTheme.primary }
              : undefined
          }
          title={`Volumen: ${Math.round(currentVol * 100)}% (${dbText})`}
          aria-label={`Volumen: ${Math.round(currentVol * 100)}% (${dbText})`}
        />
      </div>

      <span className="w-10 text-right font-mono text-caption tabular-nums text-white/40 group-hover:text-white/70 transition-colors font-tabular">
        {dbText}
      </span>
    </div>
  );
};

export default VolumeControl;


