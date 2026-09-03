import React, { useRef, useEffect, useState } from 'react';
import { Headphones, UploadCloud, Mic, Disc3, Sparkles, ArrowRight, Music2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';

export const LandingScreen: React.FC = () => {
  const { setHasStarted, togglePlay, isAudioUnlocked } = usePlayerStore();
  const { unlockAudio, loadFile, toggleMicrophone } = useAudioEngine();
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated background cosmic dust particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 80;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.5 ? '#00f2fe' : '#ff088a',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleStartExperience = async () => {
    await unlockAudio();
    setHasStarted(true);
    if (!isAudioUnlocked) {
      togglePlay();
    }
  };

  const handleMicStart = async () => {
    await toggleMicrophone();
    setHasStarted(true);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0]);
      setHasStarted(true);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFile(e.target.files[0]);
      setHasStarted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-8 sm:py-12 overflow-y-auto bg-[radial-gradient(circle_at_50%_30%,#0c1433_0%,#050818_50%,#02040a_100%)] text-white select-none">
      {/* Background Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Top Studio Brand */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/15 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(0,242,254,0.3)]">
            <Disc3 className="w-5 h-5 text-cyan-300 animate-[spin_8s_linear_infinite]" />
          </div>
          <span className="font-light tracking-[0.25em] text-xs uppercase text-white/90">
            Auralis <span className="text-cyan-400 font-mono">Audio Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>v2.0 3D FFT Engine</span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 max-w-3xl w-full flex flex-col items-center text-center my-auto py-8 space-y-8">
        {/* Title & Subtitle */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px] uppercase tracking-[0.2em] backdrop-blur-md shadow-[0_0_20px_rgba(0,242,254,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Reproductor Inmersivo Espacial Web
          </div>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-light tracking-[0.12em] uppercase font-sans text-white"
            style={{
              textShadow:
                '0 0 20px rgba(0, 242, 254, 0.4), 0 0 45px rgba(255, 8, 138, 0.25)',
            }}
          >
            Auralis <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-400 to-yellow-200">3D</span>
          </h1>

          <p className="max-w-xl mx-auto text-white/60 font-light text-sm sm:text-base tracking-[0.08em] leading-relaxed">
            Siente cada frecuencia sonora en tiempo real con la esfera cristalina 3D de partículas y el núcleo reactivo Rainbow Void.
          </p>
        </div>

        {/* Primary Action Button (Gradient Border + Wave Glow) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center pt-2">
          <button
            onClick={handleStartExperience}
            className="group relative inline-flex items-center justify-center p-[2px] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,255,179,0.3)] hover:shadow-[0_0_45px_rgba(0,242,254,0.6)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            {/* Gradient animated border */}
            <span className="absolute inset-0 bg-gradient-to-r from-[#00ffb3] via-[#00f2fe] to-[#ff088a] rounded-2xl group-hover:opacity-100 opacity-85 transition-opacity" />

            {/* Inner Content */}
            <span className="relative px-8 py-4 rounded-[14px] bg-[#070b18]/90 backdrop-blur-xl flex items-center gap-3 text-sm sm:text-base font-medium tracking-[0.18em] uppercase text-white group-hover:text-cyan-200 transition-colors">
              <Headphones className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
              <span>Iniciar Experiencia</span>
              <ArrowRight className="w-4 h-4 text-pink-400 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          {/* Quick Mic Action */}
          <button
            onClick={handleMicStart}
            className="px-6 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-xs sm:text-sm font-light tracking-[0.15em] uppercase text-white/80 hover:text-pink-300 transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <Mic className="w-4 h-4 text-pink-400" />
            <span>Micrófono en Vivo</span>
          </button>
        </div>

        {/* Drag & Drop Audio Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all duration-300 backdrop-blur-xl flex flex-col items-center justify-center gap-3 cursor-pointer group ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_35px_rgba(0,242,254,0.4)] scale-105'
              : 'border-white/15 bg-black/40 hover:border-cyan-400/60 hover:bg-white/[0.03] hover:shadow-[0_0_25px_rgba(0,242,254,0.2)]'
          }`}
        >
          <label className="w-full flex flex-col items-center justify-center cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 text-cyan-300 animate-bounce" />
            </div>

            <p className="text-sm font-light tracking-[0.15em] uppercase text-white group-hover:text-cyan-200">
              Arrastra tus canciones aquí
            </p>
            <p className="text-xs text-white/40 font-mono mt-1">
              MP3, WAV, FLAC, OGG o haz clic para examinar
            </p>

            <input
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </main>

      {/* Footer Features */}
      <footer className="relative z-10 w-full max-w-4xl grid grid-cols-3 gap-4 pt-4 border-t border-white/10 text-center text-xs text-white/40 font-light">
        <div className="flex items-center justify-center gap-2">
          <Music2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Web Audio API</span>
          <span>10 Bandas EQ</span>
        </div>
        <div className="flex items-center justify-center gap-2 border-x border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Esfera 3D & Void</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Mic className="w-3.5 h-3.5 text-yellow-400" />
          <span>Entrada de Micrófono</span>
        </div>
      </footer>
    </div>
  );
};

