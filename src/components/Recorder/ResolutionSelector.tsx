import React from 'react';
import { useRecorderStore, type AspectRatio } from '../../store/recorderStore';
import { Crop, Zap, Film, Sparkles } from 'lucide-react';

export const ResolutionSelector: React.FC = () => {
  const aspectRatio = useRecorderStore((state) => state.aspectRatio);
  const setAspectRatio = useRecorderStore((state) => state.setAspectRatio);
  const fps = useRecorderStore((state) => state.fps);
  const setFps = useRecorderStore((state) => state.setFps);
  const videoBitrate = useRecorderStore((state) => state.videoBitrate);
  const setVideoBitrate = useRecorderStore((state) => state.setVideoBitrate);
  const isRecording = useRecorderStore((state) => state.isRecording);

  const ASPECT_RATIOS: { id: AspectRatio; name: string; tag: string; icon: string }[] = [
    { id: '9:16', name: 'Story / Reel', tag: '1080×1920', icon: '📱' },
    { id: '1:1', name: 'Square Feed', tag: '1080×1080', icon: '⏹' },
    { id: '4:5', name: 'Portrait Post', tag: '1080×1350', icon: '📄' },
    { id: '16:9', name: 'YouTube / Web', tag: '1920×1080', icon: '🖥' },
  ];

  const BITRATES = [
    { label: 'Balanced', value: 4000000, desc: '4 Mbps' },
    { label: 'High Def', value: 8000000, desc: '8 Mbps' },
    { label: 'Master Ultra', value: 15000000, desc: '15 Mbps' },
  ];

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Aspect Ratio */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Crop className="w-3.5 h-3.5 text-purple-400" />
          <span>Framing & Aspect Ratio</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASPECT_RATIOS.map((item) => (
            <button
              key={item.id}
              onClick={() => !isRecording && setAspectRatio(item.id)}
              disabled={isRecording}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                aspectRatio === item.id
                  ? 'bg-purple-500/20 text-white border-purple-500/60 shadow-sm shadow-purple-500/25'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold">{item.name}</span>
                <span className="text-[10px] font-mono opacity-60">{item.id}</span>
              </div>
              <div className="text-[10px] font-mono text-purple-300/80">{item.tag}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Frame Rate & Bitrate */}
      <div className="grid grid-cols-2 gap-3">
        {/* FPS */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Frame Rate</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {([30, 60] as const).map((rate) => (
              <button
                key={rate}
                onClick={() => !isRecording && setFps(rate)}
                disabled={isRecording}
                className={`py-1.5 rounded-xl text-xs font-mono font-medium border transition-all ${
                  fps === rate
                    ? 'bg-purple-500/20 text-white border-purple-500/60'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {rate} FPS
              </button>
            ))}
          </div>
        </div>

        {/* Quality / Bitrate */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>Bitrate</span>
          </label>
          <select
            value={videoBitrate}
            onChange={(e) => setVideoBitrate(Number(e.target.value))}
            disabled={isRecording}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/60"
          >
            {BITRATES.map((b) => (
              <option key={b.value} value={b.value} className="bg-zinc-900 text-white">
                {b.label} ({b.desc})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
