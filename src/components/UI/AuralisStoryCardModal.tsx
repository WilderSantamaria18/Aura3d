import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, Download, Share2, Sparkles, Music2, Radio, Check, Layers, Disc3 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { harmonicAnalysisService } from '../../services/harmonicAnalysisService';
import { sessionStatsService } from '../../services/sessionStatsService';
import { waveformService } from '../../services/waveformService';

export const AuralisStoryCardModal: React.FC = () => {
  const { isStoryCardOpen, setStoryCardOpen, currentTrack, isLucid, lucidTheme, lucidPrimaryColor, bpm } = usePlayerStore();
  const { mood, dominantPitch } = useAIAudioEngine();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const previewCardRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => sessionStatsService.getStats(), [isStoryCardOpen]);
  const harmonicKey = useMemo(() => harmonicAnalysisService.getLastResult(), [isStoryCardOpen]);

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#00e5ff';
  const activeSecondary = isLucid ? (lucidTheme.secondary || '#ff0055') : '#ff0055';

  const trackTitle = currentTrack?.title || 'Aura 3D Session';
  const trackArtist = currentTrack?.artist || 'Auralis Visualizer';
  const trackKey = currentTrack ? `${currentTrack.id || currentTrack.title}_${currentTrack.artist}` : 'auralis_story_default';
  const waveformData = useMemo(() => waveformService.generateDeterministic(trackKey, 180, 48), [trackKey]);

  const moodLabels: Record<string, { label: string; icon: string }> = {
    energetic: { label: 'Energético', icon: '⚡' },
    happy: { label: 'Alegre', icon: '✨' },
    chill: { label: 'Relajado', icon: '🌙' },
    melancholic: { label: 'Melancólico', icon: '🌊' },
  };

  const currentMood = moodLabels[mood] || { label: 'Inmersivo', icon: '✨' };

  if (!isStoryCardOpen) return null;

  // High-Resolution 1080x1920 (9:16) Canvas Render and Export
  const renderCardToCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');

    // 1. Background Gradient
    const bgGrad = ctx.createRadialGradient(540, 500, 100, 540, 960, 1100);
    bgGrad.addColorStop(0, '#0a0d1e');
    bgGrad.addColorStop(0.5, '#04060d');
    bgGrad.addColorStop(1, '#010204');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Ambient Color Glow in upper area
    const glowGrad = ctx.createRadialGradient(540, 680, 50, 540, 680, 450);
    glowGrad.addColorStop(0, `${activeColor}40`);
    glowGrad.addColorStop(0.7, `${activeSecondary}20`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 200, 1080, 1000);

    // 3. Header Branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('AURALIS STUDIO', 540, 180);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '22px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SESIÓN DE AUDIO INMERSIVO 3D', 540, 225);

    // 4. Center Artwork / Disc Placeholder
    const artX = 240;
    const artY = 360;
    const artSize = 600;

    // Artwork drop shadow & border
    ctx.shadowColor = `${activeColor}60`;
    ctx.shadowBlur = 50;
    ctx.fillStyle = '#0f1424';
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, 36);
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Artwork inner vinyl design
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, 36);
    ctx.clip();

    const discGrad = ctx.createRadialGradient(540, 660, 50, 540, 660, 300);
    discGrad.addColorStop(0, '#1a2238');
    discGrad.addColorStop(0.8, '#0a0d18');
    discGrad.addColorStop(1, '#05070e');
    ctx.fillStyle = discGrad;
    ctx.fillRect(artX, artY, artSize, artSize);

    // Stylized concentric vinyl rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    for (let r = 80; r < 280; r += 24) {
      ctx.beginPath();
      ctx.arc(540, 660, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center vinyl badge
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.arc(540, 660, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05070e';
    ctx.beginPath();
    ctx.arc(540, 660, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Track Title & Artist
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(trackTitle.length > 24 ? trackTitle.slice(0, 24) + '...' : trackTitle, 540, 1070);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '32px sans-serif';
    ctx.fillText(trackArtist, 540, 1130);

    // 6. Badges (Camelot Key & AI Mood)
    const badgeY = 1220;
    // Camelot badge
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(190, badgeY - 35, 320, 70, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d8b4fe';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`🎼 ${harmonicKey.camelot} · ${harmonicKey.shortKey}`, 350, badgeY + 10);

    // Mood badge
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.beginPath();
    ctx.roundRect(570, badgeY - 35, 320, 70, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${currentMood.icon} ${currentMood.label}`, 730, badgeY + 10);

    // 7. Waveform Spectrogram
    const waveY = 1380;
    const waveW = 800;
    const waveStartX = 140;
    const barWidth = waveW / waveformData.peaks.length - 4;

    for (let i = 0; i < waveformData.peaks.length; i++) {
      const peak = waveformData.peaks[i];
      const h = Math.max(12, peak * 110);
      const x = waveStartX + i * (barWidth + 4);
      const y = waveY - h / 2;

      ctx.fillStyle = i < waveformData.peaks.length * 0.65 ? activeColor : 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, h, 4);
      ctx.fill();
    }

    // 8. Session Stats Summary Cards
    const cardY = 1520;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(140, cardY, 800, 160, 24);
    ctx.fill();
    ctx.stroke();

    // Stats content
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TIEMPO ESCUCHADO', 200, cardY + 60);
    ctx.fillText('TEMPO ESTIMADO', 620, cardY + 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${Math.floor(stats.totalSeconds / 60)} MINUTOS`, 200, cardY + 115);
    ctx.fillText(`${bpm > 0 ? bpm : 124} BPM`, 620, cardY + 115);

    // 9. Watermark Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DISFRUTADO EN AURALIS STUDIO · auralis.io', 540, 1810);

    return canvas;
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderCardToCanvas();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Auralis_Story_${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      a.click();
    } catch (err) {
      console.error('Error downloading story card:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderCardToCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          // Fallback to download if clipboard write fails
          handleDownload();
        }
      });
    } catch (err) {
      console.error('Error copying story card:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        className="relative w-full max-w-[420px] max-h-[92vh] overflow-y-auto rounded-3xl bg-[#090d1a]/95 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.9)] p-4 sm:p-5 flex flex-col gap-4 text-white font-sans custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-bold text-white">Tarjeta para Historias (9:16)</div>
              <div className="text-[10px] text-white/40 font-mono">Lista para Instagram Stories y TikTok</div>
            </div>
          </div>
          <button
            onClick={() => setStoryCardOpen(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 9:16 Preview Container */}
        <div
          ref={previewCardRef}
          className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden border border-white/15 p-4 flex flex-col justify-between select-none shadow-2xl"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${activeColor}30 0%, #080b18 60%, #03050c 100%)`,
          }}
        >
          {/* Card Top Branding */}
          <div className="text-center pt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 font-bold block">
              Auralis Studio
            </span>
            <span className="text-[8px] tracking-widest uppercase text-white/40 font-sans block mt-0.5">
              Sesión de Audio Inmersivo 3D
            </span>
          </div>

          {/* Card Center Artwork */}
          <div className="flex flex-col items-center gap-3 my-auto">
            <div
              className="relative w-40 h-40 rounded-2xl bg-[#0f1424] border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden"
              style={{ boxShadow: `0 12px 36px ${activeColor}35` }}
            >
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-[radial-gradient(circle,#1a2238_0%,#080b18_100%)]">
                <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center">
                  <Disc3 className="w-12 h-12 text-white/70 animate-spin" style={{ animationDuration: '14s' }} />
                </div>
              </div>
            </div>

            <div className="text-center px-2 max-w-full">
              <div className="text-base font-bold text-white truncate drop-shadow-md">
                {trackTitle}
              </div>
              <div className="text-xs text-white/60 truncate mt-0.5">
                {trackArtist}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[9px] font-mono font-bold">
                🎼 {harmonicKey.camelot} · {harmonicKey.shortKey}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-sans font-bold">
                {currentMood.icon} {currentMood.label}
              </span>
            </div>

            {/* Mini Waveform in Preview */}
            <div className="w-full px-4 flex items-center justify-center gap-[2px] h-9 pt-1">
              {waveformData.peaks.slice(0, 36).map((p, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    height: `${Math.max(15, p * 100)}%`,
                    backgroundColor: i < 24 ? activeColor : 'rgba(255, 255, 255, 0.25)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card Footer */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[9px] font-mono text-white/50">
            <span>{Math.floor(stats.totalSeconds / 60)} min escuchados</span>
            <span className="text-cyan-400">#Auralis3D</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generando...' : 'Descargar 9:16 (PNG)'}</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={isExporting}
            className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Copiar imagen al portapapeles"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuralisStoryCardModal;
