/**
 * PlaceholderLines — Skeleton loading state for synchronized lyrics
 *
 * Emulates Apple visionOS Liquid Glass loading state with staggered pulse animations.
 */

import React from 'react';

const DEFAULT_WIDTHS = [85, 60, 75, 45, 90, 70, 55, 80];

interface PlaceholderLinesProps {
  count?: number;
}

export const PlaceholderLines: React.FC<PlaceholderLinesProps> = ({ count = 8 }) => {
  const widths = DEFAULT_WIDTHS.slice(0, count);

  return (
    <div className="space-y-4 py-6 px-4 w-full" aria-busy="true" aria-label="Cargando letras">
      {widths.map((width, i) => (
        <div
          key={i}
          className="h-6 bg-white/[0.04] border border-white/[0.03] rounded-xl animate-pulse shadow-sm"
          style={{
            width: `${width}%`,
            animationDelay: `${i * 110}ms`,
            animationDuration: '1.8s',
          }}
        />
      ))}
    </div>
  );
};

export default PlaceholderLines;
