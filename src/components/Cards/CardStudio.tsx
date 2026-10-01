import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../stores/playerStore';
import { useRecorderStore } from '../../store/recorderStore';
import { resolveCardContent } from '../../services/storyCard/config';
import { CardPreview } from './CardCanvas';
import { CardEditor } from './CardEditor';
import { useCardAssets, useCardFonts } from './useCardAssets';

/**
 * Pestaña «Tarjetas» del estudio: vista previa en vivo a la izquierda y editor a la derecha.
 * La vista previa y la exportación comparten el renderizador, así que lo que se ve es lo que sale.
 */
export const CardStudio: React.FC = () => {
  const config = useRecorderStore((s) => s.cardConfig);

  const track = usePlayerStore(
    useShallow((s) => ({
      title: s.currentTrack?.title,
      artist: s.currentTrack?.artist,
      coverUrl: s.currentTrack?.coverUrl,
      bpm: s.currentTrack?.bpm,
      camelotKey: s.currentTrack?.camelotKey,
    }))
  );
  // Redondeado: el medidor de BPM cambia de decimales a cada pulso y no debe redibujar la tarjeta
  const liveBpm = usePlayerStore((s) => Math.round(s.bpm || 0));

  const content = useMemo(
    () => resolveCardContent(config, track.title ? track : null, liveBpm),
    [config, track, liveBpm]
  );

  const { assets, capture, capturedAt, coverState } = useCardAssets(config, content);
  const fontsVersion = useCardFonts(config.font);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="lg:sticky lg:top-0 lg:col-span-5">
        <CardPreview
          config={config}
          content={content}
          assets={assets}
          fontsVersion={fontsVersion}
          onCapture={capture}
          capturedAt={capturedAt}
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] lg:col-span-7 lg:h-[min(700px,calc(94vh-190px))]">
        <CardEditor config={config} content={content} assets={assets} fontsVersion={fontsVersion} coverState={coverState} />
      </div>
    </div>
  );
};

export default CardStudio;
