import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Download,
  Upload,
  Plus,
  Trash2,
  Check,
  Search,
} from 'lucide-react';
import { StudioModal, StudioButton } from './studio';
import { PresetService, FACTORY_PRESETS } from '../../services/presetService';
import type { ScenePreset } from '../../types/presets';
import { usePlayerStore } from '../../stores/playerStore';

export const PresetsModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isPresetsModalOpen);
  const onClose = () => usePlayerStore.getState().setPresetsModalOpen(false);

  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const visualizerShape = usePlayerStore((s) => s.visualizerShape);
  const waveEffectMode = usePlayerStore((s) => s.waveEffectMode);
  const waveEffectIntensity = usePlayerStore((s) => s.waveEffectIntensity);
  const bassBoomThreshold = usePlayerStore((s) => s.bassBoomThreshold);
  const bassBoomIntensity = usePlayerStore((s) => s.bassBoomIntensity);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);
  const lucidSecondaryColor = usePlayerStore((s) => s.lucidSecondaryColor);
  const sphereScale = usePlayerStore((s) => s.sphereScale);
  const sphereOpacity = usePlayerStore((s) => s.sphereOpacity);
  const blobScale = usePlayerStore((s) => s.blobScale);
  const musicSensitivity = usePlayerStore((s) => s.musicSensitivity);
  const audioSpeed = usePlayerStore((s) => s.audioSpeed);
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const setAutoNotification = usePlayerStore((s) => s.setAutoNotification);

  const [presets, setPresets] = useState<ScenePreset[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'factory' | 'user'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load presets whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPresets(PresetService.getAllPresets());
      setIsCreating(false);
    }
  }, [isOpen]);

  const handleApply = (preset: ScenePreset) => {
    PresetService.applyPreset(preset);
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 1800);
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const saved = PresetService.saveUserPreset({
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || 'Preset personalizado guardado por el usuario.',
      tags: ['Personalizado', visualizerMode.toUpperCase()],
      visualizerMode,
      visualizerShape,
      waveEffectMode,
      waveEffectIntensity,
      bassBoomThreshold,
      bassBoomIntensity,
      isLucid,
      lucidPrimaryColor,
      lucidSecondaryColor,
      sphereScale,
      sphereOpacity,
      blobScale,
      musicSensitivity,
      audioSpeed,
      blobSettings,
    });

    setPresets(PresetService.getAllPresets());
    setIsCreating(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setAutoNotification({
      id: Date.now(),
      type: 'success',
      message: `💾 Preset guardado: "${saved.name}"`,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Eliminar el preset "${name}"?`)) {
      PresetService.deleteUserPreset(id);
      setPresets(PresetService.getAllPresets());
    }
  };

  const handleExport = () => {
    PresetService.exportPresetsAsJson(presets);
    setAutoNotification({
      id: Date.now(),
      type: 'info',
      message: '📦 Archivo de presets JSON generado',
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = PresetService.importPresetsFromJson(text);
      if (result.success) {
        setPresets(PresetService.getAllPresets());
        setAutoNotification({
          id: Date.now(),
          type: 'success',
          message: `✨ ${result.count} presets importados correctamente`,
        });
      } else {
        setAutoNotification({
          id: Date.now(),
          type: 'warning',
          message: `⚠️ Error al importar: ${result.error}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredPresets = presets.filter((p) => {
    const matchesTab =
      activeTab === 'all' ? true : activeTab === 'factory' ? p.isFactory : !p.isFactory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title="Presets de Escena & Atmósferas"
      subtitle="Guarda, exporta y carga perfiles visuales completos con un solo clic"
      badge="ATMOSPHERES"
      icon={<SlidersHorizontal className="w-5 h-5 text-cyan-400" />}
      maxWidth="3xl"
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por nombre, atmósfera o etiqueta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors"
          />
        </div>

        {/* Global Preset Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <StudioButton
            size="sm"
            variant="primary"
            onClick={() => setIsCreating(!isCreating)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Guardar Actual
          </StudioButton>

          <StudioButton
            size="sm"
            variant="ghost"
            onClick={handleExport}
            icon={<Download className="w-3.5 h-3.5" />}
            title="Exportar archivo JSON"
          >
            Exportar
          </StudioButton>

          <StudioButton
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5" />}
            title="Importar archivo JSON"
          >
            Importar
          </StudioButton>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* 2. New Preset Form Drawer */}
      {isCreating && (
        <form
          onSubmit={handleSaveCurrent}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/60 border border-cyan-500/30 backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Capturar Estado Visual Actual
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-mono text-white/60 mb-1">
                Nombre del Preset *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Cyberpunk Rave 2077"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-white/60 mb-1">
                Descripción breve
              </label>
              <input
                type="text"
                placeholder="Ej. Ideal para música Synthwave / Darkwave"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/50 font-mono">
              Modo actual: <strong className="text-white uppercase">{visualizerMode}</strong> • Colores:{' '}
              <span style={{ color: lucidPrimaryColor }}>■</span>{' '}
              <span style={{ color: lucidSecondaryColor }}>■</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-xs text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <StudioButton size="sm" variant="primary" type="submit">
                Guardar en Biblioteca
              </StudioButton>
            </div>
          </div>
        </form>
      )}

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 pb-3 mb-4 border-b border-white/[0.08]">
        {[
          { id: 'all', label: 'Todos', count: presets.length },
          { id: 'factory', label: 'De Fábrica', count: FACTORY_PRESETS.length },
          { id: 'user', label: 'Mis Presets', count: presets.filter((p) => !p.isFactory).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'all' | 'factory' | 'user')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-white/60 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[50vh] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => {
          const isJustApplied = appliedPresetId === preset.id;

          return (
            <div
              key={preset.id}
              className="group relative p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header: Title & Badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Color Swatch Pill */}
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${preset.lucidPrimaryColor} 0%, ${preset.lucidSecondaryColor} 100%)`,
                        boxShadow: `0 0 10px ${preset.lucidPrimaryColor}66`,
                      }}
                    />
                    <h3 className="text-sm font-medium text-white tracking-tight">{preset.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {preset.isFactory ? (
                      <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        FACTORY
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        USUARIO
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">
                  {preset.description}
                </p>

                {/* Tags & Mode */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-white/80 uppercase font-semibold">
                    {preset.visualizerMode}
                  </span>
                  {preset.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.03] text-white/50"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="text-[10px] font-mono text-white/40">
                  Sens: {preset.musicSensitivity} • {preset.waveEffectMode}
                </span>

                <div className="flex items-center gap-2">
                  {!preset.isFactory && (
                    <button
                      onClick={() => handleDelete(preset.id, preset.name)}
                      className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Eliminar preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <StudioButton
                    size="sm"
                    variant={isJustApplied ? 'active' : 'secondary'}
                    onClick={() => handleApply(preset)}
                    icon={isJustApplied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
                  >
                    {isJustApplied ? 'Cargado' : 'Activar'}
                  </StudioButton>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPresets.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/40 font-mono text-xs">
            No se encontraron presets que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </StudioModal>
  );
};

export default PresetsModal;
