import React from 'react';
import { useSectionReveal } from '../../../hooks/useSectionReveal';

interface SectionWrapperProps {
  id: string;
  index: number;
  className?: string;
  children: React.ReactNode;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  id,
  index,
  className = '',
  children,
}) => {
  const { ref, isRevealed } = useSectionReveal(0.12);

  return (
    <section
      id={id}
      data-section-index={index}
      ref={ref}
      className={`landing-v2-section ${className}`}
    >
      <div
        className={`landing-v2-container landing-v2-reveal ${
          isRevealed ? 'is-revealed' : ''
        }`}
      >
        {children}
      </div>
    </section>
  );
};
