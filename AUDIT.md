# AUDITORÍA TÉCNICA — CAPTURE & REC SUITE (Aura3D)

Fecha de auditoría: 2026-09-24  
Estado previo: Dos arquitecturas paralelas independientes y fragmentadas.

---

## 1. Mapeo de Componentes y Dependencias

```mermaid
graph TD
    subgraph Suite A: Direct Studio (playerStore)
        HB[HeaderBar.tsx] --> VRB[VideoRecorderButton.tsx]
        HB --> SCC[StudioCaptureCard.tsx]
        HB --> SC[snapshotCapture.ts]
        SCC --> SC
        SCC --> VRS[videoRecorderService.ts]
        VRB --> VRS
        VRS --> VC[visualizerCanvas.ts]
        VRS --> AE[audioEngine.ts]
        SC --> VC
    end

    subgraph Suite B: Social Content Studio (recorderStore)
        HB -.-> RP[RecorderPanel.tsx]
        RP --> SCS[ScreenCaptureSelector.tsx]
        RP --> RS[ResolutionSelector.tsx]
        RP --> DC[DurationControl.tsx]
        RP --> PP[PreviewPlayer.tsx]
        RP --> EP[ExportPanel.tsx]
        RP --> USR[useScreenRecorder.ts]
        USR --> SR[screenRecorder.ts]
        SR --> VC
        SR --> AE
    end

    subgraph Overlay Compartido
        CFO[CaptureFramingOverlay.tsx]
    end
```

---

## 2. Inventario de Estado Actual

### `playerStore.ts` (Suite A)
- `isCaptureStudioOpen`: boolean
- `captureAspectRatio`: `'16:9' | '9:16' | '1:1' | '4:5'`
- `isFramingGuideActive`: boolean
- `captureQuality`: `'1080p' | '4k'`
- `captureSourceMode`: `'direct_canvas' | 'screen_tab'`

### `recorderStore.ts` (Suite B)
- `isRecorderOpen` / `isModalOpen`: boolean
- `activeTab`: `'record' | 'preview' | 'cards' | 'export'`
- `captureSource`: `'visualizer' | 'screen' | 'window' | 'tab'`
- `aspectRatio`: `'9:16' | '1:1' | '4:5' | '16:9'`
- `resolutionPreset`: `'story' | 'feed' | 'post' | 'shorts' | 'youtube' | 'custom'`
- `fps`: `30 | 60`
- `videoBitrate`: number (def: 8 Mbps)
- `durationMode`: `'manual' | 'song_end' | 'continuous'`
- `durationLimitSec`: number
- `includeAudio`: boolean
- `includeMic`: boolean
- `recordedBlob`: Blob | null
- `recordedUrl`: string | null
- `trimRange`: `{ start: number; end: number }`

---

## 3. Puntos Críticos y Fugas de Memoria Detectadas

1. **Gestión de `URL.createObjectURL`**:
   - `videoRecorderService`: Crea `activeBlobUrl` pero solo se revoca en la siguiente grabación. Si el usuario cierra la aplicación o no vuelve a grabar, el ObjectURL queda retenido.
   - `recorderStore`: Revoca el anterior en `setRecordedVideo`, pero si el modal se desmonta sin resetear, el Blob queda en memoria.
2. **Ciclo de vida de `MediaStream` y `requestAnimationFrame`**:
   - En `videoRecorderService`: El bucle de crop `requestAnimationFrame(drawCanvasFrame)` utiliza una bandera `isCropping`. Si ocurre una excepción dentro del bucle o en `MediaRecorder.start()`, el bucle rAF o los tracks de `getDisplayMedia` pueden quedar huérfanos.
   - En `screenRecorder`: Usa `requestAnimationFrame` continuo contra `intermediateCanvas`.
3. **Competencia GPU / Main Thread**:
   - Durante grabación a 60 FPS con encuadre, redibujar un canvas 4K o 1080p mientras la UI tiene capas con `backdrop-filter: blur(48px)` provoca caídas de frames en el renderizador WebGL subyacente.
4. **Múltiples AudioContexts**:
   - `videoRecorderService` instancia un `new AudioContext()` local para mezclar pistas si hay audio de pestaña + audio interno. Debe liberarse explícitamente (`close()`) en todos los caminos de salida (stop, cancel, error).

---

## 4. Estrategia de Migración hacia la Arquitectura Objetivo

```text
src/capture/
├── controller/
│   └── CaptureController.ts        # Orquestador del ciclo de vida (start, stop, cancel, dispose)
├── store/
│   └── captureStore.ts             # Única fuente de verdad de UI y sesión de captura
├── engines/
│   ├── CaptureEngine.ts            # Interfaz polimórfica común
│   ├── SnapshotEngine.ts           # Captura foto 1080p/4K limpia sin UI
│   ├── CanvasRecordingEngine.ts    # Captura directa WebGL a 60 FPS (sin permisos)
│   └── ScreenRecordingEngine.ts    # Captura vía getDisplayMedia (pantalla/pestaña)
├── audio/
│   └── AudioMixer.ts               # Enrutamiento y mezcla limpia con AudioEngine
├── export/
│   └── CaptureExportService.ts     # Trimming y exportación de archivos MP4 / WebM
└── components/
    ├── CaptureStudio.tsx           # Componente unificado (Foto / Video / Preview & Trim)
    └── CaptureFramingOverlay.tsx   # Guías de encuadre en pantalla vinculadas a captureStore
```
