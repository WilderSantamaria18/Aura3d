import React from 'react';

/**
 * AmbientGlowLayer — luz ambiental fija de la aplicación.
 *
 * Antes esta capa seguía al cursor: cada `mousemove` reescribía un
 * `radial-gradient` sobre dos capas a pantalla completa, invalidando el degradado
 * y forzando un repintado de viewport completo por frame. Ahora la luz es fija
 * (misma composición en reposo que antes del primer movimiento) y no cuesta nada
 * por movimiento del puntero; el color sigue viniendo de la paleta camaleónica.
 */
export const AmbientGlowLayer: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none select-none z-[1] overflow-hidden">
      {/* Luz principal (centrada, sin seguimiento del cursor) */}
      <div
        className="liquid-ambient-glow absolute inset-0"
        style={{
          background: `radial-gradient(
            circle 900px at 50% 50%,
            var(--chameleon-glow, var(--wallpaper-glow, rgba(0, 229, 255, 0.12))),
            transparent 72%
          )`,
        }}
      />

      {/* Aura secundaria contrapesada */}
      <div
        className="absolute inset-0 mix-blend-screen opacity-60"
        style={{
          background: `radial-gradient(
            circle 750px at 50% 50%,
            var(--chameleon-border, rgba(168, 85, 247, 0.08)),
            transparent 68%
          )`,
        }}
      />
    </div>
  );
};

export default AmbientGlowLayer;
