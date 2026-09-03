import React from 'react';
import { LyricsPanel } from './LyricsPanel';
import { useLyrics } from '../../hooks/useLyrics';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';

export const LyricsOverlay: React.FC = () => {
  const {
    isLyricsOpen,
    setLyricsOpen,
    isKaraokeFullscreen,
    currentTrack,
    isPlaying,
    currentTime,
  } = usePlayerStore();

  const { lyricsData } = useLyrics();
  const { seek } = useAudioEngine();

  if (!isLyricsOpen) return null;

  return (
    <div
      className={`fixed z-40 transition-all duration-500 pointer-events-auto ${
        isKaraokeFullscreen
          ? 'inset-0 p-6 sm:p-12 flex flex-col items-center justify-center bg-black/85 backdrop-blur-3xl'
          : 'right-4 sm:right-6 bottom-28 w-96 max-w-[calc(100vw-2rem)] h-[32rem]'
      }`}
    >
      <LyricsPanel
        lyrics={lyricsData.lines.map((l) => ({ time: l.time, text: l.text }))}
        currentTime={currentTime}
        isPlaying={isPlaying}
        title={currentTrack?.title || 'Sin título'}
        artist={currentTrack?.artist || 'Artista desconocido'}
        onSeek={(time) => seek(time)}
        onClose={() => setLyricsOpen(false)}
      />
    </div>
  );
};

export default LyricsOverlay;
