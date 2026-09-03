import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

export const VolumeControl: React.FC = () => {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const getIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-4 h-4 text-pink-400" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="w-4 h-4 text-cyan-300" />;
    }
    return <Volume2 className="w-4 h-4 text-cyan-300" />;
  };

  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={toggleMute}
        className="p-1.5 text-cyan-300/80 hover:text-cyan-200 transition-colors rounded-full hover:bg-white/5"
        title={isMuted ? 'Desmutear' : 'Mutear'}
      >
        {getIcon()}
      </button>

      <div className="w-20 sm:w-24 flex items-center">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-pink-400 transition-all"
        />
      </div>
    </div>
  );
};

