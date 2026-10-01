import React, { useState } from 'react';
import { AlertCircle, Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { useRecorderStore } from '../../store/recorderStore';
import { exporter } from '../../services/exporter';
import { cardFileName, exportCardBlob, type CardExportInput } from '../../services/storyCard/assets';
import { CARD_FORMATS } from '../../services/storyCard/config';
import { FOCUS_RING } from './controls';

type Busy = 'download' | 'share' | 'copy' | null;

const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
type Notice = { kind: 'ok' | 'error'; text: string } | null;

/**
 * Acciones sobre la tarjeta: descargar PNG, compartir (hoja nativa del móvil), copiar y abrir
 * Instagram. Siempre exporta con el mismo renderizador que la vista previa.
 */
export const CardActions: React.FC<CardExportInput> = ({ config, content, assets }) => {
  const setGeneratedCard = useRecorderStore((s) => s.setGeneratedCard);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const spec = CARD_FORMATS[config.format];
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const fileName = cardFileName(config, content.title);

  const say = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 4200);
  };

  const build = async (): Promise<Blob> => {
    const blob = await exportCardBlob({ config, content, assets });
    setGeneratedCard(blob); // queda disponible en la pestaña Exportar
    return blob;
  };

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await action();
    } catch (err) {
      console.error('[storyCard] acción fallida:', err);
      say('error', err instanceof Error ? err.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(null);
    }
  };

  const download = () =>
    run('download', async () => {
      const blob = await build();
      await exporter.downloadBlob(blob, fileName);
      say('ok', `Guardada como ${fileName} · ${formatBytes(blob.size)}`);
    });

  const share = () =>
    run('share', async () => {
      const blob = await build();
      const file = exporter.createFileFromBlob(blob, fileName);
      if (!navigator.canShare?.({ files: [file] })) {
        // Este navegador no comparte archivos: se descarga en su lugar y se avisa
        await exporter.downloadBlob(blob, fileName);
        say('ok', 'Tu navegador no puede compartir archivos: la imagen se ha descargado.');
        return;
      }
      const handle = content.handle ? ` · @${content.handle}` : '';
      const shared = await exporter.shareContent({
        title: content.title,
        text: `${content.title} — ${content.artist}${handle}`,
        files: [file],
      });
      if (shared) say('ok', 'Tarjeta compartida');
      // Si el usuario cierra la hoja de compartir no se muestra nada: no es un error
    });

  const copy = () =>
    run('copy', async () => {
      const blob = await build();
      const ok = await exporter.copyBlobToClipboard(blob);
      if (ok) say('ok', 'Imagen copiada al portapapeles');
      else say('error', 'Tu navegador no permite copiar imágenes. Usa Descargar.');
    });

  const iconBtn = `flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

  return (
    <div className="relative">
      {/* El aviso flota sobre el pie para no quitar altura al editor */}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-full mb-2">
        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-xs shadow-xl backdrop-blur-xl ${
              notice.kind === 'ok'
                ? 'border-emerald-400/30 bg-emerald-950/90 text-emerald-200'
                : 'border-rose-400/30 bg-rose-950/90 text-rose-200'
            }`}
          >
            {notice.kind === 'ok' ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={download}
          disabled={busy !== null}
          className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
        >
          {busy === 'download' ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="truncate">Generando…</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Descargar {config.fileFormat === 'jpeg' ? 'JPG' : 'PNG'} <span className="font-medium text-white/70">· {spec.width}×{spec.height}</span>
              </span>
            </>
          )}
        </button>
        {canShare && (
          <button type="button" onClick={share} disabled={busy !== null} className={iconBtn} aria-label="Compartir" title="Compartir">
            <Share2 className="h-4 w-4 text-violet-300" />
          </button>
        )}
        <button type="button" onClick={copy} disabled={busy !== null} className={iconBtn} aria-label="Copiar imagen" title="Copiar imagen">
          <Copy className="h-4 w-4 text-sky-300" />
        </button>
        <button
          type="button"
          onClick={() => exporter.openInstagramDirect()}
          className={iconBtn}
          aria-label="Abrir Instagram"
          title="Abrir Instagram"
        >
          <ExternalLink className="h-4 w-4 text-pink-300" />
        </button>
      </div>
    </div>
  );
};
