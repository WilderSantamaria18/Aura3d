import React, { useState, useEffect } from 'react';
import { Radio, X, Music2, Sparkles, Activity } from 'lucide-react';
import { harmonicAnalysisService, type HarmonicKeyResult } from '../../services/harmonicAnalysisService';

interface HarmonicKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 12 sectors of the Circle of Fifths with standard Camelot codes
const CIRCLE_OF_FIFTHS = [
  { major: 'C', minor: 'Am', camelotMaj: '8B', camelotMin: '8A' },
  { major: 'G', minor: 'Em', camelotMaj: '9B', camelotMin: '9A' },
  { major: 'D', minor: 'Bm', camelotMaj: '10B', camelotMin: '10A' },
  { major: 'A', minor: 'F#m', camelotMaj: '11B', camelotMin: '11A' },
  { major: 'E', minor: 'C#m', camelotMaj: '12B', camelotMin: '12A' },
  { major: 'B', minor: 'G#m', camelotMaj: '1B', camelotMin: '1A' },
  { major: 'F#', minor: 'D#m', camelotMaj: '2B', camelotMin: '2A' },
  { major: 'Db', minor: 'Bbm', camelotMaj: '3B', camelotMin: '3A' },
  { major: 'Ab', minor: 'Fm', camelotMaj: '4B', camelotMin: '4A' },
  { major: 'Eb', minor: 'Cm', camelotMaj: '5B', camelotMin: '5A' },
  { major: 'Bb', minor: 'Gm', camelotMaj: '6B', camelotMin: '6A' },
  { major: 'F', minor: 'Dm', camelotMaj: '7B', camelotMin: '7A' },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const HarmonicKeyModal: React.FC<HarmonicKeyModalProps> = ({ isOpen, onClose }) => {
  const [result, setResult] = useState<HarmonicKeyResult>(harmonicAnalysisService.getLastResult());

  useEffect(() => {
    if (!isOpen) return;
    const unsub = harmonicAnalysisService.subscribe((res) => {
      setResult(res);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop for tap-away */}
      <div
        className="fixed inset-0 z-40 bg-surface-backdrop material-thick sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Proportional Dropdown Popover centered under telemetry badge */}
      <div
        className="fixed inset-x-3 top-14 max-w-[380px] mx-auto sm:mx-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-full sm:mt-2 sm:w-[370px] max-h-[min(540px,calc(100vh-5rem))] overflow-y-auto p-3.5 rounded-modal bg-surface-overlay material-thick border border-border-subtle shadow-popover z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 custom-scrollbar text-text-primary font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-control bg-accent-purple/10 border border-accent-purple/20 text-accent-purple">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <div className="flex flex-col">
              <span className="text-caption font-semibold text-text-primary leading-tight">
                Rueda Armónica & Live Key
              </span>
              <span className="text-caption text-text-tertiary font-sans mt-0.5">
                Krumhansl-Schmuckler • Camelot DJ
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal de tonalidad armónica"
            className="min-h-11 min-w-11 p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Detected Key Spotlight Banner */}
        <div className="p-2.5 rounded-card bg-surface-base/80 border border-border-subtle flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-caption text-text-tertiary uppercase tracking-wider block">
              Tonalidad en Vivo
            </span>
            <div className="text-body font-bold tracking-tight text-text-primary flex items-center gap-1.5 mt-0.5 truncate">
              <Music2 className="w-4 h-4 text-accent-teal shrink-0" />
              <span className="truncate">{result.key}</span>
            </div>
            <span className="text-caption text-accent-purple font-mono mt-0.5 block">
              Código Camelot: <strong className="text-text-primary font-bold">{result.camelot}</strong>
            </span>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-caption text-text-tertiary mb-1">Confianza</span>
            <div className="w-16 h-2 rounded-pill bg-surface-base border border-border-subtle overflow-hidden">
              <div
                className="h-full bg-accent-teal transition-all duration-300"
                style={{ width: `${Math.round(result.confidence * 100)}%` }}
              />
            </div>
            <span className="text-caption text-accent-teal font-mono font-tabular mt-0.5">
              {Math.round(result.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Circle of Fifths / Camelot Wheel Grid */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-caption text-text-tertiary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-teal" /> Rueda de Quintas & Camelot
            </span>
            <span className="text-caption text-text-tertiary">Sector activo</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {CIRCLE_OF_FIFTHS.map((item) => {
              const isMajorMatch = result.mode === 'major' && result.camelot === item.camelotMaj;
              const isMinorMatch = result.mode === 'minor' && result.camelot === item.camelotMin;
              const isSectorActive = isMajorMatch || isMinorMatch;

              return (
                <div
                  key={item.major}
                  className={`p-1.5 rounded-control border text-center transition-all ${
                    isSectorActive
                      ? 'bg-accent-teal/20 border-accent-teal text-text-primary shadow-subtle ring-1 ring-accent-teal/50 font-bold'
                      : 'bg-surface-base/60 border-border-subtle text-text-secondary hover:border-border-medium'
                  }`}
                >
                  <div className="text-caption text-text-primary tracking-tight leading-tight">
                    {item.major} / {item.minor}
                  </div>
                  <div className="text-caption text-text-tertiary font-mono font-tabular mt-0.5">
                    {item.camelotMaj} • {item.camelotMin}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Chromagram Spectrogram */}
        <div className="pt-0.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-caption text-text-tertiary uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-accent-purple" /> Cromagrama (12 Semitonos)
            </span>
            <span className="text-caption text-text-tertiary">Do a Si</span>
          </div>

          <div className="grid grid-cols-12 gap-0.5 h-10 items-end p-1.5 rounded-card bg-surface-base/80 border border-border-subtle">
            {NOTE_NAMES.map((note, idx) => {
              const level = Math.max(0.04, Math.min(1, result.chromagram[idx] || 0));
              const isTonic = note === result.rootNote;

              return (
                <div key={note} className="flex flex-col items-center gap-0.5 h-full justify-end">
                  <div className="w-full bg-white/5 rounded-t overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-t transition-all duration-150 ${
                        isTonic
                          ? 'bg-accent-teal shadow-subtle'
                          : 'bg-accent-purple/60'
                      }`}
                      style={{ height: `${Math.round(level * 100)}%` }}
                    />
                  </div>
                  <span
                    className={`text-caption font-mono font-tabular leading-none ${
                      isTonic ? 'text-accent-teal font-bold' : 'text-text-tertiary'
                    }`}
                  >
                    {note}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-caption text-text-tertiary border-t border-border-subtle pt-1.5 text-center">
          Mezcla armónica DJ: Claves vecinas a ±1 hora o relativo mayor/menor
        </div>
      </div>
    </>
  );
};

export default HarmonicKeyModal;
