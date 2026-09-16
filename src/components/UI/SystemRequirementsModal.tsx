import React from 'react';
import { Monitor, Sparkles } from 'lucide-react';
import { StudioModal } from './studio/StudioModal';
import { StudioButton } from './studio/StudioButton';
import { detectLowPowerGpu } from '../../utils/gpuDetector';

interface SystemRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemRequirementsModal: React.FC<SystemRequirementsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const hardware = React.useMemo(() => detectLowPowerGpu(), []);
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 4 : 4;
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1).toFixed(1) : '1.0';

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title="Requisitos Recomendados del Sistema"
      subtitle="Diagnóstico de hardware en vivo para una experiencia 3D fluida y reactiva"
      badge="HARDWARE TELEMETRY"
      maxWidth="xl"
    >
      <div className="space-y-4 font-sans select-none">
        {/* Hardware Status Live Card */}
        <div className="p-3.5 rounded-card bg-accent-teal/10 border border-accent-teal/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-mono font-medium text-accent-teal flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              Tu Hardware Detectado
            </span>
            <span className="text-caption font-mono uppercase tracking-wider px-2 py-0.5 rounded-badge bg-accent-teal/15 text-accent-teal border border-accent-teal/30">
              {hardware.isIntegrated ? 'GPU Integrada / Modo Ahorro' : 'GPU Dedicada / Acelerada'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-caption font-mono pt-1">
            <div className="p-2 rounded-control bg-surface-base/80 border border-border-subtle">
              <span className="text-caption text-text-tertiary block">GPU</span>
              <span className="text-text-primary truncate block text-caption font-medium" title={hardware.gpuName}>
                {hardware.gpuName.replace(/angle\s*\(/i, '').replace(/\)/g, '').slice(0, 18) || 'WebGL2'}
              </span>
            </div>
            <div className="p-2 rounded-control bg-surface-base/80 border border-border-subtle">
              <span className="text-caption text-text-tertiary block">CPU Cores</span>
              <span className="text-text-primary block text-caption font-medium font-tabular">{cores} Hilos</span>
            </div>
            <div className="p-2 rounded-control bg-surface-base/80 border border-border-subtle">
              <span className="text-caption text-text-tertiary block">RAM Estimada</span>
              <span className="text-text-primary block text-caption font-medium font-tabular">~{mem} GB+</span>
            </div>
            <div className="p-2 rounded-control bg-surface-base/80 border border-border-subtle">
              <span className="text-caption text-text-tertiary block">Escala DPR</span>
              <span className="text-text-primary block text-caption font-medium font-tabular">{dpr}x</span>
            </div>
          </div>
        </div>

        {/* Requirements Comparison Table - 3 Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-caption">
          {/* Tier 1: Rendimiento Alto */}
          <div className="p-3.5 rounded-card bg-surface-base/60 border border-border-subtle space-y-2">
            <div className="flex items-center gap-1.5 text-accent-teal font-mono font-semibold text-caption">
              <span className="w-2 h-2 rounded-pill bg-accent-teal" />
              <span>Rendimiento Alto (Eco)</span>
            </div>
            <ul className="space-y-1.5 text-text-secondary font-mono text-caption leading-relaxed">
              <li>• Cualquier CPU Dual-Core o móvil.</li>
              <li>• GPU integrada básica o navegador móvil.</li>
              <li>• 900 partículas y DPR 0.85 optimizado.</li>
              <li>• 60 FPS garantizados con mínimo consumo de batería.</li>
            </ul>
          </div>

          {/* Tier 2: Gráficos Medios */}
          <div className="p-3.5 rounded-card bg-surface-base/60 border border-border-subtle space-y-2">
            <div className="flex items-center gap-1.5 text-status-warning font-mono font-semibold text-caption">
              <span className="w-2 h-2 rounded-pill bg-status-warning" />
              <span>Gráficos Medios (Balance)</span>
            </div>
            <ul className="space-y-1.5 text-text-secondary font-mono text-caption leading-relaxed">
              <li>• CPU Quad-Core (Intel i3/i5 o Ryzen 3/5).</li>
              <li>• GPU integrada moderna (Intel Iris Xe, AMD Vega).</li>
              <li>• 1,600 partículas y DPR 1.0 nítido.</li>
              <li>• Balance idóneo entre detalle visual y fluidez.</li>
            </ul>
          </div>

          {/* Tier 3: Gráficos Altos */}
          <div className="p-3.5 rounded-card bg-surface-base/60 border border-border-subtle space-y-2">
            <div className="flex items-center gap-1.5 text-accent-purple font-mono font-semibold text-caption">
              <span className="w-2 h-2 rounded-pill bg-accent-purple" />
              <span>Gráficos Altos (Ultra)</span>
            </div>
            <ul className="space-y-1.5 text-text-secondary font-mono text-caption leading-relaxed">
              <li>• CPU 6+ Cores y 8GB+ RAM.</li>
              <li>• GPU dedicada (NVIDIA RTX / GTX, AMD Radeon, Apple Silicon M1+).</li>
              <li>• 2,400 partículas Fibonacci y DPR hasta 1.5.</li>
              <li>• Sombras volumétricas, bloom y shockwaves multicapa.</li>
            </ul>
          </div>
        </div>

        {/* Studio Tip */}
        <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle text-caption font-mono text-text-tertiary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-teal shrink-0" />
          <span>
            Puedes alternar entre los 3 niveles en cualquier momento desde el indicador <strong>[RENDIMIENTO]</strong> en la barra superior o desde tu perfil de estudio.
          </span>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border-subtle flex justify-end">
          <StudioButton variant="secondary" size="sm" onClick={onClose}>
            Entendido
          </StudioButton>
        </div>
      </div>
    </StudioModal>
  );
};

export default SystemRequirementsModal;
