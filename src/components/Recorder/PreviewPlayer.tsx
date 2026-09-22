import React, { useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { useVideoPreview } from '../../hooks/useVideoPreview';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ArrowRight, 
  Scissors, 
  Eye, 
  Film,
  Sparkles
} from 'lucide-react';

export const PreviewPlayer: React.FC = () => {
  const recordedBlob = useRecorderStore((state) => state.recordedBlob);
  const setActiveTab = useRecorderStore((state) => state.setActiveTab);
  const resetRecording = useRecorderStore((state) => state.resetRecording);
  const aspectRatio = useRecorderStore((state) => state.aspectRatio);

  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isMuted,
    volume,
    trimStart,
    trimEnd,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setTrimRange,
    resetTrim,
  } = useVideoPreview();

  const [showSafeZones, setShowSafeZones] = useState(false);

  if (!recordedBlob) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-white/50 gap-3">
        <Film className="w-12 h-12 stroke-[1.2] text-white/30" />
        <p className="text-sm font-medium">No recorded video available yet.</p>
        <button
          onClick={() => setActiveTab('record')}
          className="mt-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold hover:bg-purple-500/30 transition-all"
        >
          Go to Record Tab
        </button>
      </div>
    );
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const isPortrait = aspectRatio === '9:16' || aspectRatio === '4:5';

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              showSafeZones
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>IG Safe Zone</span>
          </button>

          <button
            onClick={resetTrim}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/60 border border-white/10 hover:text-white transition-all"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Reset Trim</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <span>Speed:</span>
          {[1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all ${
                playbackRate === rate
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Video Preview Frame */}
      <div className="relative w-full flex items-center justify-center bg-black/60 rounded-2xl overflow-hidden border border-white/15 p-2 shadow-2xl min-h-[300px] max-h-[460px]">
        <div
          className={`relative overflow-hidden rounded-xl bg-black flex items-center justify-center ${
            isPortrait ? 'w-[230px] aspect-[9/16]' : 'w-full aspect-video'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />

          {/* Safe zone overlay */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20">
              <div className="h-[14%] w-full bg-red-500/20 border-b border-red-500/40 flex items-center justify-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-red-300">
                  Header Safe Area
                </span>
              </div>
              <div className="h-[20%] w-full bg-red-500/20 border-t border-red-500/40 flex items-center justify-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-red-300">
                  Controls Safe Area
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrubber & Trim Sliders */}
      <div className="space-y-2 bg-white/5 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between text-xs font-mono text-white/70">
          <span>{formatTime(currentTime)}</span>
          <span className="text-[10px] text-white/40">
            Trim: {formatTime(trimStart)} - {formatTime(trimEnd)}
          </span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Playhead Seek Slider */}
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.05"
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="w-full accent-purple-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
        />

        {/* Trim In/Out Sliders */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex justify-between text-[11px] text-white/50 mb-0.5">
              <span>Trim Start</span>
              <span className="font-mono">{formatTime(trimStart)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, trimEnd - 0.5)}
              step="0.1"
              value={trimStart}
              onChange={(e) => setTrimRange(parseFloat(e.target.value), trimEnd)}
              className="w-full accent-indigo-400 h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-white/50 mb-0.5">
              <span>Trim End</span>
              <span className="font-mono">{formatTime(trimEnd)}</span>
            </div>
            <input
              type="range"
              min={Math.min(duration, trimStart + 0.5)}
              max={duration || 1}
              step="0.1"
              value={trimEnd}
              onChange={(e) => setTrimRange(trimStart, parseFloat(e.target.value))}
              className="w-full accent-indigo-400 h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-white/70 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 accent-white h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetRecording();
              setActiveTab('record');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-record</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/25 hover:from-purple-400 hover:to-indigo-400 transition-all active:scale-[0.99]"
          >
            <span>Proceed to Export</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
