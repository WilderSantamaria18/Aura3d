import React, { useState, useEffect, useRef } from "react";
import { SlidersHorizontal, Download, Upload, Plus, Trash2, Check, Search, X, Sparkles } from "lucide-react";
import { PresetService, FACTORY_PRESETS } from "../../services/presetService";
import type { ScenePreset } from "../../types/presets";
import { usePlayerStore } from "../../stores/playerStore";

/* ── Flash overlay ────────────────────────────────────────── */
const Flash: React.FC<{ c1: string; c2: string }> = ({ c1, c2 }) => (
  <div
    className="fixed inset-0 pointer-events-none z-[9999]"
    style={{
      background: `radial-gradient(ellipse at center, ${c1}44 0%, ${c2}22 50%, transparent 72%)`,
      animation: "pm-flash 600ms ease-out forwards",
    }}
  />
);

const ATMO: Record<string, string> = {
  sunset: "Atardecer", cyber_city: "Cyber City", cosmic_voyager: "Viajero",
  ripples: "Gotas", rain: "Lluvia", sand: "Arena", stars: "Estrellas",
  matrix: "Matrix", aurora: "Aurora",
};

export const PresetsModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isPresetsModalOpen);
  const close = () => usePlayerStore.getState().setPresetsModalOpen(false);

  const visualizerMode   = usePlayerStore((s) => s.visualizerMode);
  const visualizerShape  = usePlayerStore((s) => s.visualizerShape);
  const waveEffectMode   = usePlayerStore((s) => s.waveEffectMode);
  const waveEffectIntensity = usePlayerStore((s) => s.waveEffectIntensity);
  const bassBoomThreshold   = usePlayerStore((s) => s.bassBoomThreshold);
  const bassBoomIntensity   = usePlayerStore((s) => s.bassBoomIntensity);
  const isLucid          = usePlayerStore((s) => s.isLucid);
  const lucidPrimaryColor   = usePlayerStore((s) => s.lucidPrimaryColor);
  const lucidSecondaryColor = usePlayerStore((s) => s.lucidSecondaryColor);
  const sphereScale      = usePlayerStore((s) => s.sphereScale);
  const sphereOpacity    = usePlayerStore((s) => s.sphereOpacity);
  const blobScale        = usePlayerStore((s) => s.blobScale);
  const musicSensitivity = usePlayerStore((s) => s.musicSensitivity);
  const audioSpeed       = usePlayerStore((s) => s.audioSpeed);
  const blobSettings     = usePlayerStore((s) => s.blobSettings);
  const notify           = usePlayerStore((s) => s.setAutoNotification);

  const [presets, setPresets]   = useState<ScenePreset[]>([]);
  const [tab, setTab]           = useState<"all" | "factory" | "user">("all");
  const [q, setQ]               = useState("");
  const [saving, setSaving]     = useState(false);
  const [saveName, setSaveName] = useState("");
  const [applied, setApplied]   = useState<string | null>(null);
  const [flash, setFlash]       = useState<{ c1: string; c2: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) { setPresets(PresetService.getAllPresets()); setSaving(false); }
  }, [isOpen]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(t);
  }, [flash]);

  const apply = (p: ScenePreset) => {
    PresetService.applyPreset(p);
    setApplied(p.id);
    setFlash({ c1: p.lucidPrimaryColor, c2: p.lucidSecondaryColor });
    setTimeout(() => setApplied(null), 1600);
  };

  const saveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    const saved = PresetService.saveUserPreset({
      name: saveName.trim(), description: "Preset personalizado.",
      tags: ["Personalizado", visualizerMode.toUpperCase()],
      visualizerMode, visualizerShape, waveEffectMode, waveEffectIntensity,
      bassBoomThreshold, bassBoomIntensity, isLucid, lucidPrimaryColor,
      lucidSecondaryColor, sphereScale, sphereOpacity, blobScale,
      musicSensitivity, audioSpeed,
      backgroundAtmosphere: blobSettings.backgroundAtmosphere, blobSettings,
    });
    setPresets(PresetService.getAllPresets());
    setSaving(false); setSaveName("");
    notify({ id: Date.now(), type: "success", message: `💾 "${saved.name}" guardado` });
  };

  const remove = (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    PresetService.deleteUserPreset(id);
    setPresets(PresetService.getAllPresets());
  };

  const exportAll = () => {
    PresetService.exportPresetsAsJson(presets);
    notify({ id: Date.now(), type: "info", message: "📦 Presets exportados" });
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const r = PresetService.importPresetsFromJson(ev.target?.result as string);
      if (r.success) {
        setPresets(PresetService.getAllPresets());
        notify({ id: Date.now(), type: "success", message: `✨ ${r.count} presets importados` });
      } else {
        notify({ id: Date.now(), type: "warning", message: `⚠️ ${r.error}` });
      }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const list = presets.filter((p) => {
    const okTab = tab === "all" ? true : tab === "factory" ? p.isFactory : !p.isFactory;
    const okQ   = !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
                  p.tags?.some((t) => t.toLowerCase().includes(q.toLowerCase()));
    return okTab && okQ;
  });

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes pm-flash {
          0%   { opacity:0; transform:scale(0.8); }
          30%  { opacity:1; transform:scale(1); }
          100% { opacity:0; transform:scale(1.5); }
        }
        @keyframes pm-in {
          from { transform:translateX(100%); }
          to   { transform:translateX(0); }
        }
        .pm-drawer { animation: pm-in 240ms cubic-bezier(0.16,1,0.3,1) both; }
        .pm-list::-webkit-scrollbar { width:3px; }
        .pm-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }
      `}</style>

      {flash && <Flash c1={flash.c1} c2={flash.c2} />}

      {/* Backdrop only covers the LEFT side, not the drawer */}
      <div
        className="fixed inset-0 z-40"
        style={{ right: "340px" }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="pm-drawer fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[360px] max-w-[calc(100vw-24px)] bg-surface-overlay material-thick border-l border-border-subtle overflow-hidden text-text-primary"
        role="dialog"
        aria-modal="true"
        aria-label="Presets de Escena"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent-teal" />
            <span className="text-body font-semibold text-text-primary tracking-wide">Presets</span>
            <span className="text-caption font-mono px-2 py-0.5 rounded-badge bg-surface-base text-text-secondary border border-border-subtle font-tabular">
              {list.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setSaving(!saving)} title="Guardar actual" aria-label="Guardar preset actual"
              className={`min-h-11 min-w-11 p-2 rounded-control flex items-center justify-center transition-colors cursor-pointer ${saving ? "text-accent-teal bg-accent-teal/15 border border-accent-teal/30" : "text-text-secondary hover:text-text-primary hover:bg-white/10"}`}>
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={exportAll} title="Exportar JSON" aria-label="Exportar presets a JSON"
              className="min-h-11 min-w-11 p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-control transition-colors flex items-center justify-center cursor-pointer">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => fileRef.current?.click()} title="Importar JSON" aria-label="Importar presets desde JSON"
              className="min-h-11 min-w-11 p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-control transition-colors flex items-center justify-center cursor-pointer">
              <Upload className="w-4 h-4" />
            </button>
            <input type="file" ref={fileRef} accept=".json" onChange={importFile} className="hidden" />
            <div className="w-px h-5 bg-border-subtle mx-0.5" />
            <button onClick={close} aria-label="Cerrar panel de presets" className="min-h-11 min-w-11 p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-control transition-colors flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Save form ──────────────────────── */}
        {saving && (
          <form onSubmit={saveNew} className="px-4 py-3 border-b border-border-subtle flex-shrink-0 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-caption text-accent-teal flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Nombre del preset…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="flex-1 min-h-11 bg-surface-base border border-border-subtle rounded-control px-3 py-2 text-caption text-text-primary placeholder-text-tertiary"
            />
            <button type="submit"
              className="min-h-11 px-3 py-2 rounded-control bg-accent-teal text-black text-caption font-semibold hover:bg-accent-teal/90 transition-colors flex-shrink-0 cursor-pointer">
              OK
            </button>
            <button type="button" onClick={() => setSaving(false)}
              className="min-h-11 px-2.5 py-2 text-text-secondary hover:text-text-primary text-caption flex-shrink-0 cursor-pointer">
              ✕
            </button>
          </form>
        )}

        {/* ── Search + Tabs ──────────────────── */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full min-h-11 pl-9 pr-3 py-2 bg-surface-base border border-border-subtle rounded-control text-caption text-text-primary placeholder-text-tertiary"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-control bg-surface-base border border-border-subtle">
            {(["all", "factory", "user"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 min-h-11 py-1 rounded-control text-caption font-mono transition-colors cursor-pointer ${
                  tab === t ? "bg-white/20 text-text-primary font-bold shadow-subtle" : "text-text-tertiary hover:text-text-primary"
                }`}>
                {t === "all" ? "Todos" : t === "factory" ? "Fábrica" : "Míos"}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto pm-list min-h-0">
          {list.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-caption font-mono">
              Sin resultados
            </div>
          )}
          {list.map((p) => {
            const isActive = applied === p.id;
            const atmo = p.backgroundAtmosphere && p.backgroundAtmosphere !== "none"
              ? ATMO[p.backgroundAtmosphere] : null;
            return (
              <div
                key={p.id}
                className={`group flex items-center gap-3 px-4 py-3 border-b border-border-subtle transition-colors ${
                  isActive ? "bg-white/10" : "hover:bg-surface-base/60"
                }`}
              >
                {/* Color dot */}
                <div
                  className="w-3.5 h-3.5 rounded-pill flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${p.lucidPrimaryColor}, ${p.lucidSecondaryColor})`,
                    boxShadow: isActive ? `0 0 8px ${p.lucidPrimaryColor}80` : "none",
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-caption font-medium truncate ${isActive ? "text-text-primary font-bold" : "text-text-secondary"}`}>
                      {p.name}
                    </span>
                    {atmo && (
                      <span className="text-caption text-text-tertiary font-mono flex-shrink-0">{atmo}</span>
                    )}
                  </div>
                  <span className="text-caption text-text-tertiary font-mono uppercase">
                    {p.visualizerMode}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!p.isFactory && (
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(p.id, p.name); }}
                      aria-label={`Eliminar preset ${p.name}`}
                      className="min-h-11 min-w-11 p-2 text-text-tertiary hover:text-status-error rounded-control transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); apply(p); }}
                  aria-label={`Aplicar preset ${p.name}`}
                  className={`flex-shrink-0 flex items-center gap-1 min-h-11 px-3 py-1.5 rounded-control text-caption font-mono font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/40"
                      : "bg-surface-base text-text-secondary border border-border-subtle hover:bg-white/10 hover:text-text-primary"
                  }`}
                >
                  {isActive ? <Check className="w-3.5 h-3.5" /> : null}
                  {isActive ? "Activo" : "Activar"}
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default PresetsModal;
