import React from 'react';
import { useLandingStore } from '../../../stores/landingStore';

export interface ProgressRailSection {
  id: string;
  label: string;
  number: string;
}

interface ProgressRailProps {
  sections: ProgressRailSection[];
  onSelectSection: (index: number) => void;
}

export const ProgressRail: React.FC<ProgressRailProps> = ({
  sections,
  onSelectSection,
}) => {
  const activeSection = useLandingStore((s) => s.activeSection);

  return (
    <aside
      aria-label="Navegación de secciones"
      className="landing-v2-progress-rail hidden lg:flex select-none"
    >
      <div className="flex flex-col gap-3 py-3 px-2 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {sections.map((sec, i) => {
          const isActive = activeSection === i;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection(i)}
              className="group relative flex items-center justify-end p-1.5 focus:outline-none cursor-pointer"
              title={`${sec.number} ${sec.label}`}
              aria-label={`Ir a sección ${sec.label}`}
            >
              {/* Flyout Label on Hover / Active */}
              <span
                className={`absolute right-7 py-1 px-2.5 rounded-full text-[10px] font-mono tracking-wider whitespace-nowrap pointer-events-none transition-all duration-200 border ${
                  isActive
                    ? 'opacity-100 translate-x-0 bg-white/10 text-cyan-300 border-cyan-400/30 backdrop-blur-md shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                    : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 bg-black/60 text-white/70 border-white/10 backdrop-blur-md'
                }`}
              >
                <span className="text-white/40 mr-1.5">{sec.number}</span>
                {sec.label}
              </span>

              {/* Dot */}
              <div className="relative flex items-center justify-center">
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_12px_#00e5ff] scale-125'
                      : 'w-1.5 h-1.5 bg-white/25 group-hover:bg-white/60 group-hover:scale-125'
                  }`}
                />
                {isActive && (
                  <span className="absolute w-4 h-4 rounded-full border border-cyan-400/40 animate-ping pointer-events-none" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
