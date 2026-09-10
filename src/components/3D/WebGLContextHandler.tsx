import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const WebGLContextHandler: React.FC = () => {
  const [hasLostContext, setHasLostContext] = useState(false);
  const [restoredCount, setRestoredCount] = useState(0);

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      // Prevent default browser behavior of never restoring context
      event.preventDefault();
      setHasLostContext(true);
      console.warn('[Aura3D Studio] WebGL Context lost. Waiting for GPU restoration...');
    };

    const handleContextRestored = () => {
      setHasLostContext(false);
      setRestoredCount((prev) => prev + 1);
      console.info('[Aura3D Studio] WebGL Context successfully restored.');
    };

    const canvases = document.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      canvas.addEventListener('webglcontextlost', handleContextLost, false);
      canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    });

    return () => {
      canvases.forEach((canvas) => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      });
    };
  }, []);

  if (!hasLostContext) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[100] max-w-sm bg-[#121417]/95 border border-amber-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-amber-300 uppercase tracking-widest">
              GPU Context Interrupted
            </span>
            {restoredCount > 0 && (
              <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/70">
                Recovered #{restoredCount}
              </span>
            )}
          </div>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            El contexto gráfico WebGL se ha suspendido temporalmente por el sistema. Aura3D intentará reanudar el renderizado automáticamente.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reiniciar Escena
        </button>
      </div>
    </div>
  );
};
