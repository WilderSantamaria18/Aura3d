import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CircleDot, Clock, Square, Timer, X } from 'lucide-react';
import { useRecorderStore } from '../../store/recorderStore';
import { useScreenRecorder } from '../../hooks/useScreenRecorder';
import { FOCUS_RING, Section, Segmented } from '../Cards/controls';

const DURATIONS = [
  { label: '15 s · Reel', value: '15' },
  { label: '30 s · Historia', value: '30' },
  { label: '60 s · Short', value: '60' },
  { label: 'Sin límite', value: '0' },
];

const formatSeconds = (sec: number) =>
  `${Math.floor(sec / 60).toString().padStart(2, '0')}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;

/** Cancelar el diálogo de captura del navegador no es un error que haya que enseñar */
const isCancel = (err: unknown) =>
  err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError');

export const DurationControl: React.FC = () => {
  const isRecording = useRecorderStore((s) => s.isRecording);
  const recordingDuration = useRecorderStore((s) => s.recordingDuration);
  const maxDuration = useRecorderStore((s) => s.maxDuration);
  const setMaxDuration = useRecorderStore((s) => s.setMaxDuration);
  const countdown = useRecorderStore((s) => s.countdown);
  const setCountdown = useRecorderStore((s) => s.setCountdown);

  const { startRecording, stopRecording } = useScreenRecorder();
  const [countdownActive, setCountdownActive] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Si el estudio se cierra o se cambia de pestaña durante la cuenta atrás, no debe empezar a grabar sola después
  useEffect(() => clearTimer, [clearTimer]);

  const begin = useCallback(async () => {
    setError(null);
    try {
      await startRecording();
    } catch (err) {
      if (!isCancel(err)) {
        setError(err instanceof Error ? err.message : 'No se pudo empezar a grabar.');
      }
    }
  }, [startRecording]);

  const cancelCountdown = () => {
    clearTimer();
    setCountdownActive(null);
  };

  const start = () => {
    if (countdown <= 0) {
      void begin();
      return;
    }
    let remaining = countdown;
    setCountdownActive(remaining);
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimer();
        setCountdownActive(null);
        void begin();
      } else {
        setCountdownActive(remaining);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 text-white">
      {!isRecording && countdownActive === null && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Section title="Duración" icon={<Clock className="h-3.5 w-3.5" />}>
            <select
              aria-label="Duración de la grabación"
              value={String(maxDuration)}
              onChange={(e) => setMaxDuration(Number(e.target.value))}
              className={`w-full rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-3 text-xs font-semibold text-white ${FOCUS_RING}`}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value} className="bg-zinc-900 text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </Section>

          <Section title="Cuenta atrás" icon={<Timer className="h-3.5 w-3.5" />}>
            <Segmented<'0' | '3' | '5'>
              label="Cuenta atrás"
              value={String(countdown) as '0' | '3' | '5'}
              onChange={(v) => setCountdown(Number(v))}
              options={[
                { value: '0', label: 'No' },
                { value: '3', label: '3 s' },
                { value: '5', label: '5 s' },
              ]}
            />
          </Section>
        </div>
      )}

      {isRecording && (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-5"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
            Grabando
          </span>
          <span className="font-mono text-3xl font-bold tracking-wider text-white">
            {formatSeconds(recordingDuration)}
            {maxDuration > 0 && <span className="ml-1.5 text-sm font-normal text-white/40">/ {formatSeconds(maxDuration)}</span>}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {countdownActive !== null ? (
        <div className="space-y-2">
          <div
            role="status"
            aria-live="assertive"
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-500/15 py-3.5 text-sm font-bold text-amber-200"
          >
            <CircleDot className="h-5 w-5 animate-spin" />
            Empieza en {countdownActive} s…
          </div>
          <button
            type="button"
            onClick={cancelCountdown}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] py-3 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 ${FOCUS_RING}`}
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      ) : isRecording ? (
        <button
          type="button"
          onClick={() => void stopRecording()}
          className={`flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition-all hover:brightness-110 active:scale-[0.99] ${FOCUS_RING}`}
        >
          <Square className="h-4 w-4 fill-white" />
          Detener y ver el resultado
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          className={`flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all hover:brightness-110 active:scale-[0.99] ${FOCUS_RING}`}
        >
          <span className="h-3 w-3 rounded-full border border-white/50 bg-red-500" />
          Empezar a grabar
        </button>
      )}
    </div>
  );
};
