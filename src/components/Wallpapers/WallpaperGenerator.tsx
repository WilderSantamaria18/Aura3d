import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check, Eye } from 'lucide-react';
import { useWallpaperGenerator } from '../../hooks/useWallpaperGenerator';
import { StyleSelector } from './shared/StyleSelector';
import { AspectRatioPicker } from './shared/AspectRatioPicker';
import { PaletteSelector } from './shared/PaletteSelector';
import { QualityPicker } from './shared/QualityPicker';
import { PROMPT_SUGGESTIONS } from '../../services/wallpaperPresetsService';
import type { WallpaperGenerationResult } from '../../types/wallpaper';
import { WallpaperGenerationSkeleton } from './WallpaperGenerationSkeleton';
import { triggerVisualShockwave } from '../UI/VisualFeedbackRipple';

interface WallpaperGeneratorProps {
  onApply?: (item: WallpaperGenerationResult) => void;
  onPreview?: (item: WallpaperGenerationResult) => void;
}

export const WallpaperGenerator: React.FC<WallpaperGeneratorProps> = ({ onApply, onPreview }) => {
  const [lastGenerated, setLastGenerated] = useState<WallpaperGenerationResult | null>(null);
  const [isAppliedJustNow, setIsAppliedJustNow] = useState(false);

  const {
    prompt,
    setPrompt,
    style,
    setStyle,
    aspectRatio,
    setAspectRatio,
    palette,
    setPalette,
    quality,
    setQuality,
    generate,
    isGenerating,
    generationProgress,
    generationError,
  } = useWallpaperGenerator();

  const handleSuggestionClick = (sug: string) => {
    setPrompt(sug);
  };

  const handleGenerate = async () => {
    setIsAppliedJustNow(false);
    const result = await generate();
    if (result) {
      setLastGenerated(result);
      triggerVisualShockwave({ color: '#00e5ff' });
    }
  };

  const handleApplyClick = (item: WallpaperGenerationResult, e?: React.MouseEvent) => {
    if (onApply) {
      onApply(item);
      setIsAppliedJustNow(true);
      const rect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : undefined;
      const y = rect ? rect.top + rect.height / 2 : undefined;
      triggerVisualShockwave({ x, y, color: '#10b981' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt Textarea */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
          <span className="uppercase tracking-wider">Descripción del Fondo (Prompt)</span>
          <span>{prompt.length} / 500</span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          placeholder="Ej: Un Porsche 911 clásico en un campo de lavanda al atardecer, cinematográfico..."
          rows={3}
          disabled={isGenerating}
          className="glass-input !rounded-2xl w-full p-3.5 text-xs text-white placeholder-white/45 outline-none resize-none"
        />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
          Sugerencias rápidas
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_SUGGESTIONS.slice(0, 4).map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              disabled={isGenerating}
              className="glass-btn !rounded-xl text-left px-3 py-1 text-[10px] text-white/75 hover:text-white truncate max-w-full"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Style Selector */}
      <StyleSelector selected={style} onSelect={setStyle} />

      {/* Aspect Ratio Picker */}
      <AspectRatioPicker selected={aspectRatio} onSelect={setAspectRatio} />

      {/* Resolución */}
      <QualityPicker selected={quality} aspectRatio={aspectRatio} onSelect={setQuality} disabled={isGenerating} />

      {/* Palette Selector */}
      <PaletteSelector selected={palette} onSelect={setPalette} />

      {/* Error alert */}
      {generationError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Main Generate Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer btn-spring ${
          isGenerating || !prompt.trim()
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-white hover:bg-white/90 text-black shadow-[0_4px_24px_rgba(255,255,255,0.35)]'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Generando {quality === "4k" ? "4K" : quality === "fhd" ? "Full HD" : "HD"}…</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Generar Fondo con IA</span>
          </>
        )}
      </button>

      {/* Iridescent Shimmer Generative Canvas Skeleton during AI synthesis */}
      {isGenerating && (
        <WallpaperGenerationSkeleton
          aspectRatio={aspectRatio}
          progress={generationProgress}
          quality={quality}
          style={style}
        />
      )}

      {/* Generated Result Success Card */}
      {lastGenerated && (
        <div className="glass-card !p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              ¡Fondo generado con éxito!
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-400/30">
                {lastGenerated.aspectRatio}
              </span>
              <span className="text-[10px] font-mono text-white/40 uppercase">
                {lastGenerated.width}×{lastGenerated.height} • {lastGenerated.style}
              </span>
            </div>
          </div>

          <div
            className={`relative rounded-xl overflow-hidden bg-black/60 border border-white/10 group shadow-lg ${
              lastGenerated.aspectRatio === '21:9'
                ? 'aspect-[21/9] w-full'
                : lastGenerated.aspectRatio === '9:16'
                ? 'aspect-[9/16] max-h-[380px] w-auto mx-auto'
                : lastGenerated.aspectRatio === '1:1'
                ? 'aspect-square max-h-[340px] w-auto mx-auto'
                : lastGenerated.aspectRatio === '4:3'
                ? 'aspect-[4/3] max-h-[340px] w-auto mx-auto'
                : 'aspect-video w-full'
            }`}
          >
            <img
              src={lastGenerated.url}
              alt={lastGenerated.prompt}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(lastGenerated)}
                className="flex-1 py-2 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Previsualizar</span>
              </button>
            )}

            {onApply && (
              <button
                type="button"
                onClick={(e) => handleApplyClick(lastGenerated, e)}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer btn-spring ${
                  isAppliedJustNow
                    ? 'bg-emerald-400 text-black'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black hover:scale-105 active:scale-95'
                }`}
              >
                {isAppliedJustNow ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>¡Aplicado al Fondo!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Aplicar Fondo Global</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
