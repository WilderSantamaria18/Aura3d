import React, { useRef, useEffect, useState } from 'react';

/**
 * Global Active Preview Manager (Singleton)
 * Ensures only 1 <LivePreview> RAF loop is actively executing at any given time,
 * preserving GPU/CPU budget for the main 3D visualizer and Web Audio API engine.
 */
class ActivePreviewManager {
  private activeId: string | null = null;
  private listeners: Map<string, (isActive: boolean) => void> = new Map();

  register(id: string, onChange: (isActive: boolean) => void) {
    this.listeners.set(id, onChange);
    if (!this.activeId) {
      this.activeId = id;
      onChange(true);
    } else {
      onChange(this.activeId === id);
    }
  }

  unregister(id: string) {
    this.listeners.delete(id);
    if (this.activeId === id) {
      // Transfer active token to next available preview
      const next = this.listeners.keys().next().value;
      this.activeId = next || null;
      if (next) {
        this.listeners.get(next)?.(true);
      }
    }
  }

  claimActive(id: string) {
    if (this.activeId === id) return;
    const prevId = this.activeId;
    this.activeId = id;
    if (prevId) {
      this.listeners.get(prevId)?.(false);
    }
    this.listeners.get(id)?.(true);
  }
}

const activePreviewManager = new ActivePreviewManager();

export interface LivePreviewProps {
  /** Rendering mode of preview */
  mode?: 'canvas' | 'svg' | 'dom';
  /** Render callback drawing into the 2D context */
  render: (ctx: CanvasRenderingContext2D) => void;
  /** Preview viewport width in px */
  width: number;
  /** Preview viewport height in px */
  height: number;
  /** Maximum frame rate (default: 30 FPS for non-blocking performance) */
  maxFPS?: number;
  /** Automatically pause when not visible in viewport (IntersectionObserver) */
  lazy?: boolean;
  /** Background styling */
  background?: 'transparent' | 'dark' | 'glass';
  /** Wrap in Apple Liquid Glass micro-frame */
  glassFrame?: boolean;
  /** Optional callback fired when frame renders */
  onRender?: () => void;
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

/**
 * LivePreview
 * Reusable, non-blocking lightweight live preview component.
 * Features strict 30 FPS cap, IntersectionObserver visibility pausing,
 * hardware concurrency gating (<4 cores), and single-active preview arbitration.
 */
export const LivePreview: React.FC<LivePreviewProps> = ({
  render,
  width,
  height,
  maxFPS = 30,
  lazy = true,
  background = 'dark',
  glassFrame = true,
  onRender,
  className = '',
  ariaLabel = 'Vista previa en tiempo real',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const frameInterval = 1000 / Math.max(1, Math.min(30, maxFPS));
  const instanceIdRef = useRef<string>(`preview_${Math.random().toString(36).slice(2, 9)}`);

  // Hardware concurrency check: disable continuous rendering on constrained systems
  const [canRender, setCanRender] = useState<boolean>(() => {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    return cores >= 4;
  });

  // Global singleton active state (only 1 preview runs RAF loop at a time)
  const [isGloballyActive, setIsGloballyActive] = useState<boolean>(true);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(true);

  // Register in singleton coordinator
  useEffect(() => {
    const id = instanceIdRef.current;
    activePreviewManager.register(id, (active) => {
      setIsGloballyActive(active);
    });

    return () => {
      activePreviewManager.unregister(id);
    };
  }, []);

  // IntersectionObserver for viewport pausing
  useEffect(() => {
    if (!lazy || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsIntersecting(visible);
        if (visible) {
          activePreviewManager.claimActive(instanceIdRef.current);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Main rendering loop (Throttled to 30 FPS max, paused if inactive or off-screen)
  useEffect(() => {
    if (!canRender) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: background !== 'dark' });
    if (!ctx) return;

    // Do an initial immediate render
    try {
      ctx.clearRect(0, 0, width, height);
      render(ctx);
      onRender?.();
    } catch (e) {
      console.warn('[LivePreview] Initial render error:', e);
    }

    if (!isGloballyActive || !isIntersecting) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = (timestamp: number) => {
      if (timestamp - lastFrameRef.current >= frameInterval) {
        lastFrameRef.current = timestamp;
        try {
          ctx.clearRect(0, 0, width, height);
          render(ctx);
          onRender?.();
        } catch (e) {
          console.warn('[LivePreview] Render loop error:', e);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [render, width, height, frameInterval, canRender, isGloballyActive, isIntersecting, background, onRender]);

  // Graceful fallback for low-end hardware
  if (!canRender) {
    return (
      <div
        className={`liquid-glass liquid-glass--micro flex items-center justify-center text-[10px] font-mono text-white/50 p-3 select-none text-center ${className}`}
        style={{ width, height }}
      >
        <span>Preview desactivado (hardware limitado)</span>
      </div>
    );
  }

  const bgStyle =
    background === 'transparent'
      ? 'transparent'
      : background === 'glass'
      ? 'rgba(8, 10, 16, 0.65)'
      : '#05070E';

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      onMouseEnter={() => activePreviewManager.claimActive(instanceIdRef.current)}
      className={`relative inline-flex items-center justify-center overflow-hidden transition-all duration-200 ${
        glassFrame ? 'liquid-glass liquid-glass--micro p-1.5 shadow-lg' : ''
      } ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl block"
        style={{
          width,
          height,
          background: bgStyle,
        }}
      />
    </div>
  );
};
