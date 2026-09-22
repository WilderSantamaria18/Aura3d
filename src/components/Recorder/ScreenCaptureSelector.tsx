import React from 'react';
import { useRecorderStore, type CaptureMode } from '../../store/recorderStore';
import { useSystemAudio } from '../../hooks/useSystemAudio';
import { useMicrophone } from '../../hooks/useMicrophone';
import { 
  Sparkles, 
  Monitor, 
  AppWindow, 
  Globe, 
  Mic, 
  Volume2, 
  Sliders, 
  AlertCircle 
} from 'lucide-react';

export const ScreenCaptureSelector: React.FC = () => {
  const captureMode = useRecorderStore((state) => state.captureMode);
  const setCaptureMode = useRecorderStore((state) => state.setCaptureMode);
  const audioSource = useRecorderStore((state) => state.audioSource);
  const setAudioSource = useRecorderStore((state) => state.setAudioSource);
  const isRecording = useRecorderStore((state) => state.isRecording);

  const { isCapturing: isSystemAudioOn, startCapture: startSystemAudio, stopCapture: stopSystemAudio } = useSystemAudio();
  const { isMicActive: isMicOn, startMicrophone, stopMicrophone, setMicGain } = useMicrophone();

  const handleModeChange = (mode: CaptureMode) => {
    if (isRecording) return;
    setCaptureMode(mode);
  };

  const handleAudioSourceChange = (src: 'mixed' | 'system' | 'mic' | 'none') => {
    if (isRecording) return;
    setAudioSource(src);

    // Sync hardware hooks based on source
    if (src === 'mixed') {
      if (!isSystemAudioOn) startSystemAudio().catch(() => {});
      if (!isMicOn) startMicrophone().catch(() => {});
    } else if (src === 'system') {
      if (!isSystemAudioOn) startSystemAudio().catch(() => {});
      if (isMicOn) stopMicrophone();
    } else if (src === 'mic') {
      if (isSystemAudioOn) stopSystemAudio();
      if (!isMicOn) startMicrophone().catch(() => {});
    } else {
      if (isSystemAudioOn) stopSystemAudio();
      if (isMicOn) stopMicrophone();
    }
  };

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Video Capture Mode */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5 text-purple-400" />
          <span>Capture Source</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleModeChange('canvas')}
            disabled={isRecording}
            className={`p-3 rounded-xl border text-left transition-all ${
              captureMode === 'canvas'
                ? 'bg-purple-500/20 text-white border-purple-500/60 shadow-sm shadow-purple-500/25'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold">Aura Visualizer</span>
            </div>
            <p className="text-[11px] text-white/50 leading-tight">
              Direct WebGL Canvas capture (Rainbow Void)
            </p>
          </button>

          <button
            onClick={() => handleModeChange('display')}
            disabled={isRecording}
            className={`p-3 rounded-xl border text-left transition-all ${
              captureMode === 'display'
                ? 'bg-purple-500/20 text-white border-purple-500/60 shadow-sm shadow-purple-500/25'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold">Entire Screen</span>
            </div>
            <p className="text-[11px] text-white/50 leading-tight">
              Record full desktop with native resolution
            </p>
          </button>

          <button
            onClick={() => handleModeChange('window')}
            disabled={isRecording}
            className={`p-3 rounded-xl border text-left transition-all ${
              captureMode === 'window'
                ? 'bg-purple-500/20 text-white border-purple-500/60 shadow-sm shadow-purple-500/25'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AppWindow className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold">App Window</span>
            </div>
            <p className="text-[11px] text-white/50 leading-tight">
              Capture Aura3D or external DAW window
            </p>
          </button>

          <button
            onClick={() => handleModeChange('tab')}
            disabled={isRecording}
            className={`p-3 rounded-xl border text-left transition-all ${
              captureMode === 'tab'
                ? 'bg-purple-500/20 text-white border-purple-500/60 shadow-sm shadow-purple-500/25'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Browser Tab</span>
            </div>
            <p className="text-[11px] text-white/50 leading-tight">
              Capture current active browser tab
            </p>
          </button>
        </div>
      </div>

      {/* Audio Source Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Audio Sync Channel</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'mixed', label: 'Mix (All)' },
            { id: 'system', label: 'System' },
            { id: 'mic', label: 'Mic Voice' },
            { id: 'none', label: 'Mute' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleAudioSourceChange(item.id as any)}
              disabled={isRecording}
              className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-all ${
                audioSource === item.id
                  ? 'bg-purple-500/20 text-white border-purple-500/60 shadow-sm'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Mic Level & Gain Control (if mic is active) */}
      {(audioSource === 'mixed' || audioSource === 'mic') && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-white/70">
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>Mic Noise Suppression & Direct DSP</span>
            </span>
            <span className="font-mono text-purple-300 text-[11px]">
              {isMicOn ? 'Activo (Gain 1.0)' : 'Silenciado'}
            </span>
          </div>

          {/* Level VU Meter */}
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 transition-all duration-300 ${
                isMicOn ? 'w-full animate-pulse' : 'w-0'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
