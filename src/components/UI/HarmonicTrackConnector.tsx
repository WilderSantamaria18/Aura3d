import React from 'react';
import { Sparkles, Check, Zap, Radio, Activity, ArrowRight } from 'lucide-react';
import type { Track } from '../../types/audio';
import { camelotWheelService } from '../../services/camelotWheelService';

interface HarmonicTrackConnectorProps {
  prevTrack: Track;
  nextTrack: Track;
  index: number;
}

export const HarmonicTrackConnector: React.FC<HarmonicTrackConnectorProps> = ({
  prevTrack,
  nextTrack,
}) => {
  const comp = camelotWheelService.getCompatibility(prevTrack, nextTrack);

  const getThemeStyles = () => {
    switch (comp.badgeTheme) {
      case 'emerald':
        return {
          pill: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
          dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
          line: 'from-emerald-500/30 via-emerald-400/20 to-transparent',
        };
      case 'cyan':
        return {
          pill: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
          dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
          line: 'from-cyan-500/30 via-cyan-400/20 to-transparent',
        };
      case 'amber':
        return {
          pill: 'bg-amber-500/10 border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
          dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
          line: 'from-amber-500/30 via-amber-400/20 to-transparent',
        };
      case 'purple':
        return {
          pill: 'bg-purple-500/10 border-purple-400/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
          dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
          line: 'from-purple-500/30 via-purple-400/20 to-transparent',
        };
      default:
        return {
          pill: 'bg-white/[0.04] border-white/10 text-white/60 shadow-none',
          dot: 'bg-white/40',
          line: 'from-white/10 via-white/5 to-transparent',
        };
    }
  };

  const theme = getThemeStyles();

  const renderIcon = () => {
    switch (comp.icon) {
      case 'sparkles':
        return <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />;
      case 'zap':
        return <Zap className="w-3 h-3 text-amber-400" />;
      case 'check':
        return <Check className="w-3 h-3 text-cyan-400" />;
      case 'radio':
        return <Radio className="w-3 h-3 text-purple-400" />;
      default:
        return <Activity className="w-3 h-3 text-white/50" />;
    }
  };

  const bpmDeltaText =
    comp.bpmDelta === 0
      ? '±0'
      : `${comp.bpmB >= comp.bpmA ? '+' : '-'}${comp.bpmDelta}`;

  return (
    <div className="relative flex items-center justify-center my-0.5 group/connector select-none">
      {/* Decorative connecting vertical line */}
      <div className="absolute inset-y-0 left-6 w-[1.5px] bg-gradient-to-b from-white/15 via-white/5 to-white/15 pointer-events-none" />

      {/* Pill Badge */}
      <div
        className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono tracking-tight border backdrop-blur-md transition-all duration-200 group-hover/connector:scale-[1.03] cursor-help ${theme.pill}`}
        title={`${comp.badgeLabel} • ${comp.badgeDetail}`}
      >
        <span className="flex items-center">{renderIcon()}</span>

        {/* Harmonic flow label */}
        <span className="font-semibold">{comp.keyA}</span>
        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
        <span className="font-semibold">{comp.keyB}</span>

        {/* BPM delta indicator */}
        <span className="text-white/30">•</span>
        <span className="tabular-nums font-medium text-[10px] opacity-90">
          {bpmDeltaText} BPM
        </span>

        {/* Perfect tag if harmonic score >= 90 */}
        {comp.compatibilityLevel === 'perfect' && (
          <span className="ml-0.5 text-emerald-300 font-bold text-[10px]">✓</span>
        )}
      </div>
    </div>
  );
};

export default HarmonicTrackConnector;
