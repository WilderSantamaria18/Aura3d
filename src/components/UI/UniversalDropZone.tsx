import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Disc3, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface UniversalDropZoneProps {
  onFilesDropped: (files: File[]) => void;
}

export const UniversalDropZone: React.FC<UniversalDropZoneProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCount, setDraggedCount] = useState<number>(1);
  const dragCounterRef = useRef(0);

  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const setAutoNotification = usePlayerStore((s) => s.setAutoNotification);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;

      if (e.dataTransfer?.items) {
        // Count audio items if possible
        const count = Array.from(e.dataTransfer.items).filter(
          (item) => item.kind === 'file'
        ).length;
        if (count > 0) {
          setDraggedCount(count);
        }
      }

      setIsDragging(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;

      const validAudioFiles = Array.from(e.dataTransfer.files).filter((file) => {
        return (
          file.type.startsWith('audio/') ||
          /\.(mp3|wav|ogg|flac|m4a|aac|opus|weba|wma)$/i.test(file.name)
        );
      });

      if (validAudioFiles.length > 0) {
        onFilesDropped(validAudioFiles);
        setAutoNotification({
          id: Date.now(),
          type: 'success',
          message:
            validAudioFiles.length === 1
              ? `🎵 Pista cargada: ${validAudioFiles[0].name.replace(/\.[^/.]+$/, '')}`
              : `🎶 ${validAudioFiles.length} canciones añadidas a la sesión de mezcla`,
        });
      } else {
        setAutoNotification({
          id: Date.now(),
          type: 'warning',
          message: '⚠️ Formato no reconocido. Usa archivos MP3, WAV, FLAC, OGG o M4A.',
        });
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped, setAutoNotification]);

  if (!isDragging) return null;

  const accentColor = isLucid ? lucidTheme.primary : '#00f5ff';
  const glowColor = isLucid ? lucidTheme.glow : 'rgba(0, 245, 255, 0.4)';

  return (
    <div
      className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center p-6 md:p-12 transition-all duration-300"
      style={{
        backgroundColor: 'rgba(3, 5, 12, 0.88)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Outer Studio Boundary Box */}
      <div
        className="relative w-full max-w-2xl aspect-[16/10] sm:aspect-[16/9] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-transform scale-100 animate-in fade-in zoom-in-95 duration-200 shadow-2xl"
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 60px ${glowColor}, inset 0 0 40px ${glowColor}`,
          background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(5,8,18,0.92) 75%)`,
        }}
      >
        {/* Visual Studio Corner Markers */}
        <span
          className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg"
          style={{ borderColor: accentColor }}
        />
        <span
          className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg"
          style={{ borderColor: accentColor }}
        />
        <span
          className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg"
          style={{ borderColor: accentColor }}
        />
        <span
          className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 rounded-br-lg"
          style={{ borderColor: accentColor }}
        />

        {/* Studio Ingestion Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ color: accentColor }} />
          <span className="text-[11px] font-mono tracking-widest uppercase text-white/90 font-medium">
            HI-FI AUDIO INGESTION TARGET
          </span>
        </div>

        {/* Animated Central Icon with Soundwaves */}
        <div className="relative mb-5 flex items-center justify-center">
          <div
            className="absolute w-28 h-28 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(12, 16, 28, 0.9)',
              boxShadow: `0 0 30px ${glowColor}`,
            }}
          >
            {draggedCount > 1 ? (
              <Disc3 className="w-10 h-10 animate-spin text-white" style={{ animationDuration: '3s' }} />
            ) : (
              <UploadCloud className="w-10 h-10 animate-bounce" style={{ color: accentColor }} />
            )}
          </div>
        </div>

        {/* Dynamic Title */}
        <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
          {draggedCount > 1 ? (
            <>
              Suelta <span className="font-semibold text-white">{draggedCount} canciones</span> para mezclar
            </>
          ) : (
            'Suelta tu audio aquí para visualizar'
          )}
        </h2>

        <p className="text-white/60 text-xs sm:text-sm mt-2 max-w-md font-mono">
          Procesamiento directo a 60 FPS con Web Audio Analyser y shaders 3D reactivos.
        </p>

        {/* Supported Format Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6">
          {['MP3', 'WAV', 'FLAC', 'OGG', 'M4A', 'AAC'].map((fmt) => (
            <span
              key={fmt}
              className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium tracking-wider bg-white/[0.06] border border-white/10 text-white/80"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UniversalDropZone;
