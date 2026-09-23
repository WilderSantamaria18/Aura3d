import React from 'react';
import { Reveal } from '../shared/Reveal';

export const Enter: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  return (
    <section className="landing-section">
      <div className="landing-container flex flex-col items-center text-center">
        <Reveal>
          <div
            className="landing-logo-dot mb-20 cursor-pointer"
            onClick={onEnter}
            title="Iniciar Aura3D"
          />
        </Reveal>
        <Reveal delay={300}>
          <button
            onClick={onEnter}
            className="landing-enter-button"
            aria-label="Iniciar Aura3D"
          >
            Iniciar
          </button>
        </Reveal>
      </div>
    </section>
  );
};
