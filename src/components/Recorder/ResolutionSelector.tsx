import React from 'react';
import { Crop, Film, Zap } from 'lucide-react';
import { useRecorderStore, type AspectRatio } from '../../store/recorderStore';
import { FOCUS_RING, Section, Segmented } from '../Cards/controls';

const ASPECTS: { id: AspectRatio; name: string; size: string }[] = [
  { id: '9:16', name: 'Historia / Reel', size: '1080 × 1920' },
  { id: '1:1', name: 'Feed cuadrado', size: '1080 × 1080' },
  { id: '4:5', name: 'Post vertical', size: '1080 × 1350' },
  { id: '16:9', name: 'YouTube / Web', size: '1920 × 1080' },
];

const BITRATES = [
  { label: 'Equilibrada', value: 4_000_000, desc: '4 Mbps' },
  { label: 'Alta definición', value: 8_000_000, desc: '8 Mbps' },
  { label: 'Máxima', value: 15_000_000, desc: '15 Mbps' },
];

export const ResolutionSelector: React.FC = () => {
  const aspectRatio = useRecorderStore((s) => s.aspectRatio);
  const setAspectRatio = useRecorderStore((s) => s.setAspectRatio);
  const fps = useRecorderStore((s) => s.fps);
  const setFps = useRecorderStore((s) => s.setFps);
  const videoBitrate = useRecorderStore((s) => s.videoBitrate);
  const setVideoBitrate = useRecorderStore((s) => s.setVideoBitrate);
  const isRecording = useRecorderStore((s) => s.isRecording);

  return (
    <div className="space-y-8 text-white">
      <Section title="Formato del vídeo" icon={<Crop className="h-3.5 w-3.5" />}>
        <div role="radiogroup" aria-label="Formato del vídeo" className="grid grid-cols-2 gap-2.5">
          {ASPECTS.map((a) => {
            const active = aspectRatio === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isRecording}
                onClick={() => setAspectRatio(a.id)}
                className={`rounded-2xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
                  active
                    ? 'border-violet-400/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.3)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-center justify-between text-xs font-bold text-white">
                  {a.name}
                  <span className="font-mono text-[10px] font-medium text-white/45">{a.id}</span>
                </span>
                <span className="mt-1 block font-mono text-[11px] text-violet-300/80">{a.size}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Section title="Fotogramas" icon={<Zap className="h-3.5 w-3.5" />}>
          <Segmented<'30' | '60'>
            label="Fotogramas por segundo"
            value={String(fps) as '30' | '60'}
            onChange={(v) => setFps(Number(v) as 30 | 60)}
            options={[
              { value: '30', label: '30 FPS', disabled: isRecording },
              { value: '60', label: '60 FPS', disabled: isRecording },
            ]}
          />
        </Section>

        <Section title="Calidad" icon={<Film className="h-3.5 w-3.5" />}>
          <select
            aria-label="Calidad del vídeo"
            value={videoBitrate}
            onChange={(e) => setVideoBitrate(Number(e.target.value))}
            disabled={isRecording}
            className={`w-full rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-3 text-xs font-semibold text-white disabled:opacity-50 ${FOCUS_RING}`}
          >
            {BITRATES.map((b) => (
              <option key={b.value} value={b.value} className="bg-zinc-900 text-white">
                {b.label} ({b.desc})
              </option>
            ))}
          </select>
        </Section>
      </div>
    </div>
  );
};
