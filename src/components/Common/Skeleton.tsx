import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
}) => {
  const roundedClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'lg'
      ? 'rounded-[12px]'
      : rounded === 'sm'
      ? 'rounded-[6px]'
      : 'rounded-[10px]';

  return (
    <div
      aria-hidden="true"
      className={`bg-white/[0.06] animate-pulse border border-white/[0.04] ${roundedClass} ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
    />
  );
};

export default Skeleton;
