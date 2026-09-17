import React, { useState, useEffect, useRef } from 'react';

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
  { freq: '8kHz', type: 'HIGH', defaultVal: 72, color: '#00f0ff' },
  { freq: '16kHz', type: 'AIR', defaultVal: 78, color: '#8c38ff' },
];

/**
 * StudioMixerDeck
 * Consola masterizadora de 8 bandas con medidores VU analógicos dobles de vidrio ahumado (Canal 02).
 * Incluye balística Fast RMS, deslizadores táctiles de ganancia, compresor óptico y apertura estéreo.
 */
export const StudioMixerDeck: React.FC = () => {
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
    let start = performance.now();
    let currentL = -10;
    let currentR = -5;

    const loop = (now: number) => {
      const elapsed = (now - start) * 0.001;

      // Simulated musical energy with kick transients
      const beat = Math.sin(elapsed * 4.2);
      const sub = Math.sin(elapsed * 2.1) > 0.4 ? 1 : 0;
      const boost = boostMultiplierRef.current;

      // Decay boost back to 1.0 smoothly
      if (boostMultiplierRef.current > 1) {
        boostMultiplierRef.current = Math.max(1, boostMultiplierRef.current - 0.03);
      }

      const targetL = (-12 + beat * 18 + sub * 8) * boost;
      const targetR = (-10 + beat * 16 + (Math.cos(elapsed * 3) > 0 ? 6 : 0)) * boost;

      currentL += (targetL - currentL) * 0.22;
      currentR += (targetR - currentR) * 0.22;

      // Clamp needle angles between -30deg and +30deg
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
          <span className="font-mono text-[10px] sm:text-[11px] text-[#7df4ff] tracking-wider uppercase">
            [ 02 // PROCESAMIENTO DSP & ECUALIZADOR ]
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e3e1e9] mt-0.5">
            Consola Masterizadora de 8 Bandas
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1 rounded-full bg-[#1e1f25] border border-white/[0.06] font-mono text-[10px] sm:text-[11px] text-[#849495]">
            ANALOG HYBRID ENGINE
          </div>
          <button
            type="button"
            onClick={triggerKickBoost}
            className="px-3 py-1 rounded-full bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-[#00f0ff] border border-[#00f0ff]/30 font-mono text-[10px] sm:text-[11px] tracking-wide transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.2)]"
          >
            PULSE KICK +3dB
          </button>
        </div>
      </div>

      {/* Master Hardware Rack Panel */}
      <div className="w-full p-5 sm:p-7 rounded-3xl bg-[#1a1b21]/80 border border-white/[0.08] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-6">
        {/* Top: Twin Analog Smoked Glass VU Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
          {/* Left Channel Meter */}
          <div className="p-4 rounded-2xl bg-[#090b12] border border-white/[0.06] shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#849495] pb-2">
              <span className="text-[#ffb700] font-semibold">LEFT CHANNEL (L)</span>
              <span>BALLISTICS: FAST RMS</span>
              <span className="text-[#ffb4ab]">PEAK +3dB</span>
            </div>
            <div className="relative w-full h-20 flex items-end justify-center overflow-hidden">
              {/* Dial Arc Background */}
              <svg className="w-full h-full text-[#34343a]" viewBox="0 0 200 80">
                <path
                  d="M 20 75 A 80 80 0 0 1 180 75"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4 2"
                  strokeWidth="2"
                />
                <text fill="#849495" fontFamily="monospace" fontSize="8" x="30" y="70">
                  -20
                </text>
                <text fill="#849495" fontFamily="monospace" fontSize="8" x="65" y="45">
                  -10
                </text>
                <text fill="#ffb700" fontFamily="monospace" fontSize="8" x="100" y="32">
                  0 dB
                </text>
                <text fill="#ffb4ab" fontFamily="monospace" fontSize="8" x="140" y="45">
                  +2
                </text>
                <text fill="#ffb4ab" fontFamily="monospace" fontSize="8" x="170" y="70">
                  +3
                </text>
              </svg>
              {/* Dynamic VU Needle */}
              <div
                ref={needleLeftRef}
                className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-[#ffb700] origin-bottom shadow-[0_0_8px_#ffb700] transition-transform duration-75 ease-out will-change-transform"
                style={{ transform: 'rotate(-10deg)' }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#34343a] shadow-md" />
            </div>
          </div>

          {/* Right Channel Meter */}
          <div className="p-4 rounded-2xl bg-[#090b12] border border-white/[0.06] shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#849495] pb-2">
              <span className="text-[#ffb700] font-semibold">RIGHT CHANNEL (R)</span>
              <span>BALLISTICS: FAST RMS</span>
              <span className="text-[#ffb4ab]">PEAK +3dB</span>
            </div>
            <div className="relative w-full h-20 flex items-end justify-center overflow-hidden">
              <svg className="w-full h-full text-[#34343a]" viewBox="0 0 200 80">
                <path
                  d="M 20 75 A 80 80 0 0 1 180 75"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4 2"
                  strokeWidth="2"
                />
                <text fill="#849495" fontFamily="monospace" fontSize="8" x="30" y="70">
                  -20
                </text>
                <text fill="#849495" fontFamily="monospace" fontSize="8" x="65" y="45">
                  -10
                </text>
                <text fill="#ffb700" fontFamily="monospace" fontSize="8" x="100" y="32">
                  0 dB
                </text>
                <text fill="#ffb4ab" fontFamily="monospace" fontSize="8" x="140" y="45">
                  +2
                </text>
                <text fill="#ffb4ab" fontFamily="monospace" fontSize="8" x="170" y="70">
                  +3
                </text>
              </svg>
              {/* Dynamic VU Needle */}
              <div
                ref={needleRightRef}
                className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-[#ffb700] origin-bottom shadow-[0_0_8px_#ffb700] transition-transform duration-75 ease-out will-change-transform"
                style={{ transform: 'rotate(-5deg)' }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#34343a] shadow-md" />
            </div>
          </div>
        </div>

        {/* 8-Band Fader Array */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4 items-end pt-2 pb-1">
          {BANDS.map((band, idx) => {
            const val = faderValues[idx];
            const dB = ((val - 50) * 0.24).toFixed(1);
            const isHighlight = band.color !== undefined;

            return (
              <div key={band.freq} className="flex flex-col items-center gap-2 group">
                <span
                  className="font-mono text-[9px] font-semibold tabular-nums"
                  style={{ color: band.color || '#b9cacb' }}
                >
                  {Number(dB) > 0 ? `+${dB}` : dB}dB
                </span>

                {/* Vertical Fader Track */}
                <div className="relative w-7 h-32 sm:h-36 rounded-full bg-[#0d0e13] border border-white/[0.06] flex items-center justify-center p-1 shadow-inner">
                  <div className="absolute inset-x-3 inset-y-2 bg-[#34343a]/40 rounded-full" />

                  {/* Native invisible range input for precision interaction */}
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
                    className={`absolute w-5 h-7 rounded-lg flex items-center justify-center pointer-events-none transition-all duration-75 shadow-[0_2px_8px_rgba(0,0,0,0.7)] ${
                      isHighlight
                        ? 'bg-[#00f0ff] shadow-[0_0_12px_#00f0ff]'
                        : 'bg-[#38393f] group-hover:bg-[#00dbe9]'
                    }`}
                    style={{
                      bottom: `${(val / 100) * 72}%`,
                    }}
                  >
                    <div
                      className={`w-3 h-0.5 rounded-full ${
                        isHighlight ? 'bg-[#002022]' : 'bg-[#121318]'
                      }`}
                    />
                  </div>
                </div>

                {/* Frequency & Type Label */}
                <div className="flex flex-col items-center text-center">
                  <span className="font-mono text-[11px] text-[#e3e1e9] font-semibold group-hover:text-[#00f0ff] transition-colors">
                    {band.freq}
                  </span>
                  <span className="font-mono text-[9px] text-[#849495] uppercase">
                    {band.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Master Knobs & Bypass Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-6">
            {/* Rotary Knob 1: Opto-Compressor */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() =>
                setOptoThreshold((prev) => (prev <= -20 ? -10 : prev - 2))
              }
              title="Clic para regular umbral del Opto-Compressor"
            >
              <div className="relative w-10 h-10 rounded-full bg-[#292a2f] border border-white/10 shadow-md flex items-center justify-center group-hover:border-[#00e5ff]/50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] absolute top-1.5 shadow-[0_0_6px_#00e5ff]" />
                <span className="font-mono text-[10px] text-[#849495]">C</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-[#e3e1e9] font-semibold">
                  Opto-Compressor
                </span>
                <span className="font-mono text-[10px] text-[#849495]">
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
              <div className="relative w-10 h-10 rounded-full bg-[#292a2f] border border-white/10 shadow-md flex items-center justify-center group-hover:border-[#8c38ff]/50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8c38ff] absolute top-2 right-2 shadow-[0_0_6px_#8c38ff]" />
                <span className="font-mono text-[10px] text-[#849495]">W</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-[#e3e1e9] font-semibold">
                  Stereo Spread
                </span>
                <span className="font-mono text-[10px] text-[#849495]">
                  Width: {stereoWidth}% Spatial
                </span>
              </div>
            </div>
          </div>

          {/* Master Bypass Switch Button */}
          <button
            type="button"
            onClick={() => setIsBypassActive((prev) => !prev)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="font-mono text-[10px] text-[#849495]">DSP ENGINE:</span>
            <span
              className={`px-3 py-1 rounded-full font-mono text-[10px] font-semibold border transition-all ${
                !isBypassActive
                  ? 'bg-[#00ff9d]/15 text-[#00ff9d] border-[#00ff9d]/30 shadow-[0_0_10px_rgba(0,255,157,0.2)]'
                  : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30'
              }`}
            >
              {!isBypassActive ? 'ACTIVE BYPASS: OFF' : 'BYPASS: ON'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioMixerDeck;
