import React from 'react';
import { useParallax } from '../../../hooks/useParallax';

interface ParallaxLayerProps {
  speed?: number;
  className?: string;
  children: React.ReactNode;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  speed = 0.25,
  className = '',
  children,
}) => {
  const { ref, offset } = useParallax(speed);

  return (
    <div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={{
        transform: `translate3d(0, ${-offset}px, 0)`,
      }}
    >
      {children}
    </div>
  );
};
