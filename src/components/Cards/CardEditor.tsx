import React, { useMemo, useState } from 'react';
import { Check, LayoutTemplate, Palette, Sparkles, SwatchBook, Type } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../stores/playerStore';
import { useRecorderStore } from '../../store/recorderStore';
import type { CardAssets } from '../../services/storyCard/blocks';
import {
  CARD_FONTS,
  CARD_FORMATS,
  CARD_PALETTES,
  CARD_TEMPLATES,
  readableTextColor,
  type CardConfig,
  type CardFontId,
  type CardFormat,
  type CardPalette,
  type CardTemplate,
  type ResolvedCardContent,
} from '../../services/storyCard/config';
import { CardCanvas } from './CardCanvas';
import { CardActions } from './CardActions';
import { CardProfileSection } from './CardProfileSection';
import type { CoverState } from './useCardAssets';
import { FOCUS_RING, Section, Segmented, SliderRow, Switch, TextField } from './controls';

type EditorTab = 'design' | 'content' | 'style';

const TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
  { id: 'design', label: 'Diseño', icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
  { id: 'content', label: 'Contenido', icon: <Type className="h-3.5 w-3.5" /> },
  { id: 'style', label: 'Estilo', icon: <Palette className="h-3.5 w-3.5" /> },
];

const HEX = /^#[0-9a-f]{6}$/i;

interface CardEditorProps {
  config: CardConfig;
  content: ResolvedCardContent;
  assets: CardAssets;
  fontsVersion: number;
  coverState: CoverState;
}

// ── Plantillas con miniatura real ───────────────────────────────────────────

const TemplateOption: React.FC<{
  id: CardTemplate;
  label: string;
  hint: string;
  active: boolean;
  onSelect: () => void;
  config: CardConfig;
  content: ResolvedCardContent;
  assets: CardAssets;
  fontsVersion: number;
}> = ({ id, label, hint, active, onSelect, config, content, assets, fontsVersion }) => {
  // La miniatura es la tarjeta del usuario dibujada con esa plantilla: se ve cómo quedaría su canción
  const thumbConfig = useMemo(() => ({ ...config, template: id }), [config, id]);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`group flex flex-col gap-2 rounded-2xl border p-2 text-left transition-all ${FOCUS_RING} ${
        active
          ? 'border-violet-400/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.35)]'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
      }`}
    >
      <div className="mx-auto w-full max-w-[104px] overflow-hidden rounded-xl bg-black">
        <CardCanvas
          config={thumbConfig}
          content={content}
          assets={assets}
          fontsVersion={fontsVersion}
          ariaLabel={`Miniatura de la plantilla ${label}`}
        />
      </div>
      <div className="px-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-white">{label}</span>
          {active && <Check className="h-3.5 w-3.5 text-violet-300" />}
        </div>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/40">{hint}</span>
      </div>
    </button>
  );
};

// ── Pestaña Diseño ──────────────────────────────────────────────────────────

const DesignTab: React.FC<CardEditorProps> = ({ config, content, assets, fontsVersion, coverState }) => {
  const update = useRecorderStore((s) => s.updateCardConfig);
  const coverReady = coverState === 'ready';

  const coverHint =
    coverState === 'blocked'
      ? 'No se puede leer la portada de esta canción (el servidor no lo permite).'
      : coverState === 'none'
        ? 'La canción actual no tiene portada.'
        : coverState === 'loading'
          ? 'Cargando la portada…'
          : undefined;

  return (
    <div className="space-y-7">
      <Section title="Plantilla" icon={<SwatchBook className="h-3.5 w-3.5" />}>
        <div role="radiogroup" aria-label="Plantilla" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CARD_TEMPLATES.map((t) => (
            <TemplateOption
              key={t.id}
              id={t.id}
              label={t.label}
              hint={t.hint}
              active={config.template === t.id}
              onSelect={() => update({ template: t.id })}
              config={config}
              content={content}
              assets={assets}
              fontsVersion={fontsVersion}
            />
          ))}
        </div>
      </Section>

      <Section title="Formato" hint="La historia deja libres las zonas que Instagram tapa con su interfaz.">
        <Segmented<CardFormat>
          label="Formato"
          value={config.format}
          onChange={(format) => update({ format })}
          options={(Object.keys(CARD_FORMATS) as CardFormat[]).map((f) => ({
            value: f,
            label: CARD_FORMATS[f].label,
            sub: CARD_FORMATS[f].ratio,
          }))}
        />
      </Section>

      <Section
        title="Archivo"
        hint={
          config.fileFormat === 'jpeg'
            ? 'JPG: unos cientos de KB. Es lo habitual en Instagram, que de todos modos recomprime la imagen.'
            : 'PNG: sin pérdida, pero pesa de 2 a 4 MB (menos sin grano). Para un archivo ligero usa JPG.'
        }
      >
        <Segmented<'png' | 'jpeg'>
          label="Formato de archivo"
          value={config.fileFormat}
          onChange={(fileFormat) => update({ fileFormat })}
          options={[
            { value: 'png', label: 'PNG', sub: 'Sin pérdida' },
            { value: 'jpeg', label: 'JPG', sub: 'Más ligero' },
          ]}
        />
      </Section>

      <Section title="Imagen principal" hint={coverHint}>
        <Segmented
          label="Imagen principal"
          value={config.artSource}
          onChange={(artSource) => update({ artSource })}
          options={[
            { value: 'visualizer', label: 'Visualizador', sub: 'Fotograma del aura' },
            { value: 'cover', label: 'Portada', sub: 'De la canción', disabled: !coverReady },
          ]}
        />
      </Section>

      <Section title="Disposición del texto">
        <Segmented
          label="Disposición del texto"
          value={config.layout}
          onChange={(layout) => update({ layout })}
          options={[
            { value: 'center', label: 'Centrado' },
            { value: 'left', label: 'A la izquierda' },
          ]}
        />
      </Section>
    </div>
  );
};

// ── Pestaña Contenido ───────────────────────────────────────────────────────

const ContentTab: React.FC<CardEditorProps> = ({ config, content }) => {
  const update = useRecorderStore((s) => s.updateCardConfig);
  const updateElements = useRecorderStore((s) => s.updateCardElements);
  const hasMeta = content.bpm !== null || content.key !== null;

  return (
    <div className="space-y-7">
      <Section title="Canción" icon={<Type className="h-3.5 w-3.5" />}>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Switch
            checked={config.autoText}
            onChange={(autoText) => update({ autoText })}
            label="Seguir la canción que suena"
            description="El título y el artista se actualizan solos al cambiar de canción."
          />
          <TextField
            label="Sobretítulo"
            value={config.caption}
            maxLength={32}
            placeholder="AHORA SUENA"
            onChange={(caption) => update({ caption })}
          />
          <TextField
            label="Título"
            value={config.autoText ? content.title : config.title}
            maxLength={80}
            onChange={(title) => update({ title, autoText: false })}
          />
          <TextField
            label="Artista"
            value={config.autoText ? content.artist : config.artist}
            maxLength={60}
            onChange={(artist) => update({ artist, autoText: false })}
            hint={config.autoText ? 'Editar un campo desactiva «Seguir la canción que suena».' : undefined}
          />
        </div>
      </Section>

      <Section title="Elementos">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Switch
            checked={config.elements.logo}
            onChange={(logo) => updateElements({ logo })}
            label="Marca Aura3D"
            description="Logotipo discreto en la cabecera."
          />
          <Switch
            checked={config.elements.metadata}
            onChange={(metadata) => updateElements({ metadata })}
            disabled={!hasMeta}
            label="BPM y tono"
            description={
              hasMeta
                ? undefined
                : 'No disponible: la canción actual no informa de su BPM ni de su tono, y no se inventan.'
            }
          />
          <Switch
            checked={config.elements.date}
            onChange={(date) => updateElements({ date })}
            label="Fecha"
            description={content.dateLabel}
          />
        </div>
      </Section>

      <CardProfileSection />
    </div>
  );
};

// ── Pestaña Estilo ──────────────────────────────────────────────────────────

const StyleTab: React.FC<CardEditorProps> = ({ config }) => {
  const update = useRecorderStore((s) => s.updateCardConfig);
  const { themePrimary, themeSecondary } = usePlayerStore(
    useShallow((s) => ({ themePrimary: s.lucidPrimaryColor, themeSecondary: s.lucidSecondaryColor }))
  );

  // «Tema de Aura» toma los colores que el usuario está usando ahora mismo en la aplicación
  const palettes: CardPalette[] = useMemo(() => {
    const theme: CardPalette[] =
      HEX.test(themePrimary) && HEX.test(themeSecondary)
        ? [{ id: 'theme', name: 'Tu tema', background: '#07070d', primary: themePrimary, secondary: themeSecondary, text: '#f8fafc' }]
        : [];
    return [...theme, ...CARD_PALETTES];
  }, [themePrimary, themeSecondary]);

  const applyPalette = (p: CardPalette) =>
    update({
      paletteId: p.id,
      backgroundColor: p.background,
      primaryColor: p.primary,
      secondaryColor: p.secondary,
      textColor: p.text,
    });

  const setCustom = (patch: Partial<CardConfig>) => {
    const background = patch.backgroundColor ?? config.backgroundColor;
    update({ ...patch, paletteId: 'custom', textColor: readableTextColor(background) });
  };

  const colorInput = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-white/55">
      <input
        type="color"
        value={HEX.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`h-10 w-full cursor-pointer rounded-xl border border-white/15 bg-transparent p-0.5 ${FOCUS_RING}`}
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-7">
      <Section title="Paleta" icon={<Palette className="h-3.5 w-3.5" />}>
        <div role="radiogroup" aria-label="Paleta" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {palettes.map((p) => {
            const active = config.paletteId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => applyPalette(p)}
                className={`rounded-2xl border p-2 text-left transition-all ${FOCUS_RING} ${
                  active
                    ? 'border-violet-400/60 bg-violet-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <span
                  className="block h-9 rounded-xl border border-white/10"
                  style={{ background: `linear-gradient(135deg, ${p.background} 0%, ${p.primary} 55%, ${p.secondary} 100%)` }}
                />
                <span className="mt-1.5 flex items-center justify-between px-0.5 text-[11px] font-semibold text-white/85">
                  {p.name}
                  {active && <Check className="h-3 w-3 text-violet-300" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Personalizada</p>
          <div className="grid grid-cols-3 gap-3">
            {colorInput('Principal', config.primaryColor, (v) => setCustom({ primaryColor: v }))}
            {colorInput('Secundario', config.secondaryColor, (v) => setCustom({ secondaryColor: v }))}
            {colorInput('Fondo', config.backgroundColor, (v) => setCustom({ backgroundColor: v }))}
          </div>
        </div>
      </Section>

      <Section title="Tipografía" icon={<Type className="h-3.5 w-3.5" />}>
        <div role="radiogroup" aria-label="Tipografía" className="grid grid-cols-2 gap-2">
          {(Object.keys(CARD_FONTS) as CardFontId[]).map((id) => {
            const active = config.font === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ font: id })}
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all ${FOCUS_RING} ${
                  active
                    ? 'border-violet-400/60 bg-violet-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <span className="text-2xl font-extrabold leading-none text-white" style={{ fontFamily: CARD_FONTS[id].family }}>
                  Aa
                </span>
                <span className="text-xs font-semibold text-white/80">{CARD_FONTS[id].label}</span>
                {active && <Check className="ml-auto h-3.5 w-3.5 text-violet-300" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Acabado" icon={<Sparkles className="h-3.5 w-3.5" />}>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <SliderRow label="Brillo del aura" value={config.bloom} min={0} max={1} step={0.05} onChange={(bloom) => update({ bloom })} />
          <SliderRow
            label="Grano de película"
            value={config.grain}
            min={0}
            max={0.4}
            step={0.02}
            onChange={(grain) => update({ grain })}
          />
          <SliderRow label="Viñeta" value={config.vignette} min={0} max={1} step={0.05} onChange={(vignette) => update({ vignette })} />
        </div>
      </Section>
    </div>
  );
};

// ── Editor ──────────────────────────────────────────────────────────────────

export const CardEditor: React.FC<CardEditorProps> = (props) => {
  const [tab, setTab] = useState<EditorTab>('design');
  const resetCardConfig = useRecorderStore((s) => s.resetCardConfig);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pt-5">
        <div role="tablist" aria-label="Secciones del editor" className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`card-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`card-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${FOCUS_RING} ${
                  active
                    ? 'bg-gradient-to-b from-white/[0.2] to-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        // key: cada pestaña es un panel nuevo, así empieza arriba en vez de heredar el desplazamiento de la anterior
        key={tab}
        role="tabpanel"
        id={`card-panel-${tab}`}
        aria-labelledby={`card-tab-${tab}`}
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6"
      >
        {tab === 'design' && <DesignTab {...props} />}
        {tab === 'content' && <ContentTab {...props} />}
        {tab === 'style' && <StyleTab {...props} />}

        <div className="mt-8 border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={resetCardConfig}
            className={`text-xs font-medium text-white/40 underline-offset-4 transition-colors hover:text-white/75 hover:underline ${FOCUS_RING}`}
          >
            Restablecer el diseño
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 bg-zinc-950/60 px-5 py-3 backdrop-blur-xl">
        <CardActions config={props.config} content={props.content} assets={props.assets} />
      </div>
    </div>
  );
};
