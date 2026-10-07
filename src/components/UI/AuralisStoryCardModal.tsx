import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, Download, Share2, Sparkles, Film, Check, Disc3, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { harmonicAnalysisService } from '../../services/harmonicAnalysisService';
import { sessionStatsService } from '../../services/sessionStatsService';
import { waveformService } from '../../services/waveformService';
import { AudioEngine } from '../../services/audioEngine';
import { useShallow } from 'zustand/react/shallow';

export const AuralisStoryCardModal: React.FC = () => {
  const { isStoryCardOpen, setStoryCardOpen, currentTrack, isLucid, lucidTheme, lucidPrimaryColor, bpm } = usePlayerStore(
    useShallow((s) => ({
      isStoryCardOpen: s.isStoryCardOpen,
      setStoryCardOpen: s.setStoryCardOpen,
      currentTrack: s.currentTrack,
      isLucid: s.isLucid,
      lucidTheme: s.lucidTheme,
      lucidPrimaryColor: s.lucidPrimaryColor,
      bpm: s.bpm,
    }))
  );
  const { mood } = useAIAudioEngine();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const previewCardRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => sessionStatsService.getStats(), [isStoryCardOpen]);
  const harmonicKey = useMemo(() => harmonicAnalysisService.getLastResult(), [isStoryCardOpen]);

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#00e5ff';
  const activeSecondary = isLucid ? (lucidTheme.secondary || '#ff0055') : '#ff0055';

  const trackTitle = currentTrack?.title || 'Aura 3D Session';
  const trackArtist = currentTrack?.artist || 'Auralis Visualizer';
  const trackKey = currentTrack ? `${currentTrack.id || currentTrack.title}_${currentTrack.artist}` : 'auralis_story_default';
  const waveformData = useMemo(() => waveformService.generateDeterministic(trackKey, 180, 48), [trackKey]);

  const moodLabels: Record<string, { label: string }> = {
    energetic: { label: 'Energético' },
    happy: { label: 'Alegre' },
    chill: { label: 'Relajado' },
    melancholic: { label: 'Melancólico' },
  };

  const currentMood = moodLabels[mood] || { label: 'Inmersivo' };

  // Helper to load image asynchronously with CORS safety
  const loadCoverImage = (url?: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Reusable 9:16 Canvas Frame Renderer for both static PNG and animated Video frames
  const drawStoryFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tSec = 0,
    coverImg: HTMLImageElement | null = null
  ) => {
    const scale = width / 1080;

    // 1. Deep Space Background Gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.28,
      100 * scale,
      width * 0.5,
      height * 0.5,
      1100 * scale
    );
    bgGrad.addColorStop(0, '#0c1024');
    bgGrad.addColorStop(0.5, '#050711');
    bgGrad.addColorStop(1, '#010206');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Dynamic Ambient Color Aurora Bloom
    const pulse = 1 + Math.sin(tSec * 2.5) * 0.08;
    const glowGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.35,
      40 * scale * pulse,
      width * 0.5,
      height * 0.35,
      500 * scale * pulse
    );
    glowGrad.addColorStop(0, `${activeColor}45`);
    glowGrad.addColorStop(0.65, `${activeSecondary}20`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, height * 0.08, width, height * 0.55);

    // 3. Header Branding
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(36 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = `${Math.round(6 * scale)}px`;
    ctx.fillText('AURALIS STUDIO', width * 0.5, 175 * scale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `${Math.round(21 * scale)}px sans-serif`;
    ctx.letterSpacing = `${Math.round(2 * scale)}px`;
    ctx.fillText('SESIÓN DE AUDIO INMERSIVO 3D', width * 0.5, 220 * scale);

    // 4. Center Vinyl Record with Cover Art and Anisotropic Conic Sheen
    const discCenterY = 660 * scale;
    const discRadius = 290 * scale;
    const discCenterX = width * 0.5;

    // Outer Vinyl Shadow
    ctx.save();
    ctx.shadowColor = `${activeColor}66`;
    ctx.shadowBlur = 60 * scale;
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#08090f';
    ctx.fill();
    ctx.restore();

    // Vinyl Grooves (Lead-in, Track, and Run-out concentric ridges)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.8 * scale;
    for (let r = 110 * scale; r < discRadius - 8 * scale; r += 14 * scale) {
      ctx.beginPath();
      ctx.arc(discCenterX, discCenterY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer Beveled Vinyl Rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Anisotropic Dual-Lobe Conical Light Sheen ("Bowtie Reflection")
    ctx.save();
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, discRadius - 2 * scale, 0, Math.PI * 2);
    ctx.clip();

    // Draw opposing light cones
    const sheenRot = (tSec * 0.4) % (Math.PI * 2);
    ctx.translate(discCenterX, discCenterY);
    ctx.rotate(sheenRot);

    const drawCone = (startAngle: number) => {
      const coneGrad = ctx.createRadialGradient(0, 0, 20 * scale, 0, 0, discRadius);
      coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      coneGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.12)');
      coneGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, discRadius, startAngle - 0.35, startAngle + 0.35);
      ctx.closePath();
      ctx.fill();
    };

    drawCone(Math.PI * 0.25);
    drawCone(Math.PI * 1.25);
    ctx.restore();

    // 6. Central Album Artwork Label
    const labelRadius = 115 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, labelRadius, 0, Math.PI * 2);
    ctx.clip();

    // Rotation of album cover inside vinyl
    const spinAngle = tSec * 0.75;
    ctx.translate(discCenterX, discCenterY);
    ctx.rotate(spinAngle);

    if (coverImg) {
      ctx.drawImage(coverImg, -labelRadius, -labelRadius, labelRadius * 2, labelRadius * 2);
    } else {
      const labelGrad = ctx.createLinearGradient(-labelRadius, -labelRadius, labelRadius, labelRadius);
      labelGrad.addColorStop(0, activeColor);
      labelGrad.addColorStop(1, activeSecondary);
      ctx.fillStyle = labelGrad;
      ctx.fillRect(-labelRadius, -labelRadius, labelRadius * 2, labelRadius * 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('AURA', 0, 8 * scale);
    }
    ctx.restore();

    // Central Label Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, labelRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Spindle Bushing Grommet (Turned Brass/Chrome)
    const spindleRadius = 24 * scale;
    const spindleGrad = ctx.createRadialGradient(
      discCenterX - 4 * scale,
      discCenterY - 4 * scale,
      2 * scale,
      discCenterX,
      discCenterY,
      spindleRadius
    );
    spindleGrad.addColorStop(0, '#ffffff');
    spindleGrad.addColorStop(0.3, '#71717a');
    spindleGrad.addColorStop(0.7, '#27272a');
    spindleGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = spindleGrad;
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, spindleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Spindle Hole
    ctx.fillStyle = '#020305';
    ctx.beginPath();
    ctx.arc(discCenterX, discCenterY, 8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 7. Track Title & Artist
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(52 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0px';
    const displayTitle = trackTitle.length > 22 ? trackTitle.slice(0, 22) + '...' : trackTitle;
    ctx.fillText(displayTitle, width * 0.5, 1070 * scale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = `${Math.round(30 * scale)}px sans-serif`;
    ctx.fillText(trackArtist, width * 0.5, 1130 * scale);

    // 8. Key & Mood Badges
    const badgeY = 1220 * scale;
    // Camelot Key Badge
    ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect(190 * scale, badgeY - 35 * scale, 320 * scale, 70 * scale, 20 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d8b4fe';
    ctx.font = `bold ${Math.round(28 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`KEY ${harmonicKey.camelot} · ${harmonicKey.shortKey}`, 350 * scale, badgeY + 10 * scale);

    // Mood Badge
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.beginPath();
    ctx.roundRect(570 * scale, badgeY - 35 * scale, 320 * scale, 70 * scale, 20 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
    ctx.fillText(currentMood.label, 730 * scale, badgeY + 10 * scale);

    // 9. Soundwave Bars (Animated with musical frequency ripple)
    const waveY = 1380 * scale;
    const waveW = 800 * scale;
    const waveStartX = 140 * scale;
    const barCount = 42;
    const barWidth = waveW / barCount - 4 * scale;

    for (let i = 0; i < barCount; i++) {
      const peakIdx = i % waveformData.peaks.length;
      const baseH = waveformData.peaks[peakIdx] || 0.4;
      const waveMotion = Math.sin(i * 0.25 + tSec * 6) * 0.25;
      const h = Math.max(14 * scale, (baseH + waveMotion) * 110 * scale);
      const x = waveStartX + i * (barWidth + 4 * scale);
      const y = waveY - h / 2;

      ctx.fillStyle = i < barCount * 0.65 ? activeColor : 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, h, 4 * scale);
      ctx.fill();
    }

    // 10. Session Stats Summary Card
    const cardY = 1520 * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect(140 * scale, cardY, 800 * scale, 160 * scale, 24 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `${Math.round(22 * scale)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('TIEMPO ESCUCHADO', 200 * scale, cardY + 60 * scale);
    ctx.fillText('TEMPO ESTIMADO', 620 * scale, cardY + 60 * scale);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(36 * scale)}px monospace`;
    ctx.fillText(`${Math.floor(stats.totalSeconds / 60)} MINUTOS`, 200 * scale, cardY + 115 * scale);
    ctx.fillText(`${bpm > 0 ? bpm : 124} BPM`, 620 * scale, cardY + 115 * scale);

    // 11. Watermark Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = `${Math.round(22 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('DISFRUTADO EN AURALIS STUDIO · auralis.io', width * 0.5, 1810 * scale);
  };

  // High-Resolution 1080x1920 (9:16) Static PNG Export
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');

      const coverImg = await loadCoverImage(currentTrack?.coverUrl);
      drawStoryFrame(ctx, 1080, 1920, 0, coverImg);

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

  // Clipboard copy
  const handleCopy = async () => {
    try {
      setIsExporting(true);
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coverImg = await loadCoverImage(currentTrack?.coverUrl);
      drawStoryFrame(ctx, 1080, 1920, 0, coverImg);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          handleDownload();
        }
      });
    } catch (err) {
      console.error('Error copying story card:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 🎬 Animated 9:16 Video Export (5 Seconds WebM/MP4 Recording with Audio)
  const handleExportVideo = async () => {
    try {
      setIsRecordingVideo(true);
      setVideoProgress(0);

      const width = 720;
      const height = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d canvas context');

      const coverImg = await loadCoverImage(currentTrack?.coverUrl);
      const canvasStream = canvas.captureStream(30);

      // Attempt to capture audio stream from AudioEngine
      const engine = AudioEngine.getInstance();
      let audioTrack: MediaStreamTrack | null = null;
      if (engine.audioContext && engine.masterGain) {
        try {
          const dest = engine.audioContext.createMediaStreamDestination();
          engine.masterGain.connect(dest);
          audioTrack = dest.stream.getAudioTracks()[0] || null;
        } catch {
          // Audio routing fallback
        }
      }

      const combinedTracks = [...canvasStream.getVideoTracks()];
      if (audioTrack) combinedTracks.push(audioTrack);
      const recordingStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const durationMs = 5000;
      const fps = 30;
      const totalFrames = Math.round((durationMs / 1000) * fps);
      let frame = 0;

      recorder.start();

      await new Promise<void>((resolve) => {
        const intervalId = setInterval(() => {
          frame++;
          const tSec = frame / fps;
          drawStoryFrame(ctx, width, height, tSec, coverImg);

          const progress = Math.min(100, Math.round((frame / totalFrames) * 100));
          setVideoProgress(progress);

          if (frame >= totalFrames) {
            clearInterval(intervalId);
            recorder.onstop = () => {
              const videoBlob = new Blob(chunks, { type: mimeType });
              const url = URL.createObjectURL(videoBlob);
              const a = document.createElement('a');
              a.href = url;
              const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
              a.download = `Auralis_Story_Clip_${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 10000);
              resolve();
            };
            recorder.stop();
          }
        }, 1000 / fps);
      });
    } catch (err) {
      console.error('Error generating 9:16 story video:', err);
    } finally {
      setIsRecordingVideo(false);
      setVideoProgress(0);
    }
  };

  if (!isStoryCardOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-2xl animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[420px] max-h-[92vh] overflow-y-auto liquid-glass liquid-glass-modal p-5 flex flex-col gap-4 text-white font-sans custom-scrollbar select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Grabber Pill */}
        <div className="w-10 h-1 rounded-full bg-white/25 mx-auto -mt-1 mb-0.5" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 shadow-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">Exportación Social 9:16</div>
              <div className="text-[10px] text-white/50 tracking-tight">Instagram Stories, Reels y TikTok</div>
            </div>
          </div>
          <button
            onClick={() => setStoryCardOpen(false)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 9:16 Preview Container (Apple Squircle Card) */}
        <div
          ref={previewCardRef}
          className="relative w-full aspect-[9/16] rounded-[24px] overflow-hidden border border-white/20 border-t-white/30 p-5 flex flex-col justify-between select-none shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
          style={{
            background: `radial-gradient(ellipse at 50% 25%, ${activeColor}35 0%, #090d1c 55%, #020409 100%)`,
          }}
        >
          {/* Card Top Branding */}
          <div className="text-center pt-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/90 font-bold block">
              AURALIS STUDIO
            </span>
            <span className="text-[8px] tracking-widest uppercase text-white/40 font-sans block mt-0.5">
              Audio Inmersivo 3D
            </span>
          </div>

          {/* Card Center Artwork */}
          <div className="flex flex-col items-center gap-3 my-auto">
            {/* Spinning Vinyl Disc with Cover Art and Sheen */}
            <div
              className="relative w-36 h-36 rounded-full bg-[#080910] border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center justify-center overflow-hidden animate-[spin_24s_linear_infinite]"
              style={{ boxShadow: `0 14px 40px ${activeColor}45` }}
            >
              {/* Concentric Vinyl Grooves */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-40 mix-blend-overlay"
                style={{
                  background: 'repeating-radial-gradient(circle, transparent 0, transparent 2px, rgba(255,255,255,0.12) 2.5px, transparent 3.5px)',
                }}
              />

              {/* Anisotropic Conical Reflection */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-50"
                style={{
                  background: 'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.3) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.3) 225deg, transparent 270deg, transparent 360deg)',
                }}
              />

              {/* Center Artwork Label */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/40 shadow-inner flex items-center justify-center bg-black/80">
                {currentTrack?.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Disc3 className="w-8 h-8 text-cyan-300" />
                )}
              </div>

              {/* Center Spindle Hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#030306] border border-white/50 shadow-md pointer-events-none" />
            </div>

            {/* Song Meta */}
            <div className="text-center px-2 max-w-full">
              <div className="text-base font-bold text-white truncate drop-shadow-md">
                {trackTitle}
              </div>
              <div className="text-xs text-white/60 truncate mt-0.5 font-medium">
                {trackArtist}
              </div>
            </div>

            {/* iOS Frosted Badges */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/35 text-purple-200 text-[10px] font-mono font-bold backdrop-blur-md shadow-sm">
                KEY {harmonicKey.camelot} · {harmonicKey.shortKey}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/35 text-amber-200 text-[10px] font-sans font-bold backdrop-blur-md shadow-sm">
                {currentMood.label}
              </span>
            </div>

            {/* Soundwave Bars */}
            <div className="w-full px-4 flex items-center justify-center gap-[2px] h-8 pt-1">
              {waveformData.peaks.slice(0, 36).map((p, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    height: `${Math.max(16, p * 100)}%`,
                    backgroundColor: i < 24 ? activeColor : 'rgba(255, 255, 255, 0.25)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card Footer */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-white/50">
            <span>{Math.floor(stats.totalSeconds / 60)} min escuchados</span>
            <span className="text-cyan-400 font-semibold">#Auralis3D</span>
          </div>
        </div>

        {/* Video Recording Progress Bar */}
        {isRecordingVideo && (
          <div className="w-full space-y-1.5 p-3 rounded-2xl bg-white/[0.06] border border-white/10">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Renderizando clip 9:16...
              </span>
              <span>{videoProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* iOS Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Video Clip Export Button */}
            <button
              onClick={handleExportVideo}
              disabled={isRecordingVideo || isExporting}
              className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white font-bold text-xs tracking-tight shadow-[0_8px_25px_rgba(236,72,153,0.35)] hover:shadow-[0_10px_30px_rgba(236,72,153,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Generar clip de video animado 9:16 con audio para Instagram y TikTok"
            >
              <Film className="w-4 h-4" />
              <span>{isRecordingVideo ? `Grabando (${videoProgress}%)` : 'Exportar Video 9:16 (5s)'}</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              disabled={isRecordingVideo || isExporting}
              className="py-3 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 backdrop-blur-xl cursor-pointer disabled:opacity-50 shadow-sm"
              title="Copiar imagen al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Static PNG Download Button */}
          <button
            onClick={handleDownload}
            disabled={isRecordingVideo || isExporting}
            className="w-full py-2.5 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white/90 hover:text-white font-medium text-xs tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Descargar Imagen 9:16 (PNG 1080p)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuralisStoryCardModal;
