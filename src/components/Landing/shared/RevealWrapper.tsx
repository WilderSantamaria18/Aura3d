import React from 'react';
import { useSectionReveal } from '../../../hooks/useSectionReveal';

export interface RevealWrapperProps {
  children: React.ReactNode;
  variant?: 'from-bottom' | 'from-left' | 'from-right' | 'scale';
  delay?: number;
  className?: string;
}

export const RevealWrapper: React.FC<RevealWrapperProps> = ({
  children,
  variant = 'from-bottom',
  delay = 0,
  className = '',
}) => {
  const { ref, isRevealed } = useSectionReveal();

  const variantClass = {
    'from-bottom': '',
    'from-left': 'landing-reveal--from-left',
    'from-right': 'landing-reveal--from-right',
    scale: 'landing-reveal--scale',
  }[variant];

  return (
    <div
      ref={ref}
      className={`landing-reveal ${variantClass} ${isRevealed ? 'is-revealed' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
