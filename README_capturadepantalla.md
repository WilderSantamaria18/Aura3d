# Plan maestro — Reintegración del Capture Studio de Aura3D

## 0. Objetivo general

Transformar el sistema actual, que tiene dos suites paralelas:

* `playerStore` → `StudioCaptureCard` → `snapshotCapture` / `videoRecorderService`
* `recorderStore` → `RecorderPanel` → `screenRecorder` / `useScreenRecorder`

en una arquitectura única:

```text
                         HeaderBar
                             │
                             ▼
                    Capture Studio
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
            PHOTO           VIDEO         PREVIEW
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                       captureStore
                             │
                             ▼
                    CaptureController
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
       SnapshotEngine   CanvasEngine    ScreenEngine
             │               │                │
             └───────────────┼────────────────┘
                             ▼
                         AudioMixer
                             │
                             ▼
                       CaptureResult
                             │
                  ┌──────────┼──────────┐
                  ▼          ▼          ▼
               Preview      Trim       Export
```

---

## 6 Bloques Concretos y Ejecutables

Para trabajar de manera efectiva, ágil y sin sobrecargas temporales ni riesgo de romper el visualizador 3D, consolidamos las 31 fases en **6 bloques de trabajo prácticos e incrementales**:

### Bloque 1: Auditoría Técnica y Estado Base
- Consolidar la arquitectura actual en `AUDIT.md`.
- Mapear dependencias, ciclos de vida de streams y `MediaRecorder`.
- Establecer baseline de rendimiento (FPS WebGL, JS heap, Object URLs).

### Bloque 2: Capa Central de Estado y Control (`captureStore` + `CaptureController`)
- Crear `src/capture/store/captureStore.ts` con la interfaz unificada `CaptureSession`.
- Crear `src/capture/controller/CaptureController.ts` para gestión de ciclo de vida (start, stop, cancel, dispose).
- Limpieza estricta de `MediaStream`, `AudioContext` y `URL.revokeObjectURL`.

### Bloque 3: Motores de Captura Unificados (`SnapshotEngine`, `CanvasRecordingEngine`, `ScreenRecordingEngine`)
- Interfaz común `CaptureEngine`.
- Migración y adaptación limpia de `snapshotCapture.ts` → `SnapshotEngine.ts`.
- Migración de `videoRecorderService.ts` → `CanvasRecordingEngine.ts` (direct canvas WebGL 60 FPS sin permisos).
- Migración de `screenRecorder.ts` → `ScreenRecordingEngine.ts` (pantalla/pestaña con `requestVideoFrameCallback`/rAF).
- Unificación del mezclador de audio (`AudioMixer.ts`) conectado a `AudioEngine`.

### Bloque 4: Componente Consolidado `CaptureStudio.tsx`
- Componente maestro en `src/capture/components/CaptureStudio.tsx`:
  - Modo **Foto** (1080p / 4K, encuadres 16:9, 9:16, 1:1, 4:5, watermark opcional).
  - Modo **Video** (presets TikTok 15s, Story 30s, Clip 16:9, REC libre, selector de fuente).
  - Modo **Preview & Trim** (reproductor con rango de recorte y panel de exportación).
- Sincronización directa con `CaptureFramingOverlay.tsx` (bandas de encuadre en pantalla).
- Liquid Glass adaptativo: reducción de blur durante grabación activa para optimizar GPU.

### Bloque 5: Integración en `HeaderBar.tsx` y `App.tsx`
- Sustituir los 3 botones dispersos de `HeaderBar.tsx` (botón REC + cámara + botón estudio) por un único botón elegante `[ Capture Studio ]`.
- Reemplazar modales antiguos en `App.tsx` por el nuevo `CaptureStudio` con carga diferida (`Suspense`/`lazy`).
- Verificar que el visualizador 3D (WebGL / Shaders) no sufra caídas de rendimiento ni repaints innecesarios.

### Bloque 6: Limpieza de Código Legacy y Verificación Final
- Retirar progresivamente estados huérfanos de `playerStore` y componentes deprecados sin romper dependencias externas.
- Pruebas funcionales de ciclo de vida (abrir, cerrar, grabar, cancelar, recortar, exportar).
- Verificación en Chrome / Edge y compatibilidad Safari/móvil.
