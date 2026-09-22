import React from 'react';
import { ListMusic, Heart, Search, Radio, Disc, Play, ArrowRight } from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';

interface LibraryShowcaseProps {
  onStartExperience: () => void;
}

const SAMPLE_TRACKS = [
  { title: 'Liquid Cybernetic Pulse', artist: 'Aura Collective', time: '04:12', format: 'FLAC 24bit', bpm: '128' },
  { title: 'VisionOS Spatial Horizon', artist: 'Kavinsky & Daft Sound', time: '03:45', format: 'WAV Lossless', bpm: '120' },
  { title: 'Sub-Bass Quantum Shifter', artist: 'Null Oscillator', time: '05:20', format: 'FLAC 96kHz', bpm: '140' },
  { title: 'Ethereal Caustics Groove', artist: 'Synthetica', time: '02:58', format: 'MP3 320k', bpm: '115' },
];

export const LibraryShowcase: React.FC<LibraryShowcaseProps> = ({
  onStartExperience,
}) => {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Columna Izquierda: Información de features */}
      <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col items-start gap-4">
        <GlassBadge label="06 • BIBLIOTECA DE ESTUDIO" ledColor="cyan" />

        <h2 className="landing-v2-section-title">
          Tu Colección
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Archivos locales y streaming unidos.
          </span>
        </h2>

        <p className="landing-v2-section-description">
          Arrastra archivos de audio desde tu explorador o busca canciones y
          playlists enteras de YouTube y Spotify. Todo organizado en una cola viva
          con telemetría BPM, afinación y duración precisa.
        </p>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <div className="landing-v2-feature">
            <Search className="landing-v2-feature-icon" />
            <span>Spotlight Search integrado con sugerencias automáticas</span>
          </div>
          <div className="landing-v2-feature">
            <Radio className="landing-v2-feature-icon" />
            <span>Radio 24/7 sin pausas con reproducción continua</span>
          </div>
          <div className="landing-v2-feature">
            <Disc className="landing-v2-feature-icon" />
            <span>Soporte total FLAC, WAV, MP3, AAC y audio del sistema</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartExperience}
          className="mt-4 landing-v2-cta-secondary group"
        >
          <span>Explorar la biblioteca</span>
          <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Columna Derecha: Preview de la biblioteca */}
      <div className="lg:col-span-7 order-1 lg:order-2 flex justify-center">
        <div className="landing-v2-preview-card w-full max-w-[500px] p-6 flex flex-col gap-4">
          {/* Header tabs demo */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="py-1 px-3 rounded-full bg-white/20 text-white text-[11px] font-bold">
                COLA (4)
              </span>
              <span className="py-1 px-3 rounded-full text-white/50 text-[11px] font-medium">
                FAVORITOS
              </span>
              <span className="py-1 px-3 rounded-full text-white/50 text-[11px] font-medium">
                PLAYLISTS
              </span>
            </div>
            <GlassBadge label="DSP READY" ledColor="green" />
          </div>

          {/* Track List */}
          <div className="flex flex-col gap-2">
            {SAMPLE_TRACKS.map((trk, i) => (
              <div
                key={i}
                className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-cyan-400/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate tracking-tight">
                      {trk.title}
                    </h4>
                    <p className="text-[10px] text-white/50 truncate">
                      {trk.artist} • <span className="font-mono text-cyan-300">{trk.bpm} BPM</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-white/[0.06] text-white/70 border border-white/10">
                    {trk.format}
                  </span>
                  <span className="text-[10px] font-mono text-white/50">
                    {trk.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center text-[10px] font-mono text-white/40">
            DRAG & DROP DE ARCHIVOS COMPATIBLE EN CUALQUIER MOMENTO
          </div>
        </div>
      </div>
    </div>
  );
};
