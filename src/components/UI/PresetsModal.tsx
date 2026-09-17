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
  sunset: "Atardecer",
  rain: "Lluvia",
  sand: "Arena",
  stars: "Estrellas",
  radial_burst: "Estallido Radial",
  stardust_drift: "Polvo Cósmico",
  light_beams: "Haces Luz",
  quantum_waves: "Ondas Cuánticas",
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
    notify({ id: Date.now(), type: "success", message: `"${saved.name}" guardado` });
  };

  const remove = (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    PresetService.deleteUserPreset(id);
    setPresets(PresetService.getAllPresets());
  };

  const exportAll = () => {
    PresetService.exportPresetsAsJson(presets);
    notify({ id: Date.now(), type: "info", message: "Presets exportados con éxito" });
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const r = PresetService.importPresetsFromJson(ev.target?.result as string);
      if (r.success) {
        setPresets(PresetService.getAllPresets());
        notify({ id: Date.now(), type: "success", message: `${r.count} presets importados con éxito` });
      } else {
        notify({ id: Date.now(), type: "warning", message: `${r.error}` });
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
        className="pm-drawer fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[340px] max-w-[calc(100vw-24px)] bg-[#080c17]/97 backdrop-blur-2xl border-l border-white/[0.07] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Presets de Escena"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white tracking-wide">Presets</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40 border border-white/[0.06]">
              {list.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setSaving(!saving)} title="Guardar actual"
              className={`p-1.5 rounded-lg transition-colors ${saving ? "text-cyan-300 bg-cyan-500/15" : "text-white/40 hover:text-white hover:bg-white/[0.05]"}`}>
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={exportAll} title="Exportar JSON"
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => fileRef.current?.click()} title="Importar JSON"
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input type="file" ref={fileRef} accept=".json" onChange={importFile} className="hidden" />
            <div className="w-px h-4 bg-white/[0.06] mx-0.5" />
            <button onClick={close} className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Save form ──────────────────────── */}
        {saving && (
          <form onSubmit={saveNew} className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0 flex gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 flex-shrink-0">
              <Sparkles className="w-3 h-3" />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Nombre del preset…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50"
            />
            <button type="submit"
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors flex-shrink-0">
              OK
            </button>
            <button type="button" onClick={() => setSaving(false)}
              className="px-2 py-1.5 text-white/40 hover:text-white text-xs flex-shrink-0">
              ✕
            </button>
          </form>
        )}

        {/* ── Search + Tabs ──────────────────── */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
            <input
              type="text"
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder-white/25 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="flex gap-0.5">
            {(["all", "factory", "user"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1 rounded-md text-[10px] font-mono transition-colors ${
                  tab === t ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60"
                }`}>
                {t === "all" ? "Todos" : t === "factory" ? "Fábrica" : "Míos"}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto pm-list min-h-0">
          {list.length === 0 && (
            <div className="py-12 text-center text-white/25 text-xs font-mono">
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
                className={`group flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] transition-colors ${
                  isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                }`}
              >
                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${p.lucidPrimaryColor}, ${p.lucidSecondaryColor})`,
                    boxShadow: isActive ? `0 0 6px ${p.lucidPrimaryColor}80` : "none",
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[11px] font-medium truncate ${isActive ? "text-white" : "text-white/80"}`}>
                      {p.name}
                    </span>
                    {atmo && (
                      <span className="text-[9px] text-white/30 font-mono flex-shrink-0">{atmo}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-white/25 font-mono uppercase">
                    {p.visualizerMode}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!p.isFactory && (
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(p.id, p.name); }}
                      className="p-1 text-white/25 hover:text-rose-400 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); apply(p); }}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white/[0.04] text-white/50 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {isActive ? <Check className="w-2.5 h-2.5" /> : null}
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
