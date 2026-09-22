import React from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useWallpaperGenerator } from '../../hooks/useWallpaperGenerator';
import { StyleSelector } from './shared/StyleSelector';
import { AspectRatioPicker } from './shared/AspectRatioPicker';
import { PaletteSelector } from './shared/PaletteSelector';
import { PROMPT_SUGGESTIONS } from '../../services/wallpaperPresetsService';

export const WallpaperGenerator: React.FC = () => {
  const {
    prompt,
    setPrompt,
    style,
    setStyle,
    aspectRatio,
    setAspectRatio,
    palette,
    setPalette,
    generate,
    isGenerating,
    generationProgress,
    generationError,
  } = useWallpaperGenerator();

  const handleSuggestionClick = (sug: string) => {
    setPrompt(sug);
  };

  return (
    <div className="flex flex-col gap-4 max-h-[56vh] overflow-y-auto pr-1 custom-scrollbar">
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
          className="w-full p-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] focus:border-cyan-400/50 text-xs text-white placeholder-white/40 outline-none resize-none transition-colors"
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
              className="text-left px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-[10px] text-white/70 hover:text-white transition-colors truncate max-w-full"
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

      {/* Palette Selector */}
      <PaletteSelector selected={palette} onSelect={setPalette} />

      {/* Error alert */}
      {generationError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Generation Progress Bar */}
      {isGenerating && (
        <div className="flex flex-col gap-1.5 py-1">
          <div className="flex justify-between text-[10px] font-mono text-cyan-300">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Renderizando con IA...
            </span>
            <span>{generationProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Generate Button */}
      <button
        type="button"
        onClick={() => generate()}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
          isGenerating || !prompt.trim()
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-white hover:bg-white/90 text-black shadow-[0_4px_24px_rgba(255,255,255,0.35)] hover:scale-[1.01] active:scale-[0.98]'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Generando Imagen 4K...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Generar Fondo con IA</span>
          </>
        )}
      </button>
    </div>
  );
};
