import type { CaptureEngine } from './CaptureEngine';
import type { CaptureResult, CaptureSession } from '../types';
import { findVisualizerCanvas } from '../../utils/visualizerCanvas';
import { getCaptureDimensions } from '../utils/captureGeometry';
import { drawTrackWatermark } from '../utils/watermark';
import {
  loadActiveWallpaperImage,
  loadActiveCoverImage,
  findAtmosphereCanvas,
  drawSceneComposite,
} from '../utils/compositor';
import { usePlayerStore } from '../../stores/playerStore';

export class SnapshotEngine implements CaptureEngine {
  private activeSession: CaptureSession | null = null;

  public async prepare(session: CaptureSession): Promise<void> {
    this.activeSession = session;
  }

  public async start(): Promise<void> {
    // Snapshot is one-shot, but conforms to lifecycle
  }

  public async capture(session?: CaptureSession): Promise<CaptureResult> {
    const config = session || this.activeSession;
    if (!config) {
      throw new Error('Configuración de sesión no inicializada.');
    }

    const canvas = findVisualizerCanvas();
    if (!canvas) {
      throw new Error('No se detectó un lienzo visualizador activo para capturar.');
    }

    const { width: targetW, height: targetH } = getCaptureDimensions(
      config.aspectRatio,
      config.resolution
    );

    const hiResCanvas = document.createElement('canvas');
    hiResCanvas.width = targetW;
    hiResCanvas.height = targetH;
    const ctx = hiResCanvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('No se pudo obtener el contexto 2D para la foto.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Cargar fondo activo (Wallpaper IA o fondo personalizado) y atmósfera
    const [wallpaperImg, coverImg] = await Promise.all([loadActiveWallpaperImage(), loadActiveCoverImage()]);
    const atmosphereCanvas = findAtmosphereCanvas();
    const isRainbowVoid = canvas.id === 'rainbow-void-canvas';

    // 2. Renderizar escena compuesta multicapa completa (Wallpaper + Atmósfera + Halo + Visualizador)
    drawSceneComposite(ctx, targetW, targetH, {
      wallpaperImg,
      atmosphereCanvas,
      visualizerCanvas: canvas,
      isRainbowVoid,
      coverImg,
    });

    // 3. Tarjeta de canción / Watermark opcional
    if (config.includeWatermark || config.includeSongCard) {
      const currentTrack = usePlayerStore.getState().currentTrack;
      drawTrackWatermark(
        ctx,
        targetW,
        targetH,
        config.aspectRatio,
        currentTrack?.title,
        currentTrack?.artist,
        false
      );
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      hiResCanvas.toBlob(resolve, 'image/png')
    );

    if (!blob) {
      throw new Error('Error al generar la imagen de la captura.');
    }

    const currentTrack = usePlayerStore.getState().currentTrack;
    const cleanTitle = (currentTrack?.title || 'Visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const ratioTag = config.aspectRatio.replace(':', '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `Aura3D_${config.resolution.toUpperCase()}_${ratioTag}_${cleanTitle}_${timestamp}.png`;
    const url = URL.createObjectURL(blob);

    return {
      type: 'photo',
      blob,
      url,
      fileName,
      dimensions: { width: targetW, height: targetH },
      aspectRatio: config.aspectRatio,
      createdAt: Date.now(),
    };
  }

  public async stop(): Promise<CaptureResult> {
    return this.capture();
  }

  public async cancel(): Promise<void> {
    this.activeSession = null;
  }

  public async dispose(): Promise<void> {
    this.activeSession = null;
  }
}
