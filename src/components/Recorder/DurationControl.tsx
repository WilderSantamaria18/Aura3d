import React, { useState, useEffect } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { useScreenRecorder } from '../../hooks/useScreenRecorder';
import { Timer, Play, Square, Clock, CircleDot } from 'lucide-react';

export const DurationControl: React.FC = () => {
  const isRecording = useRecorderStore((state) => state.isRecording);
  const recordingDuration = useRecorderStore((state) => state.recordingDuration);
  const maxDuration = useRecorderStore((state) => state.maxDuration);
  const setMaxDuration = useRecorderStore((state) => state.setMaxDuration);
  const countdown = useRecorderStore((state) => state.countdown);
  const setCountdown = useRecorderStore((state) => state.setCountdown);

  const { startRecording, stopRecording } = useScreenRecorder();
  const [countdownActive, setCountdownActive] = useState<number | null>(null);

  const DURATIONS = [
    { label: '15s (Reel)', value: 15 },
    { label: '30s (Story)', value: 30 },
    { label: '60s (Short)', value: 60 },
    { label: 'Unlimited', value: 0 },
  ];

  const handleStartWithCountdown = async () => {
    if (countdown > 0) {
      setCountdownActive(countdown);
      let rem = countdown;
      const timer = setInterval(() => {
        rem -= 1;
        if (rem <= 0) {
          clearInterval(timer);
          setCountdownActive(null);
          startRecording();
        } else {
          setCountdownActive(rem);
        }
      }, 1000);
    } else {
      await startRecording();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Duration and Countdown configuration (when not recording) */}
      {!isRecording && (
        <div className="grid grid-cols-2 gap-3">
          {/* Max Duration Preset */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Target Length</span>
            </label>
            <select
              value={maxDuration}
              onChange={(e) => setMaxDuration(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500/60"
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value} className="bg-zinc-900 text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Countdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-purple-400" />
              <span>Countdown</span>
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[0, 3, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCountdown(sec)}
                  className={`py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                    countdown === sec
                      ? 'bg-purple-500/20 text-white border-purple-500/60'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {sec === 0 ? 'None' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live recording indicator */}
      {isRecording && (
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/30 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono tracking-widest text-red-400 uppercase font-semibold">
              Recording in Progress
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-white tracking-wider">
            {formatSeconds(recordingDuration)}
            {maxDuration > 0 && (
              <span className="text-sm font-normal text-white/40 ml-1">
                / {formatSeconds(maxDuration)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Action Trigger */}
      <div>
        {countdownActive !== null ? (
          <div className="w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <CircleDot className="w-5 h-5 animate-spin" />
            <span>Starting in {countdownActive}s...</span>
          </div>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/30 transition-all active:scale-[0.99]"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop & Preview Recording</span>
          </button>
        ) : (
          <button
            onClick={handleStartWithCountdown}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30 transition-all active:scale-[0.99]"
          >
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white/40" />
            <span>Start Recording</span>
          </button>
        )}
      </div>
    </div>
  );
};
