import React, { useCallback } from 'react';

export interface StudioFaderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
  showCenterDetent?: boolean;
  accentColor?: string;
  disabled?: boolean;
  className?: string;
}

export const StudioFader: React.FC<StudioFaderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.05,
  unit = '',
  defaultValue,
  onChange,
  showCenterDetent = false,
  accentColor = '#00e5ff',
  disabled = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined && !disabled) {
      onChange(defaultValue);
    }
  }, [defaultValue, disabled, onChange]);

  const formattedValue = () => {
    if (unit === 'dB') {
      return value > 0 ? `+${value.toFixed(1)} dB` : `${value.toFixed(1)} dB`;
    }
    if (unit === '%') {
      return `${Math.round(value * 100)}%`;
    }
    if (unit === 'x') {
      return `${value.toFixed(2)}x`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div
      className={`space-y-1 select-none font-sans ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {(label || unit) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="text-white/50 text-[10px] font-mono uppercase tracking-wider">
              {label}
            </span>
          )}
          <span
            onDoubleClick={handleDoubleClick}
            className="font-mono tabular-nums text-white/90 text-xs font-medium cursor-pointer"
            title={defaultValue !== undefined ? `Doble clic para restablecer (${defaultValue})` : undefined}
          >
            {formattedValue()}
          </span>
        </div>
      )}

      <div className="relative flex items-center h-4 group">
        {/* Track de audio */}
        <div className="relative w-full h-1 bg-white/[0.08] rounded-full overflow-hidden transition-all group-hover:h-1.5">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${percentage}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>

        {/* Muesca central opcional (detent 0dB / neutro) */}
        {showCenterDetent && (
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/20 pointer-events-none" />
        )}

        {/* Input invisible sobre el track */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={handleDoubleClick}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />

        {/* Pulgar táctil visual */}
        <div
          className="absolute w-3 h-3 rounded-full -translate-x-1/2 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.7)] border border-white/30 pointer-events-none transition-transform group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default StudioFader;
