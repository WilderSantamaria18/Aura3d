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
}

/**
 * Disco de logo/carátula. Único punto de dibujo: lo usan el visualizador y la vista previa del editor,
 * por lo que lo que se ve al editar es exactamente lo que queda. La imagen se ajusta con `cover`
 * (siempre llena el círculo) y el encuadre se expresa en fracciones del diámetro.
 */
export const LogoDisc: React.FC<LogoDiscProps> = ({ src, size, appearance, className = '', style, children }) => {
  const tint = tintColor(appearance.tint);
  const ring = tint || '#00f2fe';

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-black/90 ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: appearance.neonBorder ? `0 0 0 2px ${ring}, 0 0 18px ${ring}88` : undefined,
        ...style,
      }}
    >
      <img
        src={src}
        alt="Carátula / Logo"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none max-w-none"
        style={{
          transform: `translate(${appearance.panX * size}px, ${appearance.panY * size}px) rotate(${appearance.rotation}deg) scale(${appearance.zoom})`,
          filter: logoFilter(appearance),
        }}
      />
      {tint && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color opacity-80"
          style={{ backgroundColor: tint }}
        />
      )}
      {children}
    </div>
  );
};

export default LogoDisc;
