import React from 'react';
import type { LogoAppearance } from '../../types/audio';
import { logoFilter, tintColor } from '../../utils/logoAppearance';

interface LogoDiscProps {
  src: string;
  /** Diámetro en px */
  size: number;
  appearance: LogoAppearance;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Habilitar micro-surcos analógicos y reflejo de luz anisótropo */
  enableAnalogVinyl?: boolean;
}

/**
 * Disco de logo/carátula con refinamiento analógico de vinilo audiófilo.
 * Incluye:
 *  - Reflejo de luz anisótropo en doble lóbulo cónico ("bowtie sheen")
 *  - Micro-surcos radiales de alta resolución (lead-in & sound grooves)
 *  - Borde biselado con resplandor especular
 *  - Buje central metálico torneado (spindle bushing)
 */
export const LogoDisc: React.FC<LogoDiscProps> = ({
  src,
  size,
  appearance,
  className = '',
  style,
  children,
  enableAnalogVinyl = true,
}) => {
  const tint = tintColor(appearance.tint);
  const ring = tint || '#00f2fe';
  const spindleSize = Math.max(10, Math.round(size * 0.085));

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-[#06060a] select-none ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: appearance.neonBorder
          ? `0 0 0 2px ${ring}, 0 0 24px ${ring}99, inset 0 0 0 1px rgba(255, 255, 255, 0.2)`
          : 'inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.7)',
        ...style,
      }}
    >
      {/* 1. Imagen base de carátula con encuadre, zoom y filtros */}
      <img
        src={src}
        alt="Carátula / Logo"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none max-w-none pointer-events-none"
        style={{
          transform: `translate(${appearance.panX * size}px, ${appearance.panY * size}px) rotate(${appearance.rotation}deg) scale(${appearance.zoom})`,
          filter: logoFilter(appearance),
        }}
      />

      {/* 2. Tinte dinámico si está configurado */}
      {tint && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color opacity-80"
          style={{ backgroundColor: tint }}
        />
      )}

      {enableAnalogVinyl && (
        <>
          {/* 3. Micro-surcos de vinilo (High-density acoustic grooves) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-45 mix-blend-overlay"
            style={{
              background: `repeating-radial-gradient(
                circle at center,
                transparent 0px,
                transparent 2px,
                rgba(255, 255, 255, 0.08) 2.5px,
                rgba(0, 0, 0, 0.18) 3px,
                transparent 4px
              )`,
            }}
          />

          {/* 4. Surcos maestros espaciados (Lead-in, track separations & run-out band) */}
          <div className="absolute inset-[3%] rounded-full border border-white/15 pointer-events-none opacity-60" />
          <div className="absolute inset-[14%] rounded-full border border-white/10 pointer-events-none opacity-50" />
          <div className="absolute inset-[28%] rounded-full border border-white/10 pointer-events-none opacity-50" />
          <div className="absolute inset-[42%] rounded-full border border-white/15 pointer-events-none opacity-60" />

          {/* 5. Reflejo Anisótropo Conical ("Bowtie Sheen") */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-55 animate-[spin_32s_linear_infinite_reverse]"
            style={{
              background: `conic-gradient(
                from 45deg at 50% 50%,
                rgba(255, 255, 255, 0) 0deg,
                rgba(255, 255, 255, 0.28) 35deg,
                rgba(255, 255, 255, 0.05) 55deg,
                rgba(255, 255, 255, 0) 90deg,
                rgba(255, 255, 255, 0) 180deg,
                rgba(255, 255, 255, 0.28) 215deg,
                rgba(255, 255, 255, 0.05) 235deg,
                rgba(255, 255, 255, 0) 270deg,
                rgba(255, 255, 255, 0) 360deg
              )`,
            }}
          />

          {/* 6. Reflejo especular secundario cruzado (soft ambient fill) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none mix-blend-overlay opacity-30"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 40%, rgba(0, 0, 0, 0.5) 100%)`,
            }}
          />

          {/* 7. Bisel perimetral y borde exterior pulido */}
          <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]" />

          {/* 8. Buje Central Metálico Torneado (Precision Spindle Grommet) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10"
            style={{
              width: spindleSize,
              height: spindleSize,
              background: `radial-gradient(
                circle at 40% 35%,
                #18181b 0%,
                #09090b 45%,
                #71717a 48%,
                #e4e4e7 52%,
                #27272a 62%,
                #09090b 80%,
                #3f3f46 95%,
                #000000 100%
              )`,
              boxShadow: `
                0 2px 6px rgba(0, 0, 0, 0.9),
                0 0 1px 1px rgba(255, 255, 255, 0.4),
                inset 0 1px 2px rgba(255, 255, 255, 0.5),
                inset 0 -1px 2px rgba(0, 0, 0, 0.8)
              `,
            }}
          >
            {/* Orificio central del eje */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-[#030305] shadow-[inset_0_1px_2px_rgba(0,0,0,0.95)]" />
          </div>
        </>
      )}

      {children}
    </div>
  );
};

export default LogoDisc;
