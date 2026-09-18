import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Volume2, Zap, ArrowRight } from 'lucide-react';

interface BandConfig {
  freq: string;
  type: string;
  defaultVal: number;
  color?: string;
}

const BANDS: BandConfig[] = [
  { freq: '32Hz', type: 'SUB', defaultVal: 68, color: '#ff088a' },
  { freq: '64Hz', type: 'LOW', defaultVal: 58 },
  { freq: '125Hz', type: 'BASS', defaultVal: 50 },
  { freq: '500Hz', type: 'L-MID', defaultVal: 44 },
  { freq: '1kHz', type: 'MID', defaultVal: 52 },
  { freq: '4kHz', type: 'H-MID', defaultVal: 62 },
  { freq: '8kHz', type: 'HIGH', defaultVal: 72, color: '#00e5ff' },
  { freq: '16kHz', type: 'AIR', defaultVal: 78, color: '#8c38ff' },
];

interface StudioMixerDeckProps {
  onStartExperience?: () => void;
}

/**
 * StudioMixerDeck
 * Consola masterizadora de 8 bandas con medidores VU analógicos de vidrio ahumado (Canal 02).
 * Refactorizada con auténtica resina Apple visionOS Liquid Glass, bisel de luz superior
 * y deslizadores hápticos táctiles.
 */
export const StudioMixerDeck: React.FC<StudioMixerDeckProps> = ({ onStartExperience }) => {
  const [faderValues, setFaderValues] = useState<number[]>(
    BANDS.map((b) => b.defaultVal)
  );
  const [isBypassActive, setIsBypassActive] = useState(false);
  const [optoThreshold, setOptoThreshold] = useState(-14);
  const [stereoWidth, setStereoWidth] = useState(142);

  const needleLeftRef = useRef<HTMLDivElement>(null);
  const needleRightRef = useRef<HTMLDivElement>(null);
  const boostMultiplierRef = useRef<number>(1);

  // VU needle physics simulation loop at 60 FPS without React re-renders
  useEffect(() => {
    let animId: number;
    const start = performance.now();
    let currentL = -10;
    let currentR = -5;

    const loop = (now: number) => {
      const elapsed = (now - start) * 0.001;

      const beat = Math.sin(elapsed * 4.2);
      const sub = Math.sin(elapsed * 2.1) > 0.4 ? 1 : 0;
      const boost = boostMultiplierRef.current;

      if (boostMultiplierRef.current > 1) {
        boostMultiplierRef.current = Math.max(1, boostMultiplierRef.current - 0.03);
      }

      const targetL = (-12 + beat * 18 + sub * 8) * boost;
      const targetR = (-10 + beat * 16 + (Math.cos(elapsed * 3) > 0 ? 6 : 0)) * boost;

      currentL += (targetL - currentL) * 0.22;
      currentR += (targetR - currentR) * 0.22;

      const clampedL = Math.max(-30, Math.min(30, currentL));
      const clampedR = Math.max(-30, Math.min(30, currentR));

      if (needleLeftRef.current) {
        needleLeftRef.current.style.transform = `rotate(${clampedL}deg)`;
      }
      if (needleRightRef.current) {
        needleRightRef.current.style.transform = `rotate(${clampedR}deg)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const triggerKickBoost = () => {
    boostMultiplierRef.current = 2.4;
  };

  const handleFaderChange = (idx: number, val: number) => {
    setFaderValues((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 select-none font-sans">
      {/* Section Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <span className="font-mono text-[10px] sm:text-[11px] text-cyan-400 tracking-wider uppercase">
            [ 02 // PROCESAMIENTO DSP & ECUALIZADOR ]
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
            Consola Masterizadora de 8 Bandas
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1 liquid-glass-pill border border-white/10 font-mono text-[10px] sm:text-[11px] text-white/60">
            ANALOG HYBRID ENGINE
          </div>
          <button
            type="button"
            onClick={triggerKickBoost}
            className="px-4 py-1.5 liquid-glass-pill bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-mono text-[10px] sm:text-[11px] tracking-wide transition-all active:scale-[0.97] cursor-pointer shadow-[0_0_16px_rgba(0,229,255,0.25)] flex items-center gap-1.5"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>PULSE KICK +3dB</span>
          </button>
        </div>
      </div>

      {/* Master Hardware Rack Panel (Liquid Glass Card) */}
      <div className="w-full p-5 sm:p-7 liquid-glass-card border border-white/10 border-t-white/30 shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] flex flex-col gap-6">
        {/* Top: Twin Analog Smoked Glass VU Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
          {/* Left Channel Meter */}
          <div className="p-4 rounded-2xl liquid-glass border border-amber-500/20 shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center text-[10px] font-mono text-white/60 pb-2">
              <span className="text-amber-400 font-semibold tracking-wide">LEFT CHANNEL (L)</span>
              <span>BALLISTICS: FAST RMS</span>
              <span className="text-rose-400 font-bold">PEAK +3dB</span>
            </div>
            <div className="relative w-full h-20 flex items-end justify-center overflow-hidden">
              <svg className="w-full h-full text-white/20" viewBox="0 0 200 80">
                <path
                  d="M 20 75 A 80 80 0 0 1 180 75"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4 2"
                  strokeWidth="2"
                />
                <text fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontSize="8" x="30" y="70">
                  -20
                </text>
                <text fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontSize="8" x="65" y="45">
                  -10
                </text>
                <text fill="#f59e0b" fontFamily="monospace" fontSize="8" x="100" y="32">
                  0 dB
                </text>
                <text fill="#f43f5e" fontFamily="monospace" fontSize="8" x="140" y="45">
                  +2
                </text>
                <text fill="#f43f5e" fontFamily="monospace" fontSize="8" x="170" y="70">
                  +3
                </text>
              </svg>
              {/* Dynamic VU Needle */}
              <div
                ref={needleLeftRef}
                className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-gradient-to-t from-amber-500 to-amber-300 origin-bottom shadow-[0_0_8px_#f59e0b] transition-transform duration-75 ease-out will-change-transform"
                style={{ transform: 'rotate(-10deg)' }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/20 border border-white/30 shadow-md" />
            </div>
          </div>

          {/* Right Channel Meter */}
          <div className="p-4 rounded-2xl liquid-glass border border-amber-500/20 shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center text-[10px] font-mono text-white/60 pb-2">
              <span className="text-amber-400 font-semibold tracking-wide">RIGHT CHANNEL (R)</span>
              <span>BALLISTICS: FAST RMS</span>
              <span className="text-rose-400 font-bold">PEAK +3dB</span>
            </div>
            <div className="relative w-full h-20 flex items-end justify-center overflow-hidden">
              <svg className="w-full h-full text-white/20" viewBox="0 0 200 80">
                <path
                  d="M 20 75 A 80 80 0 0 1 180 75"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4 2"
                  strokeWidth="2"
                />
                <text fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontSize="8" x="30" y="70">
                  -20
                </text>
                <text fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontSize="8" x="65" y="45">
                  -10
                </text>
                <text fill="#f59e0b" fontFamily="monospace" fontSize="8" x="100" y="32">
                  0 dB
                </text>
                <text fill="#f43f5e" fontFamily="monospace" fontSize="8" x="140" y="45">
                  +2
                </text>
                <text fill="#f43f5e" fontFamily="monospace" fontSize="8" x="170" y="70">
                  +3
                </text>
              </svg>
              {/* Dynamic VU Needle */}
              <div
                ref={needleRightRef}
                className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-gradient-to-t from-amber-500 to-amber-300 origin-bottom shadow-[0_0_8px_#f59e0b] transition-transform duration-75 ease-out will-change-transform"
                style={{ transform: 'rotate(-5deg)' }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/20 border border-white/30 shadow-md" />
            </div>
          </div>
        </div>

        {/* 8-Band Fader Array with Frosted Glass Tracks */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4 items-end pt-2 pb-1">
          {BANDS.map((band, idx) => {
            const val = faderValues[idx];
            const dB = ((val - 50) * 0.24).toFixed(1);
            const isHighlight = band.color !== undefined;

            return (
              <div key={band.freq} className="flex flex-col items-center gap-2 group">
                <span
                  className="font-mono text-[9px] font-semibold tabular-nums"
                  style={{ color: band.color || 'rgba(255,255,255,0.7)' }}
                >
                  {Number(dB) > 0 ? `+${dB}` : dB}dB
                </span>

                {/* Vertical Fader Track (Glass Tube) */}
                <div className="relative w-7 h-32 sm:h-36 rounded-full bg-black/60 border border-white/10 flex items-center justify-center p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
                  <div className="absolute inset-x-3 inset-y-2 bg-white/[0.04] rounded-full" />

                  {/* Native invisible range input */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={val}
                    onChange={(e) => handleFaderChange(idx, parseInt(e.target.value))}
                    className="absolute w-32 h-7 -rotate-90 opacity-0 cursor-pointer z-10"
                  />

                  {/* Styled Fader Cap with Grab Grip */}
                  <div
                    className={`absolute w-5 h-7 rounded-lg flex items-center justify-center pointer-events-none transition-all duration-75 border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
                      isHighlight
                        ? 'bg-cyan-400 shadow-[0_0_14px_rgba(0,229,255,0.6)]'
                        : 'bg-white/20 group-hover:bg-cyan-400/80'
                    }`}
                    style={{
                      bottom: `${(val / 100) * 72}%`,
                    }}
                  >
                    <div
                      className={`w-3 h-0.5 rounded-full ${
                        isHighlight ? 'bg-black' : 'bg-black/60'
                      }`}
                    />
                  </div>
                </div>

                {/* Frequency & Type Label */}
                <div className="flex flex-col items-center text-center">
                  <span className="font-mono text-[11px] text-white/90 font-semibold group-hover:text-cyan-300 transition-colors">
                    {band.freq}
                  </span>
                  <span className="font-mono text-[9px] text-white/50 uppercase">
                    {band.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Master Knobs & Bypass Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-6">
            {/* Rotary Knob 1: Opto-Compressor */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() =>
                setOptoThreshold((prev) => (prev <= -20 ? -10 : prev - 2))
              }
              title="Clic para regular umbral del Opto-Compressor"
            >
              <div className="relative w-10 h-10 rounded-full liquid-glass-pill border border-white/20 shadow-md flex items-center justify-center group-hover:border-cyan-400/60 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute top-1.5 shadow-[0_0_6px_#00e5ff]" />
                <span className="font-mono text-[10px] text-white/60">C</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-white font-semibold">
                  Opto-Compressor
                </span>
                <span className="font-mono text-[10px] text-white/50">
                  Ratio 4:1 // Thr {optoThreshold}dB
                </span>
              </div>
            </div>

            {/* Rotary Knob 2: Stereo Spread */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() =>
                setStereoWidth((prev) => (prev >= 160 ? 100 : prev + 15))
              }
              title="Clic para alternar apertura estéreo espacial"
            >
              <div className="relative w-10 h-10 rounded-full liquid-glass-pill border border-white/20 shadow-md flex items-center justify-center group-hover:border-purple-400/60 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-2 right-2 shadow-[0_0_6px_#c084fc]" />
                <span className="font-mono text-[10px] text-white/60">W</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-white font-semibold">
                  Stereo Spread
                </span>
                <span className="font-mono text-[10px] text-white/50">
                  Width: {stereoWidth}% Spatial
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onStartExperience && (
              <button
                type="button"
                onClick={onStartExperience}
                className="px-4 py-1.5 rounded-full bg-white text-black font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer"
              >
                <span>Ir a Consola 3D</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </button>
            )}

            {/* Master Bypass Switch Button */}
            <button
              type="button"
              onClick={() => setIsBypassActive((prev) => !prev)}
              className="flex items-center gap-2 cursor-pointer active:scale-[0.97] transition-transform"
            >
              <span className="font-mono text-[10px] text-white/50">DSP ENGINE:</span>
              <span
                className={`px-3 py-1 liquid-glass-pill font-mono text-[10px] font-semibold border transition-all ${
                  !isBypassActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                }`}
              >
                {!isBypassActive ? 'ACTIVE BYPASS: OFF' : 'BYPASS: ON'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioMixerDeck;
