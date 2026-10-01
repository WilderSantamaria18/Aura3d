import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Clock, Copy, Download, ExternalLink, FileVideo, HardDrive, ImageIcon, Layers, Scissors, Share2, X } from 'lucide-react';
import { RESOLUTION_PRESETS, useRecorderStore } from '../../store/recorderStore';
import { exporter } from '../../services/exporter';
import { isTrimActive, trimVideoBlob } from '../../services/videoTrim';
import { FOCUS_RING } from '../Cards/controls';

/** Extensión real según lo que grabó el navegador (no la del ajuste: puede haber grabado webm aunque se pidiera mp4) */
const extensionFor = (blob: Blob): string =>
  blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : blob.type.includes('png') ? 'png' : blob.type.includes('jpeg') ? 'jpg' : 'bin';

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

type Notice = { kind: 'ok' | 'error'; text: string } | null;

/** Descargar, compartir y copiar un archivo ya generado, con avisos accesibles */
const ArtifactActions: React.FC<{ blob: Blob; fileName: string; canCopy: boolean; label: string }> = ({
  blob,
  fileName,
  canCopy,
  label,
}) => {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const say = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 4200);
  };

  const download = async () => {
    await exporter.downloadBlob(blob, fileName);
    say('ok', `Guardado como ${fileName}`);
  };

  const share = async () => {
    setBusy(true);
    try {
      const file = exporter.createFileFromBlob(blob, fileName);
      if (!navigator.canShare?.({ files: [file] })) {
        await exporter.downloadBlob(blob, fileName);
        say('ok', 'Tu navegador no puede compartir archivos: se ha descargado.');
        return;
      }
      const shared = await exporter.shareContent({ title: label, text: 'Hecho con Aura3D', files: [file] });
      if (shared) say('ok', 'Compartido');
    } catch (err) {
      say('error', err instanceof Error ? err.message : 'No se pudo compartir.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    const ok = await exporter.copyBlobToClipboard(blob);
    if (ok) say('ok', 'Copiada al portapapeles');
    else say('error', 'Tu navegador no permite copiar imágenes. Usa Descargar.');
  };

  const secondary = `inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-3 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 disabled:opacity-50 ${FOCUS_RING}`;
  const cols = 1 + (canShare ? 1 : 0) + (canCopy ? 1 : 0);

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => void download()}
        className={`flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all hover:brightness-110 active:scale-[0.99] ${FOCUS_RING}`}
      >
        <Download className="h-4 w-4" />
        Descargar {extensionFor(blob).toUpperCase()}
      </button>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {canShare && (
          <button type="button" onClick={() => void share()} disabled={busy} className={secondary}>
            <Share2 className="h-3.5 w-3.5 text-violet-300" />
            Compartir
          </button>
        )}
        {canCopy && (
          <button type="button" onClick={() => void copy()} className={secondary}>
            <Copy className="h-3.5 w-3.5 text-sky-300" />
            Copiar
          </button>
        )}
        <button type="button" onClick={() => exporter.openInstagramDirect()} className={secondary}>
          <ExternalLink className="h-3.5 w-3.5 text-pink-300" />
          Instagram
        </button>
      </div>
      <div className="min-h-[2.25rem]" aria-live="polite">
        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
              notice.kind === 'ok'
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {notice.kind === 'ok' ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2.5 text-center">
    <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-white/45">
      {icon}
      {label}
    </div>
    <div className="mt-1 font-mono text-xs font-bold text-white">{value}</div>
  </div>
);

const formatClock = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const rest = sec - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
};

/**
 * Recorte del vídeo: las marcas de la vista previa se aplican de verdad al exportar. El navegador no
 * puede cortar un webm sin recodificar, así que el tramo se reproduce y se vuelve a grabar (en tiempo
 * real: dura lo mismo que el tramo).
 */
const TrimSection: React.FC<{ fullDuration: number }> = ({ fullDuration }) => {
  const recordedBlob = useRecorderStore((s) => s.recordedBlob);
  const trimRange = useRecorderStore((s) => s.trimRange);
  const trimmedBlob = useRecorderStore((s) => s.trimmedBlob);
  const setTrimmedBlob = useRecorderStore((s) => s.setTrimmedBlob);
  const setTrimRange = useRecorderStore((s) => s.setTrimRange);
  const videoBitrate = useRecorderStore((s) => s.videoBitrate);

  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Si se sale de la pestaña o se cierra el estudio, el recorte en curso se cancela
  useEffect(() => () => abortRef.current?.abort(), []);

  const length = Math.max(0, trimRange.end - trimRange.start);

  const apply = async () => {
    if (!recordedBlob || working) return;
    setError(null);
    setWorking(true);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const blob = await trimVideoBlob(recordedBlob, {
        start: trimRange.start,
        end: trimRange.end,
        fallbackDuration: fullDuration,
        videoBitsPerSecond: videoBitrate,
        onProgress: setProgress,
        signal: controller.signal,
      });
      setTrimmedBlob(blob);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'No se pudo recortar el vídeo.');
      }
    } finally {
      setWorking(false);
      abortRef.current = null;
    }
  };

  const useFullVideo = () => {
    setTrimmedBlob(null);
    setTrimRange(0, fullDuration);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Scissors className="h-4 w-4 text-violet-300" />
            Recorte
          </p>
          <p className="mt-1 font-mono text-xs text-white/55">
            {formatClock(trimRange.start)} → {formatClock(trimRange.end)} · {length.toFixed(1)} s de {fullDuration.toFixed(1)} s
          </p>
        </div>
        <button
          type="button"
          onClick={useFullVideo}
          disabled={working}
          className="text-xs font-medium text-white/45 underline-offset-4 transition-colors hover:text-white/80 hover:underline disabled:opacity-40"
        >
          Usar el vídeo completo
        </button>
      </div>

      {trimmedBlob ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check className="h-3.5 w-3.5 shrink-0" />
          Recorte listo: {formatSize(trimmedBlob.size)}. Lo que descargues o compartas abajo es el tramo.
        </p>
      ) : working ? (
        <div className="space-y-2" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400 transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/55">
            <span>Recortando… {Math.round(progress * 100)}% (se reproduce y se vuelve a grabar)</span>
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1 font-semibold text-white/75 hover:bg-white/10"
            >
              <X className="h-3 w-3" />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void apply()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-900/40 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            <Scissors className="h-4 w-4" />
            Aplicar recorte
          </button>
          <p className="text-[11px] leading-relaxed text-white/40">
            Tarda lo que dura el tramo (~{Math.ceil(length)} s) porque se vuelve a grabar. El archivo original no se modifica.
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export const ExportPanel: React.FC = () => {
  const recordedBlob = useRecorderStore((s) => s.recordedBlob);
  const recordedFileName = useRecorderStore((s) => s.recordedFileName);
  const recordingDuration = useRecorderStore((s) => s.recordingDuration);
  const resolutionPreset = useRecorderStore((s) => s.resolutionPreset);
  const customWidth = useRecorderStore((s) => s.customWidth);
  const customHeight = useRecorderStore((s) => s.customHeight);
  const recordedDuration = useRecorderStore((s) => s.recordedDuration);
  const trimRange = useRecorderStore((s) => s.trimRange);
  const trimmedBlob = useRecorderStore((s) => s.trimmedBlob);
  const cardBlob = useRecorderStore((s) => s.generatedCardBlob);
  const cardUrl = useRecorderStore((s) => s.generatedCardUrl);
  const cardFormat = useRecorderStore((s) => s.cardConfig.format);
  const setActiveTab = useRecorderStore((s) => s.setActiveTab);
  // Marca de tiempo para nombrar los archivos: se fija una vez (Date.now() en el render no es estable)
  const [stamp] = useState(() => Date.now());

  if (!recordedBlob && !cardBlob) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <FileVideo className="h-12 w-12 stroke-[1.2] text-white/30" />
        <div>
          <p className="text-sm font-semibold text-white/80">Todavía no hay nada que exportar</p>
          <p className="mt-1 text-xs text-white/40">Graba un clip o diseña una tarjeta y aparecerá aquí.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 ${FOCUS_RING}`}
          >
            Grabar un clip
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/25 ${FOCUS_RING}`}
          >
            Diseñar una tarjeta
          </button>
        </div>
      </div>
    );
  }

  // Duración real (la calcula la vista previa); los segundos contados al grabar son el respaldo
  const fullDuration = recordedDuration || recordingDuration;
  const trimActive = isTrimActive(trimRange.start, trimRange.end, fullDuration);
  // Con recorte activo se exporta el tramo ya generado (o nada hasta generarlo); sin recorte, el original
  const videoBlob = recordedBlob ? (trimActive ? trimmedBlob : recordedBlob) : null;
  const shownDuration = trimActive && trimmedBlob ? Math.max(0, trimRange.end - trimRange.start) : fullDuration;
  const baseName = recordedFileName || `aura3d-${stamp}.${recordedBlob ? extensionFor(recordedBlob) : 'webm'}`;
  // El recorte se vuelve a grabar: la extensión sigue el tipo real del archivo resultante
  const videoFileName =
    trimActive && trimmedBlob
      ? baseName.replace(/\.[^.]+$/, '') + `_recorte.${extensionFor(trimmedBlob)}`
      : baseName;

  const preset = RESOLUTION_PRESETS[resolutionPreset];
  const videoSize =
    resolutionPreset === 'custom' ? `${customWidth}×${customHeight}` : `${preset.width}×${preset.height}`;

  return (
    <div className="flex flex-col gap-8 text-white">
      {cardBlob && (
        <section className="space-y-4" aria-label="Tarjeta">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            <ImageIcon className="h-3.5 w-3.5 text-violet-300" />
            Tarjeta
          </h3>
          <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {cardUrl && (
              <img
                src={cardUrl}
                alt="Tarjeta generada"
                className={`rounded-xl border border-white/15 object-cover ${cardFormat === 'story' ? 'w-24' : 'w-28'}`}
              />
            )}
            <div className="min-w-0 flex-1 space-y-1.5 text-xs text-white/55">
              <p className="text-sm font-semibold text-white">Última tarjeta generada</p>
              <p>{formatSize(cardBlob.size)} · {extensionFor(cardBlob).toUpperCase()}</p>
              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`text-violet-300 underline-offset-4 hover:underline ${FOCUS_RING}`}
              >
                Volver a editarla
              </button>
            </div>
          </div>
          <ArtifactActions blob={cardBlob} fileName={`Aura3D_tarjeta_${stamp}.${extensionFor(cardBlob)}`} canCopy label="Tarjeta de Aura3D" />
        </section>
      )}

      {recordedBlob && (
        <section className="space-y-4" aria-label="Vídeo">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            <FileVideo className="h-3.5 w-3.5 text-violet-300" />
            Vídeo
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={<Layers className="h-3 w-3" />} label="Resolución" value={videoSize} />
            <Stat icon={<Clock className="h-3 w-3" />} label="Duración" value={`${shownDuration.toFixed(1)} s`} />
            <Stat icon={<HardDrive className="h-3 w-3" />} label="Tamaño" value={formatSize(videoBlob?.size ?? recordedBlob.size)} />
          </div>

          {trimActive && <TrimSection fullDuration={fullDuration} />}

          {videoBlob ? (
            <ArtifactActions
              blob={videoBlob}
              fileName={videoFileName}
              canCopy={false}
              label="Grabación de Aura3D"
            />
          ) : (
            <p className="text-xs leading-relaxed text-white/45">
              Aplica el recorte para poder descargar o compartir solo el tramo marcado, o elige «Usar el vídeo completo».
            </p>
          )}
        </section>
      )}
    </div>
  );
};
