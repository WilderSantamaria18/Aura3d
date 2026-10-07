import React from 'react';

export interface LiquidShimmerSkeletonProps {
  variant?: 'card' | 'text' | 'avatar' | 'list' | 'custom';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9' | '4:3';
  className?: string;
  count?: number;
  height?: string | number;
  width?: string | number;
}

/**
 * LiquidShimmerSkeleton — Skeleton de Cristal Líquido con Barrido Iridiscente
 * Proporciona un estado de carga cinemático y etéreo fiel a la estética visionOS.
 */
export const LiquidShimmerSkeleton: React.FC<LiquidShimmerSkeletonProps> = ({
  variant = 'card',
  aspectRatio = '16:9',
  className = '',
  count = 1,
  height,
  width,
}) => {
  const aspectClass =
    aspectRatio === '21:9'
      ? 'aspect-[21/9]'
      : aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : aspectRatio === '1:1'
      ? 'aspect-square'
      : aspectRatio === '4:3'
      ? 'aspect-[4/3]'
      : 'aspect-video';

  if (variant === 'avatar') {
    return (
      <div
        role="status"
        aria-label="Cargando..."
        className={`skeleton-glass rounded-full shrink-0 ${className}`}
        style={{ width: width || 40, height: height || 40 }}
      />
    );
  }

  if (variant === 'text') {
    return (
      <div role="status" aria-label="Cargando..." className={`flex flex-col gap-2 w-full ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="skeleton-glass h-3.5 rounded-md"
            style={{ width: i === count - 1 && count > 1 ? '65%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div role="status" aria-label="Cargando..." className={`flex flex-col gap-2.5 w-full ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="skeleton-glass p-2.5 rounded-xl flex items-center gap-3"
          >
            <div className="skeleton-glass w-9 h-9 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="skeleton-glass h-3 w-3/4 rounded-md" />
              <div className="skeleton-glass h-2.5 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Card Variant (Default)
  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={`skeleton-glass w-full ${aspectClass} ${className}`}
      style={{ height, width }}
    />
  );
};

export default LiquidShimmerSkeleton;
