import React, { useState, useEffect } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { PureVoidTemplate } from './templates/PureVoidTemplate';
import { AestheticTemplate } from './templates/AestheticTemplate';
import { StudioTemplate } from './templates/StudioTemplate';
import { VinylTemplate } from './templates/VinylTemplate';
import { Eye, Camera, RefreshCw } from 'lucide-react';

export const CardPreview: React.FC = () => {
  const cardConfig = useRecorderStore((state) => state.cardConfig);
  const [previewCanvasUrl, setPreviewCanvasUrl] = useState<string | null>(null);
  const [showSafeZones, setShowSafeZones] = useState(false);

  // Capture snapshot from the live visualizer canvas
  const captureSnapshot = () => {
    const canvas = document.getElementById('rainbow-void-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      try {
        const url = canvas.toDataURL('image/png');
        setPreviewCanvasUrl(url);
      } catch (err) {
        console.warn('Unable to extract canvas snapshot:', err);
      }
    }
  };

  useEffect(() => {
    captureSnapshot();
  }, []);

  const renderTemplate = () => {
    switch (cardConfig.template) {
      case 'aesthetic':
        return <AestheticTemplate config={cardConfig} previewCanvasUrl={previewCanvasUrl} />;
      case 'studio':
        return <StudioTemplate config={cardConfig} previewCanvasUrl={previewCanvasUrl} />;
      case 'vinyl':
        return <VinylTemplate config={cardConfig} previewCanvasUrl={previewCanvasUrl} />;
      case 'pure_void':
      default:
        return <PureVoidTemplate config={cardConfig} previewCanvasUrl={previewCanvasUrl} />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4">
      {/* Action bar above preview */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            showSafeZones
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
              : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Instagram Story Safe Zones (1080x1920 boundaries)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>IG Safe Zones</span>
        </button>

        <button
          onClick={captureSnapshot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/70 border border-white/10 hover:text-white hover:bg-white/10 transition-all"
          title="Take a new snapshot of current visualizer frame"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Capture Frame</span>
        </button>
      </div>

      {/* 9:16 Phone Frame */}
      <div className="relative w-[270px] h-[480px] sm:w-[315px] sm:h-[560px] rounded-[38px] p-2 bg-gradient-to-b from-white/20 via-white/5 to-white/10 backdrop-blur-xl border border-white/25 shadow-2xl shadow-black/80 flex items-center justify-center">
        {/* Phone Speaker notch / Dynamic Island simulation */}
        <div className="absolute top-4 w-20 h-4 bg-black/80 rounded-full z-30 border border-white/10 flex items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/20 mr-2" />
        </div>

        {/* Card Screen Container */}
        <div className="relative w-full h-full rounded-[30px] overflow-hidden shadow-inner bg-black">
          {renderTemplate()}

          {/* Instagram Safe Zone Overlays (Story header & message footer areas) */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
              {/* Top 14% danger zone */}
              <div className="h-[14%] w-full bg-red-500/20 border-b border-red-500/40 flex items-center justify-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-300">
                  Header Safe Zone
                </span>
              </div>
              {/* Bottom 20% danger zone */}
              <div className="h-[20%] w-full bg-red-500/20 border-t border-red-500/40 flex items-center justify-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-300">
                  Reply / UI Safe Zone
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
