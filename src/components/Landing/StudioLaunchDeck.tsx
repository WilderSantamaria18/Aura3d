import React, { useState } from 'react';
import { Play, UploadCloud, Mic, ArrowRight, ShieldCheck, Cpu, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StudioLaunchDeckProps {
  onStartExperience: () => void;
  onMicStart: () => void;
  onFileLoaded: (file: File) => void;
}

/**
 * StudioLaunchDeck
 * Consola central de lanzamiento interactiva con dropzone de audio y lanzador de experiencia 3D.
 */
export const StudioLaunchDeck: React.FC<StudioLaunchDeckProps> = ({
  onStartExperience,
  onMicStart,
  onFileLoaded,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onFileLoaded(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-container bg-surface-dock border border-border-subtle shadow-dock p-6 sm:p-8 material-regular text-text-primary font-mono select-none text-center">
      {/* ── Eyebrow Header ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent-cyan/15 border border-border-subtle text-accent-cyan text-caption uppercase tracking-wider mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{t('landing.systemReady')}</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold tracking-studio-tight text-text-primary mb-2 font-heading text-scrim-3d">
        {t('landing.launchDeckTitle')}
      </h2>
      <p className="text-xs sm:text-sm text-text-secondary font-medium max-w-md mx-auto mb-6 leading-relaxed font-display text-scrim-3d">
        {t('landing.launchDeckSubtitle')}
      </p>

      {/* ── Input Action Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 text-left">
        {/* Dropzone Local Files */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`min-h-[44px] p-4 rounded-card border transition-all cursor-pointer ${
            isDragging
              ? 'border-accent-cyan bg-accent-cyan/20 scale-[1.02] shadow-card'
              : 'border-border-subtle bg-surface-base/60 hover:border-border-medium hover:bg-white/[0.04]'
          }`}
        >
          <label className="flex flex-col gap-2 cursor-pointer min-h-[44px]">
            <div className="w-8 h-8 rounded-control bg-white/10 border border-border-subtle flex items-center justify-center text-accent-cyan">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-primary text-scrim-3d">{t('landing.localFiles')}</div>
              <div className="text-caption text-text-secondary font-mono mt-0.5 font-medium">
                {t('landing.localFilesSub')}
              </div>
            </div>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg"
              aria-label={t('landing.localFiles')}
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>

        {/* Live Microphone Input */}
        <div
          role="button"
          tabIndex={0}
          onClick={onMicStart}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onMicStart();
            }
          }}
          aria-label={t('landing.micCapture')}
          className="min-h-[44px] p-4 rounded-card border border-border-subtle bg-surface-base/60 hover:border-border-medium hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col justify-between btn-spring active:scale-[0.97]"
        >
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-control bg-white/10 border border-border-subtle flex items-center justify-center text-accent-rose">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-primary text-scrim-3d">{t('landing.micCapture')}</div>
              <div className="text-caption text-text-secondary font-mono mt-0.5 font-medium">
                {t('landing.micCaptureSub')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Big Primary Launch CTA ── */}
      <button
        type="button"
        onClick={onStartExperience}
        aria-label={t('landing.enterVisualizer')}
        className="w-full min-h-[44px] py-3.5 px-6 rounded-control bg-white text-black font-bold text-xs sm:text-sm tracking-wider uppercase btn-spring flex items-center justify-center gap-3 shadow-card group cursor-pointer active:scale-[0.97]"
      >
        <Play className="w-4 h-4 fill-current text-black group-hover:scale-110 transition-transform" />
        <span>{t('landing.enterVisualizer')}</span>
        <ArrowRight className="w-4 h-4 text-black/70 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* System Specs Footer Badges */}
      <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-center gap-4 text-caption text-text-secondary font-medium font-mono">
        <span className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-accent-cyan" /> GPU Shaders
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-status-success" /> 24-Bit / 48kHz
        </span>
        <span>•</span>
        <span>0 Latencia</span>
      </div>
    </div>
  );
};

export default StudioLaunchDeck;
