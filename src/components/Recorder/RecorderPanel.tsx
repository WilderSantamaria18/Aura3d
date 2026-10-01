import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, PlaySquare, Share2, Sparkles, Video, X } from 'lucide-react';
import { useRecorderStore, type RecorderTab } from '../../store/recorderStore';
import { ScreenCaptureSelector } from './ScreenCaptureSelector';
import { ResolutionSelector } from './ResolutionSelector';
import { DurationControl } from './DurationControl';
import { PreviewPlayer } from './PreviewPlayer';
import { ExportPanel } from './ExportPanel';
import { CardStudio } from '../Cards/CardStudio';
import { FOCUS_RING } from '../Cards/controls';

const formatClock = (sec: number) =>
  `${Math.floor(sec / 60).toString().padStart(2, '0')}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;

/** Indicador de grabación en la cabecera: visible desde cualquier pestaña y lleva a detenerla */
const RecordingBadge: React.FC = () => {
  const isRecording = useRecorderStore((s) => s.isRecording);
  const elapsed = useRecorderStore((s) => s.elapsedSeconds);
  const setActiveTab = useRecorderStore((s) => s.setActiveTab);
  if (!isRecording) return null;
  return (
    <button
      type="button"
      onClick={() => setActiveTab('record')}
      className={`flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/25 ${FOCUS_RING}`}
      title="Ir a la pestaña Grabar para detener"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      <span className="font-mono">REC {formatClock(elapsed)}</span>
      <span className="hidden text-red-200/70 sm:inline">· Detener</span>
    </button>
  );
};

export const RecorderPanel: React.FC = () => {
  const isModalOpen = useRecorderStore((s) => s.isModalOpen);
  const closeModal = useRecorderStore((s) => s.closeModal);
  const activeTab = useRecorderStore((s) => s.activeTab);
  const setActiveTab = useRecorderStore((s) => s.setActiveTab);
  const isRecording = useRecorderStore((s) => s.isRecording);
  const hasVideo = useRecorderStore((s) => s.recordedBlob !== null);
  const hasCard = useRecorderStore((s) => s.generatedCardBlob !== null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // El foco entra en el diálogo al abrirlo (lectores de pantalla y teclado)
  useEffect(() => {
    if (isModalOpen) dialogRef.current?.focus();
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const tabs: { id: RecorderTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'record', label: 'Grabar', icon: <Video className="h-3.5 w-3.5" /> },
    { id: 'preview', label: 'Vista previa', icon: <PlaySquare className="h-3.5 w-3.5" />, badge: hasVideo ? 'Listo' : undefined },
    { id: 'cards', label: 'Tarjetas', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'export', label: 'Exportar', icon: <Share2 className="h-3.5 w-3.5" />, badge: hasVideo || hasCard ? '●' : undefined },
  ];

  const onTabKeys = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === activeTab);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(tabs[next].id);
    document.getElementById(`studio-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex select-none items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isRecording && closeModal()}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/15 bg-zinc-950/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl focus-visible:!outline-none"
        >
          {/* Resplandor de marca */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
          />

          <header className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-sky-400 shadow-lg shadow-violet-600/30">
                <Disc3 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 id="studio-title" className="truncate text-[15px] font-bold tracking-tight text-white">
                  Aura Social Studio
                </h2>
                <p className="truncate text-xs text-white/45">
                  Graba, diseña y comparte para Instagram, TikTok y Shorts
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <RecordingBadge />
              <button
                type="button"
                onClick={() => !isRecording && closeModal()}
                disabled={isRecording}
                aria-label="Cerrar el estudio"
                title={isRecording ? 'Detén la grabación para cerrar' : 'Cerrar (Esc)'}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="relative px-5 pb-1 pt-4 sm:px-6">
            <div
              role="tablist"
              aria-label="Secciones del estudio"
              onKeyDown={onTabKeys}
              className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1"
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`studio-tab-${tab.id}`}
                    aria-selected={active}
                    aria-controls={`studio-panel-${tab.id}`}
                    // En pantallas pequeñas solo se ve el icono: sin esto el botón no tendría nombre accesible
                    aria-label={tab.label}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold tracking-tight transition-colors sm:px-3 ${FOCUS_RING}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="studio-active-tab"
                        className="absolute inset-0 rounded-xl border border-white/25 bg-gradient-to-b from-white/[0.18] to-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.4)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                        active ? 'text-white' : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {tab.icon}
                      <span className="max-sm:hidden">{tab.label}</span>
                      {tab.badge && (
                        <span className="rounded-full border border-violet-300/30 bg-violet-500/30 px-1.5 text-[9px] font-semibold text-violet-100">
                          {tab.badge}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id={`studio-panel-${activeTab}`}
            aria-labelledby={`studio-tab-${activeTab}`}
            className="custom-scrollbar relative flex-1 overflow-y-auto p-5 sm:p-6"
          >
            {activeTab === 'record' && (
              <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
                <ScreenCaptureSelector />
                <div className="space-y-8">
                  <ResolutionSelector />
                  <DurationControl />
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="mx-auto max-w-2xl">
                <PreviewPlayer />
              </div>
            )}

            {activeTab === 'cards' && <CardStudio />}

            {activeTab === 'export' && (
              <div className="mx-auto max-w-xl">
                <ExportPanel />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
