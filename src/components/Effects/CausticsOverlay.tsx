import React from 'react';

export const CausticsOverlay: React.FC = () => (
  <div
    className="liquid-caustics-overlay"
    style={{
      '--glass-tint-active': 'var(--chameleon-primary, rgba(0, 229, 255, 0.3))',
    } as React.CSSProperties}
    aria-hidden="true"
  />
);

export default CausticsOverlay;
