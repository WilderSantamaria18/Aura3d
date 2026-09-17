import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { QuantumCoreShader } from './QuantumCoreShader';
import { StudioOscilloscope } from './StudioOscilloscope';
import { StudioMixerDeck } from './StudioMixerDeck';
import { StudioTurntableDeck } from './StudioTurntableDeck';
import { StudioLaunchDeck } from './StudioLaunchDeck';

/**
 * LandingScreen
 * Adaptación arquitectónica de alta fidelidad estilo visionOS Liquid Glass para Aura3D.
 * 4 Canales con scroll-snap fluido, osciloscopio CRT de fósforo analógico,
 * consola masterizadora de 8 bandas con VU ahumado, tornamesa Rainbow Void
 * y lanzador Liquid Void interactivo.
 */
export const LandingScreen: React.FC = () => {
  const { setHasStarted } = usePlayerStore();
  const { unlockAudio, loadFile, toggleMicrophone } = useAudioEngine();

  const [activeChannel, setActiveChannel] = useState<number>(0);
  const [isTransitioningOut, setIsTransitioningOut] = useState<boolean>(false);
  const [isDraggingHero, setIsDraggingHero] = useState<boolean>(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const fileInputHeroRef = useRef<HTMLInputElement>(null);

  const handleStartExperience = useCallback(async () => {
    setIsTransitioningOut(true);
    await unlockAudio();
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  }, [unlockAudio, setHasStarted]);

  const handleMicStart = useCallback(async () => {
    setIsTransitioningOut(true);
    await toggleMicrophone();
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  }, [toggleMicrophone, setHasStarted]);

  const handleFileLoaded = useCallback(
    (file: File) => {
      setIsTransitioningOut(true);
      loadFile(file);
      setTimeout(() => {
        setHasStarted(true);
      }, 450);
    },
    [loadFile, setHasStarted]
  );

  const scrollToCanal = (index: number) => {
    const target = document.getElementById(`canal-${index}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Keyboard shortcut listener: Space to launch/kick, M for mic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        // In canal 3, Space triggers kick; in other canals, launches experience
        if (activeChannel === 3) {
          // Let canal 3 handle kick pulse
        } else {
          handleStartExperience();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleMicStart();
      } else if (e.key === 'g' || e.key === 'G') {
        handleStartExperience();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartExperience, handleMicStart, activeChannel]);

  // High-performance scroll tracking for progress bar and active channel
  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${progress}%`;
    }

    const currentIndex = Math.min(3, Math.max(0, Math.round(scrollTop / clientHeight)));
    if (currentIndex !== activeChannel) {
      setActiveChannel(currentIndex);
    }
  };

  const handleHeroDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingHero(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFileLoaded(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`fixed inset-0 w-full h-full bg-[#03050c] text-[#e3e1e9] select-none overflow-hidden transition-all duration-700 ease-out font-sans ${
        isTransitioningOut
          ? '-translate-y-16 opacity-0 blur-md scale-[0.97]'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Dynamic WebGL Ambient Shader Layer (Quantum Core: Abyssal void, orbital rings, particles) */}
      <QuantumCoreShader />

      {/* [Z-100] Global Scroll Dynamic Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] bg-[#0d0e13]/60 pointer-events-none">
        <div
          ref={progressBarRef}
          className="h-full w-0 bg-gradient-to-r from-[#00e5ff] via-[#8c38ff] to-[#ff088a] transition-[width] duration-75 shadow-[0_0_12px_#00e5ff]"
        />
      </div>

      {/* [Z-90] Persistent Precision Brand & Telemetry Bar */}
      <header className="fixed top-0 left-0 w-full z-[90] px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between pointer-events-auto backdrop-blur-2xl bg-[#0d0e13]/60 border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        {/* Brand / Engine Signature */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => scrollToCanal(0)}
        >
          <div className="w-8 h-8 rounded-full bg-[#1e1f25] border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.25)] group-hover:border-[#00e5ff]/50 transition-colors">
            <svg
              className="w-4 h-4 text-[#00f0ff] animate-[spin_8s_linear_infinite]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2a10 10 0 0 0-4 18.2" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-sm font-semibold tracking-wide text-[#dbfcff] leading-tight">
              Aura3D Studio
            </span>
            <span className="font-mono text-[9px] text-[#849495] tracking-widest uppercase">
              Hardware Core v4.2
            </span>
          </div>
        </div>

        {/* Center: Hardware Telemetry Pill */}
        <div className="hidden md:flex items-center gap-2.5 px-4 py-1 rounded-full bg-[#1e1f25]/70 border border-white/[0.06] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)]">
          <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-ping" />
          <span className="font-mono text-[11px] tracking-wider text-[#00ff9d]">
            48.0 kHz // 32-BIT FLOAT
          </span>
          <span className="text-[#3b494b] text-[11px]">|</span>
          <span className="font-mono text-[11px] text-[#b9cacb]">DSP &lt;8ms</span>
          <span className="text-[#3b494b] text-[11px]">|</span>
          <span className="font-mono text-[11px] text-[#00dbe9]">BUFFER: 128</span>
        </div>

        {/* Right: Quick Action Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToCanal(1)}
            className="group px-4 py-1.5 rounded-full bg-[#292a2f]/80 hover:bg-[#34343a] text-[#dbfcff] border border-white/[0.08] font-mono text-xs transition-all duration-200 flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.2)] cursor-pointer"
          >
            <span>Explorar DSP</span>
            <svg
              className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M14 5l7 7m0 0l-7 7m7-7H3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* [Z-80] Floating Channel Strip Vertical Navigation */}
      <aside className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[80] flex flex-col gap-3 pointer-events-auto">
        <div className="flex flex-col gap-2.5 p-2 rounded-2xl bg-[#1a1b21]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {[
            { ch: 0, label: 'CH 01 // HERO' },
            { ch: 1, label: 'CH 02 // MIXER' },
            { ch: 2, label: 'CH 03 // TURNTABLE' },
            { ch: 3, label: 'CH 04 // LAUNCH' },
          ].map((item) => {
            const isActive = activeChannel === item.ch;

            return (
              <button
                key={item.ch}
                type="button"
                onClick={() => scrollToCanal(item.ch)}
                className="group relative flex items-center justify-end cursor-pointer"
                title={item.label}
              >
                <span className="absolute right-7 px-2 py-0.5 rounded-md bg-[#1e1f25] border border-white/10 text-[#dbfcff] font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                  {item.label}
                </span>
                <div
                  className={`dot-indicator transition-all duration-300 rounded-full ${
                    isActive
                      ? 'w-2.5 h-6 bg-[#00f0ff] shadow-[0_0_12px_#00f0ff]'
                      : 'w-2.5 h-2.5 bg-[#34343a] hover:bg-[#b9cacb]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </aside>

      {/* Master Vertical Scroll-Snap Container */}
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        id="studio-viewport"
        className="studio-gateway relative z-10 w-full h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth"
      >
        {/* =============================================================== */}
        {/* CANAL 01: HERO CONSOLE & CRT OSCILLOSCOPE                       */}
        {/* =============================================================== */}
        <section
          id="canal-0"
          className="w-full h-screen min-h-[640px] max-h-[1080px] snap-start shrink-0 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 pt-20 pb-12 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-[#00f0ff]/10 blur-[130px] pointer-events-none -top-20 -left-20" />

          <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Textual Authority & Dropzone */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#292a2f]/60 border border-white/[0.06] backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#7df4ff]">
                  Canal Primario // Inmersión Óptica
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#dbfcff] leading-tight font-sans">
                AURA
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#8c38ff]">
                  3D
                </span>
              </h1>

              <p className="text-sm sm:text-base text-[#b9cacb] max-w-xl leading-relaxed">
                Estación de audio espacial en tiempo real con shaders WebGL y micro-física acústica. Procesa transitorios con latencia ultrabaja en un lienzo háptico.
              </p>

              {/* Dropzone Card */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingHero(true);
                }}
                onDragLeave={() => setIsDraggingHero(false)}
                onDrop={handleHeroDrop}
                onClick={() => fileInputHeroRef.current?.click()}
                className={`w-full max-w-lg mt-1 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isDraggingHero
                    ? 'border-[#00f0ff] bg-[#00f0ff]/15 scale-[1.01] shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    : 'bg-[#1a1b21]/70 border-white/[0.08] backdrop-blur-2xl hover:border-white/20 hover:bg-[#1a1b21]/90 shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#292a2f] border border-white/10 flex items-center justify-center shrink-0 text-[#00f0ff]">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm text-[#e3e1e9] font-semibold truncate">
                      Arrastra master multicanal
                    </span>
                    <span className="font-mono text-[11px] text-[#849495] truncate">
                      FLAC, WAV 96kHz, MP3 o Stems
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#34343a] hover:bg-[#38393f] text-[#dbfcff] font-mono text-xs tracking-wide shrink-0 transition-colors cursor-pointer"
                >
                  Cargar Audio
                </button>

                <input
                  ref={fileInputHeroRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileLoaded(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Dual Tactile CTAs */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1">
                <button
                  type="button"
                  onClick={handleStartExperience}
                  className="group px-6 sm:px-7 py-3 rounded-full bg-[#e3e1e9] text-[#121318] font-mono text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-[0_0_24px_rgba(219,252,255,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-[#121318]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1a1 1 0 001-1v-4a1 1 0 00-1-1H4a1 1 0 00-1 1zm18 0a3 3 0 01-3 3h-1a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>INICIAR MOTOR 3D</span>
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleMicStart}
                  className="px-5 sm:px-6 py-3 rounded-full bg-[#1e1f25]/60 hover:bg-[#292a2f] text-[#dbfcff] border border-white/[0.08] font-mono text-xs sm:text-sm flex items-center gap-2 backdrop-blur-lg transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse" />
                  <span>Micrófono Directo</span>
                </button>
              </div>
            </div>

            {/* Right: Studio Oscilloscope (CRT Phosphor) */}
            <div className="lg:col-span-5 flex justify-center">
              <StudioOscilloscope />
            </div>
          </div>

          {/* Bottom Bouncing Guidance Indicator */}
          <div
            onClick={() => scrollToCanal(1)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
          >
            <span className="font-mono text-[10px] tracking-widest text-[#7df4ff] uppercase">
              Explorar Consola DSP
            </span>
            <svg
              className="w-4 h-4 text-[#dbfcff] animate-bounce"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        {/* =============================================================== */}
        {/* CANAL 02: HARDWARE MASTER MIXER & ANALOG VU METERS              */}
        {/* =============================================================== */}
        <section
          id="canal-1"
          className="w-full h-screen min-h-[640px] max-h-[1080px] snap-start shrink-0 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-14 relative overflow-hidden"
        >
          <StudioMixerDeck />
        </section>

        {/* =============================================================== */}
        {/* CANAL 03: RAINBOW VOID VIRTUAL TURNTABLE                        */}
        {/* =============================================================== */}
        <section
          id="canal-2"
          className="w-full h-screen min-h-[640px] max-h-[1080px] snap-start shrink-0 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-14 relative overflow-hidden"
        >
          {/* Violet Backdrop Bloom */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-[#8c38ff]/10 blur-[150px] pointer-events-none -bottom-20 -right-20" />
          <StudioTurntableDeck />
        </section>

        {/* =============================================================== */}
        {/* CANAL 04: LAUNCH PLATFORM & LIQUID VOID VISUALIZER              */}
        {/* =============================================================== */}
        <section
          id="canal-3"
          className="w-full h-screen min-h-[640px] max-h-[1080px] snap-start shrink-0 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-14 relative overflow-hidden"
        >
          {/* Magenta Ambient Halo */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-[#ff088a]/10 blur-[140px] pointer-events-none -top-10 right-1/4" />
          <StudioLaunchDeck
            onStartExperience={handleStartExperience}
            onMicStart={handleMicStart}
            onFileLoaded={handleFileLoaded}
          />
        </section>
      </div>
    </div>
  );
};

export default LandingScreen;
