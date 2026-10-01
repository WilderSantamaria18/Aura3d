import React from 'react';
import { AlertCircle, AppWindow, Globe, Mic, Monitor, Sparkles, Volume2 } from 'lucide-react';
import { useRecorderStore, type CaptureMode } from '../../store/recorderStore';
import { useSystemAudio } from '../../hooks/useSystemAudio';
import { useMicrophone } from '../../hooks/useMicrophone';
import { FOCUS_RING, Section, Segmented } from '../Cards/controls';

type AudioSource = 'mixed' | 'system' | 'mic' | 'none';

const SOURCES: { id: CaptureMode; title: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'canvas', title: 'Visualizador Aura', hint: 'Captura directa del lienzo, sin bordes ni menús', icon: <Sparkles className="h-4 w-4 text-violet-300" /> },
  { id: 'display', title: 'Pantalla completa', hint: 'Todo el escritorio a resolución nativa', icon: <Monitor className="h-4 w-4 text-indigo-300" /> },
  { id: 'window', title: 'Ventana', hint: 'Aura3D u otra aplicación, como tu DAW', icon: <AppWindow className="h-4 w-4 text-sky-300" /> },
  { id: 'tab', title: 'Pestaña del navegador', hint: 'La pestaña que tienes activa', icon: <Globe className="h-4 w-4 text-emerald-300" /> },
];

const StatusPill: React.FC<{ on: boolean; icon: React.ReactNode; label: string }> = ({ on, icon, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
      on ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-white/40'
    }`}
  >
    {icon}
    {label}: {on ? 'activo' : 'apagado'}
  </span>
);

export const ScreenCaptureSelector: React.FC = () => {
  const captureMode = useRecorderStore((s) => s.captureMode);
  const setCaptureMode = useRecorderStore((s) => s.setCaptureMode);
  const audioSource = useRecorderStore((s) => s.audioSource);
  const setAudioSource = useRecorderStore((s) => s.setAudioSource);
  const isRecording = useRecorderStore((s) => s.isRecording);

  const { isCapturing: isSystemOn, startCapture: startSystem, stopCapture: stopSystem, error: systemError } = useSystemAudio();
  const { isMicActive: isMicOn, startMicrophone, stopMicrophone, error: micError } = useMicrophone();

  const changeAudioSource = (src: AudioSource) => {
    if (isRecording) return;
    setAudioSource(src);

    // Cada canal enciende o apaga su entrada real (el micrófono y el sistema pueden estar a la vez)
    const wantSystem = src === 'mixed' || src === 'system';
    const wantMic = src === 'mixed' || src === 'mic';
    if (wantSystem && !isSystemOn) void startSystem();
    if (!wantSystem && isSystemOn) stopSystem();
    if (wantMic && !isMicOn) void startMicrophone();
    if (!wantMic && isMicOn) stopMicrophone();
  };

  const audioError = systemError || micError;

  return (
    <div className="space-y-8 text-white">
      <Section title="Qué grabar" icon={<Monitor className="h-3.5 w-3.5" />}>
        <div role="radiogroup" aria-label="Fuente de captura" className="grid grid-cols-2 gap-2.5">
          {SOURCES.map((s) => {
            const active = captureMode === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isRecording}
                onClick={() => setCaptureMode(s.id)}
                className={`rounded-2xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
                  active
                    ? 'border-violet-400/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.3)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-white">
                  {s.icon}
                  {s.title}
                </span>
                <span className="block text-[11px] leading-snug text-white/45">{s.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Audio del vídeo" icon={<Volume2 className="h-3.5 w-3.5" />}>
        <Segmented<AudioSource>
          label="Canal de audio"
          value={audioSource}
          onChange={changeAudioSource}
          options={[
            { value: 'mixed', label: 'Mezcla', sub: 'Sistema + micro', disabled: isRecording },
            { value: 'system', label: 'Sistema', sub: 'Lo que suena', disabled: isRecording },
            { value: 'mic', label: 'Micrófono', sub: 'Tu voz', disabled: isRecording },
            { value: 'none', label: 'Sin audio', sub: 'Silencio', disabled: isRecording },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <StatusPill on={isSystemOn} icon={<Volume2 className="h-3 w-3" />} label="Sistema" />
          <StatusPill on={isMicOn} icon={<Mic className="h-3 w-3" />} label="Micrófono" />
        </div>

        {audioError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {audioError}
          </p>
        )}
      </Section>
    </div>
  );
};
