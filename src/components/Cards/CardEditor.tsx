import React, { useState } from 'react';
import { useRecorderStore, type CardTemplate, type CardFontFamily } from '../../store/recorderStore';
import { cardGenerator } from '../../services/cardGenerator';
import { 
  Palette, 
  Type, 
  Sparkles, 
  Sliders, 
  Download, 
  Check, 
  Music, 
  User,
  Layers
} from 'lucide-react';
import { LivePreview } from '../Preview/LivePreview';

const PALETTES = [
  { name: 'Pure Void', bg: '#08080c', primary: '#8b5cf6', secondary: '#3b82f6', text: '#f8fafc' },
  { name: 'Neon Cyber', bg: '#050510', primary: '#ec4899', secondary: '#06b6d4', text: '#ffffff' },
  { name: 'Golden Sunset', bg: '#100b08', primary: '#f97316', secondary: '#eab308', text: '#fef3c7' },
  { name: 'Matrix Emerald', bg: '#040d08', primary: '#10b981', secondary: '#059669', text: '#ecfdf5' },
  { name: 'Obsidian Minimal', bg: '#000000', primary: '#ffffff', secondary: '#a1a1aa', text: '#ffffff' },
];

export const CardEditor: React.FC = () => {
  const cardConfig = useRecorderStore((state) => state.cardConfig);
  const updateCardConfig = useRecorderStore((state) => state.updateCardConfig);
  const setActiveTab = useRecorderStore((state) => state.setActiveTab);

  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleTemplateChange = (template: CardTemplate) => {
    updateCardConfig({ template });
  };

  const handleFontChange = (fontFamily: CardFontFamily) => {
    updateCardConfig({ fontFamily });
  };

  const handlePaletteSelect = (pal: typeof PALETTES[0]) => {
    updateCardConfig({
      backgroundColor: pal.bg,
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      textColor: pal.text,
    });
  };

  const handleGenerateAndExport = async () => {
    try {
      setIsGenerating(true);
      const canvas = document.getElementById('rainbow-void-canvas') as HTMLCanvasElement | null;
      const cardBlob = await cardGenerator.generateCard(cardConfig, canvas || undefined);

      // Create blob URL and initiate download or switch to export
      const url = URL.createObjectURL(cardBlob);
      const a = document.createElement('a');
      a.href = url;
      const titleSafe = (cardConfig.title || 'Card').replace(/\s+/g, '_');
      a.download = `Aura3D_Story_${titleSafe}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      setSuccessMsg('Story Card exported in 1080x1920 HD!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to export card:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-[600px] custom-scrollbar text-white">
      {/* Template Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Card Template</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['pure_void', 'aesthetic', 'studio', 'vinyl'] as CardTemplate[]).map((tmpl) => {
            const isSelected = cardConfig.template === tmpl || (tmpl === 'pure_void' && cardConfig.template === 'pure-void');
            const labels: Record<CardTemplate, string> = {
              pure_void: 'Pure Void',
              'pure-void': 'Pure Void',
              aesthetic: 'Aesthetic Glow',
              studio: 'Studio Master',
              vinyl: 'Analog Vinyl'
            };
            return (
              <button
                key={tmpl}
                onClick={() => handleTemplateChange(tmpl)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left flex items-center justify-between ${
                  isSelected
                    ? 'bg-purple-500/20 text-white border-purple-500/50 shadow-sm shadow-purple-500/20'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{labels[tmpl]}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata Inputs */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-purple-400" />
          <span>Track Metadata</span>
        </label>
        <div className="space-y-2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={cardConfig.title}
              onChange={(e) => updateCardConfig({ title: e.target.value })}
              placeholder="Track Title"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500/60 focus:bg-white/10 transition-all"
            />
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={cardConfig.artist}
              onChange={(e) => updateCardConfig({ artist: e.target.value })}
              placeholder="Artist / Producer"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500/60 focus:bg-white/10 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Color Palettes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span>Color Palette & Dynamic Aura</span>
          </label>
        </div>

        {/* Dynamic Lightwave Live Preview */}
        <div className="w-full flex justify-center py-1">
          <LivePreview
            width={260}
            height={50}
            maxFPS={30}
            lazy={true}
            background="glass"
            glassFrame={true}
            render={(ctx) => {
              const w = 260;
              const h = 50;
              const time = performance.now() * 0.0025;
              const grad = ctx.createLinearGradient(0, 0, w, 0);
              grad.addColorStop(0, cardConfig.primaryColor || '#8b5cf6');
              grad.addColorStop(1, cardConfig.secondaryColor || '#3b82f6');
              ctx.strokeStyle = grad;
              ctx.lineWidth = 2;
              ctx.shadowColor = cardConfig.primaryColor || '#8b5cf6';
              ctx.shadowBlur = 8;
              ctx.beginPath();
              for (let x = 0; x < w; x += 4) {
                const y = h / 2 + Math.sin(x * 0.06 + time) * 11 * Math.cos(x * 0.03 + time * 0.7);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {PALETTES.map((pal) => (
            <button
              key={pal.name}
              onClick={() => handlePaletteSelect(pal)}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <span className="text-xs font-medium text-white/80">{pal.name}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: pal.bg }} />
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pal.primary }} />
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pal.secondary }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-purple-400" />
          <span>Typography Style</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['sans', 'serif', 'mono'] as CardFontFamily[]).map((font) => (
            <button
              key={font}
              onClick={() => handleFontChange(font)}
              className={`py-2 px-2 text-center rounded-xl text-xs uppercase tracking-wider border transition-all ${
                cardConfig.fontFamily === font
                  ? 'bg-purple-500/20 text-white border-purple-500/50'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {font}
            </button>
          ))}
        </div>
      </div>

      {/* Post Processing Filters */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Visual Polish & Filters</span>
        </label>
        <div className="space-y-2 bg-white/5 p-3 rounded-2xl border border-white/10">
          <div>
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Aura Bloom</span>
              <span>{Math.round((cardConfig.bloom ?? 0.6) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cardConfig.bloom ?? 0.6}
              onChange={(e) => updateCardConfig({ bloom: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Film Grain</span>
              <span>{Math.round((cardConfig.grain ?? 0.1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.02"
              value={cardConfig.grain ?? 0.1}
              onChange={(e) => updateCardConfig({ grain: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Vignette Edge</span>
              <span>{Math.round((cardConfig.vignette ?? 0.4) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cardConfig.vignette ?? 0.4}
              onChange={(e) => updateCardConfig({ vignette: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 h-1 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Export Action */}
      <div className="pt-2">
        <button
          onClick={handleGenerateAndExport}
          disabled={isGenerating}
          className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white shadow-lg shadow-purple-500/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Rendering 1080x1920 Card...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export HD Story Card</span>
            </>
          )}
        </button>

        {successMsg && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium animate-fade-in flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
