# AURA3D SPATIAL MODE — Plan Maestro Completo

**Documento único de referencia.** Fusiona la visión de producto, la arquitectura de audio con analyzers separados, y la máquina de estados de gestos (del plan de ChatGPT) con los números reales de presupuesto, las técnicas de síntesis, las trampas de navegador y el testing CI (de mi plan).

---

## ÍNDICE

1. Visión y principio rector
2. Arquitectura general (con analyzers separados)
3. Grafo de audio estricto
4. Máquina de estados de gestos
5. Tracking de manos: números y filtros reales
6. Presupuesto de rendimiento por frame
7. Técnicas de síntesis por instrumento
8. Modos de experiencia
9. Trampas de navegador (Safari, iOS, GPU integrada)
10. Estructura de carpetas
11. Los 10 sprints (checklist diario)
12. Criterios de aceptación numéricos
13. Testing y CI
14. Riesgos y mitigaciones
15. Lo que NO se hace en v1

---

## 1. VISIÓN Y PRINCIPIO RECTOR

**Una frase:**
> El usuario entra a pantalla completa, activa su cámara, sus manos se vuelven controladores espaciales, toca instrumentos virtuales que generan sonido, ese sonido alimenta una capa visual nueva de Aura3D, después manipula objetos 3D con gestos, y todo ocurre mientras la canción original sigue intacta, sin ensuciarse, a 60 fps.

**Principio rector del producto:**
> La canción controla el universo. El instrumento controla una capa encima. Nunca al revés.

Esto no es una decisión técnica menor. Es lo que hace que Aura3D Spatial sea **Aura3D** y no "otro visualizador con webcam". La música manda. Las manos del usuario son un instrumento que dialoga con ella, no que la sustituye.

**Nombre interno:** `SpatialCamera` / `spatial/`
**Nombre para el usuario:** **AURA SPATIAL**

---

## 2. ARQUITECTURA GENERAL

```
                    AURA3D SPATIAL MODE
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       CAMERA          HAND TRACKING      FACE TRACKING
          │                 │                 │
          │           21 landmarks       52 blendshapes
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                    GESTURE ENGINE
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         Touch/Grab    Rotate/Scale   Modulate
              │             │             │
              └─────────────┼─────────────┘
                            │
                  SPATIAL INTERACTION STATE
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         Instruments    3D Objects    Visualizer Layer
              │             │             │
           Piano         Grab/Move       Waves
           Guitar        Rotate          Particles
           Violin        Scale           Shaders
           Theremin                      Shockwaves
              │             │             │
              └─────────────┼─────────────┘
                            │
                      AUDIO ENGINE
                            │
              ┌─────────────┴─────────────┐
              │                           │
        InstrumentBus                 MusicBus
              │                           │
        InstrumentAnalyser            MusicAnalyser
              │                           │
              ▼                           ▼
      Interaction FX Layer           Aura Visualizer Core
      (shockwaves, color,            (ondas principales,
       partículas extra)              partículas, espacio)
              │                           │
              └─────────────┬─────────────┘
                            │
                       MasterGain
                            │
                       Output (48 kHz)
```

**Regla de oro de la arquitectura:**
> MediaPipe NUNCA controla Three.js ni el audio directamente. Siempre pasa por `GestureEngine` → `SpatialInteractionState` → consumidores.

Eso hace que puedas cambiar MediaPipe por otro tracker sin tocar el resto, y que puedas testear la lógica de interacción sin cámara.

---

## 3. GRAFO DE AUDIO ESTRICTO

Este es el diagrama que debe quedar documentado y validado en revisión de PR. Cualquier `connect()` que rompa esta estructura es un bug.

```
┌──────────────────────────────────────────────────────────┐
│             AudioContext (uno solo, global)              │
│             sampleRate: 48000                            │
│             latencyHint: 'interactive'                   │
└──────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         MusicBus      InstrumentBus    FxBus
              │             │             │
              │        ┌────┴────┐    ┌───┴───┐
              │        │         │    │       │
              │      Piano   Guitar  Whoosh  UI
              │        │     Violin  Hit    Sounds
              │        │     Theremin
              │        │         │
              │        └────┬────┘
              │             │
              │      InstrumentAnalyser
              │             │
              ▼             ▼
         MusicAnalyser   Interaction FX
              │             │
              ▼             │
         Visualizer Core    │
              │             │
              └──────┬──────┘
                     │
                MasterGain
                     │
                Brickwall Limiter
                     │
                AnalyserNode (para el visualizador)
                     │
                Destination (output)
```

**Reglas duras:**

1. Solo existe **un** `AudioContext` en toda la aplicación.
2. El módulo `spatial/` **nunca** hace `connect()` a `MusicBus`.
3. El módulo `spatial/` **nunca** hace `decodeAudioData()` de la canción.
4. Si se añade un `ducking` (bajar la música 3 dB cuando el instrumento suena fuerte), se hace con un `GainNode` en `MusicBus.gain` **controlado por envolvente**, nunca con filtros.
5. El `InstrumentBus` tiene su propio `ConvolverNode` (reverb de sala, IR generado proceduralmente, wet 15 % por defecto).
6. El `MasterGain` tiene un `BrickwallLimiter` (`DynamicsCompressorNode` con ratio 20:1, threshold -1 dBFS) para que los picos de instrumentos no clipeen la música.
7. La música **nunca** se resamplea. Si la canción es 44.1 kHz, se reproduce a 44.1 kHz y el `AudioContext` la resamplea internamente con la mejor calidad disponible. No tocamos `playbackRate`.

---

## 4. MÁQUINA DE ESTADOS DE GESTOS

Esto es lo que separa un prototipo que se siente roto de uno que se siente sólido.

### Estados por mano

```
IDLE
  │
  │ (distancia índice-pulgar < 3 cm durante 50 ms)
  ▼
PINCH_START  ────► emite evento "grab-intent"
  │
  │ (mantiene < 5 cm durante 80 ms)
  ▼
PINCH_HOLD   ────► emite evento "grab-confirmed"
  │
  │ (movimiento detectado > 0.5 cm)
  ▼
PINCH_MOVE   ────► emite "drag" cada frame con delta y velocidad
  │
  │ (distancia > 5 cm durante 60 ms)
  ▼
PINCH_END    ────► emite "release" con velocidad final
  │
  ▼
IDLE (con cooldown de 200 ms para evitar re-trigger)
```

**Histéresis obligatoria:**
- Entrar en pinch: < 3 cm
- Mantener pinch: < 5 cm
- Salir: > 5 cm

Sin esa separación vas a tener objetos que se agarran y sueltan 30 veces por segundo.

### Estados por gesto facial

Los gestos faciales **no son discretos**. Son moduladores continuos. Nunca "sonríe para X". Siempre "sonríe para modular X".

| Blendshape | Parámetro modulado | Rango |
|---|---|---|
| `browInnerUp` | Intensidad del bloom | 0.4 → 1.4 |
| `jawOpen` | Ancho del campo estéreo | 0.8 → 1.6 |
| `mouthSmileLeft + right` | Temperatura del color (violeta → rosa) | hue 260 → 320 |
| `eyeBlinkLeft + right` | Flash de fondo | 0 → 0.3 |
| `cheekPuff` | Distorsión del suelo | 0 → 0.15 |

Filtrados con One-Euro, con `minCutoff = 0.8 Hz` (más suave que las manos, porque la cara se mueve más lento y tiembla más).

---

## 5. TRACKING DE MANOS: NÚMEROS Y FILTROS REALES

### Modelo

- `MediaPipe HandLandmarker` en modo `VIDEO`, `numHands: 2`, delegado GPU.
- Modelo: `hand_landmarker.task` (precisión, no lite).
- Corre en un `Worker` separado del hilo principal.
- Resolución de entrada: 640×480 por defecto, 480×360 en modo LOW.
- FPS objetivo: 30. Nunca pedir 60 al tracker — la cámara no los da y el coste se multiplica.

### Filtro One-Euro (parámetros reales)

```
minCutoff = 1.0 Hz    ← suaviza temblor en reposo
beta      = 0.007     ← reduce lag cuando hay movimiento rápido
dCutoff   = 1.0 Hz
```

Ajustar con usuario real en fase de calibración. Estos son los valores de partida que funcionan en el 90 % de casos.

### Proyección 2D → 3D

- Distancia focal virtual: `f = 2.8 m` (coherente con `CameraStudioPanel`).
- El origen del mundo está en el centro del frustum de la cámara virtual.
- Reutilizar `projectLandmarkToWorld()` — no reescribirlo.

### Métricas a instrumentar desde el día 1

| Métrica | Objetivo | Cómo medir |
|---|---|---|
| Latencia gesto→evento | < 40 ms p95 | `performance.now()` en pipeline |
| Jitter en reposo | < 2 mm mundo | Desviación estándar de una yema quieta |
| Falsos positivos | < 1 % de hits | Hits sin intención del usuario |
| Falsos negativos | < 5 % de hits esperados | Hits que el usuario esperaba y no ocurrieron |
| FPS del tracker | > 25 fps | `requestAnimationFrame` del worker |

Si en algún momento el tracker cae por debajo de 20 fps durante más de 2 s, se degrada automáticamente la resolución de entrada de 640×480 a 480×360.

---

## 6. PRESUPUESTO DE RENDIMIENTO POR FRAME

**Objetivo:** 60 fps estables en gama media. 30 fps estables en gama baja.

| Componente | Presupuesto | Técnica |
|---|---|---|
| MediaPipe Hands | 4 ms | Worker + GPU delegate |
| MediaPipe Face | 2 ms | Worker, 15 fps (1 de cada 2 frames) |
| Filtrado One-Euro | 0.5 ms | Solo 21 + 52 puntos, trivial |
| Lógica de interacción | 1 ms | Sin allocations en el hot path |
| Three.js render | 6 ms | InstancedMesh, LOD, frustum culling |
| Post-FX (bloom, DOF) | 2 ms | Half-res bloom, DOF apagado en LOW |
| UI overlay | 1 ms | DOM mínimo, sin re-render por frame |
| **Total** | **16.5 ms** | Margen de 0.1 ms |

### Frecuencias separadas por sistema

```
CAMERA            30 FPS
HAND TRACKING     30 FPS
FACE TRACKING     15 FPS
GESTURE ENGINE    30 FPS
THREE.JS          60 FPS
AUDIO             48 kHz
UI                30 FPS aprox
```

La cámara no necesita 60 fps para que la experiencia se sienta bien. La cara menos.

### Perfiles adaptativos

`PerformanceManager` decide el perfil al arrancar y puede bajarlo dinámicamente:

| Perfil | FPS target | Manos | Partículas | Post-FX |
|---|---|---|---|---|
| **LOW** | 30 | 1 | 500 | Sin DOF, bloom simple |
| **MEDIUM** | 60 | 2 | 2000 | Bloom half-res, DOF off |
| **HIGH** | 60 | 2 | 5000 | Bloom + DOF + chromatic aberration |

Si `frameTime > 20 ms` durante 2 s → bajar un nivel. Si `frameTime < 12 ms` durante 5 s → subir un nivel (con histéresis para no oscilar).

### Regla anti-React

```
❌ NUNCA:  MediaPipe → React state → React render → Three.js
✅ SIEMPRE: MediaPipe → SpatialState (objeto mutable) → Three.js render loop
```

React solo recibe cambios de estado importantes:
- `cameraActive`
- `gestureMode`
- `selectedInstrument`
- `selectedObject`
- `performanceTier`

**Nunca** `fingerX`, `fingerY`, `fingerZ`. Eso vive en el `SpatialState` mutable y Three.js lo lee directamente en su rAF.

---

## 7. TÉCNICAS DE SÍNTESIS POR INSTRUMENTO

Sin samples. Síntesis pura. Razones: peso, latencia, licencia, y expresividad.

### Piano espacial

```
OscillatorNode (Sawtooth) ──┐
                            ├──► BiquadFilterNode (LPF) ──► GainNode (ADSR) ──► InstrumentBus
OscillatorNode (Sine, +12) ─┘       cutoff con envelope
```

- ADSR: attack 5 ms, decay 180 ms, sustain 0.6, release 400 ms
- Detune entre los dos osciladores: +4 cents
- Envelope del filtro: cutoff de 4000 Hz en el attack, baja a 1200 Hz en el decay

### Guitarra espacial

**Karplus-Strong** ligero en `AudioWorklet`:

```
[ruido blanco de 20 ms] ──► línea de delay (frecuencia = 1/nota) ──► filtro promedio ──► feedback 0.96
```

- Delay line inicializada con ruido blanco de 20 ms (el "punteo")
- Filtro de promedio de 2 puntos en el feedback
- La frecuencia del delay define la nota (longitud = sampleRate / freq)
- Cuerpo de cuerda real sin samples, 40 líneas de código

### Violín espacial

```
OscillatorNode (Sawtooth) ──┐
                            ├──► WaveShaperNode ──► BiquadFilterNode ──► GainNode ──► InstrumentBus
OscillatorNode (Sawtooth) ──┘       (saturación)    LFO lento en cutoff
        detune +7 cents                             (vibrato)
```

- Dos osciladores detuneados +7 cents
- `WaveShaperNode` con curva de saturación suave (`tanh`)
- LFO de 5 Hz modulando el cutoff del LPF (±300 Hz) para vibrato natural
- ADSR: attack 80 ms, decay 200 ms, sustain 0.8, release 600 ms

### Theremin espacial

```
Mano izquierda ──► pitch  (Y del mundo → 200 Hz a 1200 Hz, escala log)
Mano derecha   ──► volume (Y del mundo → 0.0 a 0.8)
              ──► vibrato (X del mundo → 0 a 8 Hz)
```

- Oscilador Sine puro, sin filtro
- Reverb wet más alto (40 %) porque el theremin vive en la reverberación
- Sin ADSR, el volumen es continuo, no hay ataque

### Reverb de sala

`ConvolverNode` con IR generado proceduralmente (no cargar archivos):

```
IR = [ruido blanco con decay exponencial, 1.8 s, estéreo]
```

Se genera una vez al arrancar el `AudioContext` y se reutiliza. Ahorra 500 KB de descarga.

---

## 8. MODOS DE EXPERIENCIA

No forzar al usuario a hacer todo a la vez. Modos separados, seleccionables desde el HUD.

```
AURA SPATIAL
│
├── [ INSTRUMENT ]   → tocar piano / guitarra / violín / theremin
├── [ OBJECT LAB ]   → agarrar, rotar, trasladar objetos 3D
├── [ VISUALIZER ]   → las manos modulan el universo visual
└── [ FREE MODE ]    → todo junto (para usuarios avanzados)
```

**Modo por defecto:** INSTRUMENT (es el más intuitivo y el más "wow").

**Transición entre modos:** fade de 400 ms del HUD, los instrumentos/objetos del modo anterior se desvanecen, los del nuevo aparecen con el stagger de 600 ms.

**Modo Zen (tecla G):** oculta todo el HUD. Solo queda la escena. G o Esc lo recuperan.

---

## 9. TRAMPAS DE NAVEGADOR

Estas son las que te van a hacer perder 2 días en debugging. Documéntalas antes de tocar código.

| Trampa | Dónde | Solución |
|---|---|---|
| `requestFullscreen` no funciona en todos los elementos | Safari iOS | Fallback a `position:fixed; inset:0; z-index:9999` con `viewport-fit=cover` |
| `AudioContext` arranca en `suspended` | Safari desktop y móvil | Pantalla "Toca para comenzar" que hace `ctx.resume()` |
| MediaPipe cae a 15 fps en GPU integrada | Laptops gama baja | Degradar input a 480p si FPS < 20 durante 2 s |
| La pantalla se apaga durante la experiencia | Móvil | `Wake Lock API` (`navigator.wakeLock.request('screen')`) |
| El usuario pierde la cámara al cambiar de pestaña | Todos | `document.visibilitychange` → pausar rAF y tracker |
| El micrófono de la webcam se activa por error | Todos | `getUserMedia({ video: true, audio: false })` siempre |
| El tracker devuelve landmarks con `z` poco fiables | Todos | Usar `z` solo como relativo, nunca como absoluto |
| En Firefox, `OffscreenCanvas` en Worker falla | Firefox < 105 | Detectar y caer a render en main thread |
| El heap crece sin parar tras 30 min | Todos | Sin `new` en el hot path, object pooling para partículas y shockwaves |

---

## 10. ESTRUCTURA DE CARPETAS

```
src/
├── spatial/
│   ├── camera/
│   │   ├── SpatialCamera.ts              ← gestión de getUserMedia + fullscreen
│   │   ├── FullscreenController.ts       ← requestFullscreen + fallback iOS
│   │   └── WakeLockController.ts         ← mantener pantalla encendida
│   │
│   ├── tracking/
│   │   ├── HandTracker.ts                ← wrapper MediaPipe HandLandmarker
│   │   ├── FaceTracker.ts                ← wrapper MediaPipe FaceLandmarker
│   │   ├── PoseTracker.ts                ← wrapper MediaPipe PoseLandmarker
│   │   └── OneEuroFilter3D.ts            ← filtro reutilizable
│   │
│   ├── gestures/
│   │   ├── GestureEngine.ts              ← orquesta todos los gestos
│   │   ├── HandGestureState.ts           ← máquina de estados PINCH_*
│   │   ├── FaceGestureRouter.ts          ← blendshapes → parámetros de escena
│   │   └── gestures/
│   │       ├── PinchGesture.ts
│   │       ├── GrabGesture.ts
│   │       ├── TouchGesture.ts
│   │       └── PointGesture.ts
│   │
│   ├── interaction/
│   │   ├── SpatialInteractionManager.ts  ← coordinador principal
│   │   ├── ObjectGrabController.ts
│   │   ├── ObjectTransformController.ts
│   │   └── SpatialState.ts               ← objeto mutable, NO React state
│   │
│   ├── instruments/
│   │   ├── InstrumentManager.ts          ← selección activa, polifonía
│   │   ├── InstrumentBase.ts             ← clase abstracta: layout, colliders
│   │   ├── PianoInstrument.ts
│   │   ├── GuitarInstrument.ts
│   │   ├── ViolinInstrument.ts
│   │   ├── ThereminInstrument.ts
│   │   └── shaders/
│   │       ├── liquidGlass.vert/.frag
│   │       ├── stringRibbon.vert/.frag
│   │       └── shockwave.vert/.frag
│   │
│   ├── audio/
│   │   ├── SpatialAudioEngine.ts         ← orquesta buses
│   │   ├── InstrumentBus.ts              ← bus con reverb propio
│   │   ├── MusicBus.ts                   ← bus de la canción original
│   │   ├── FxBus.ts                      ← whooshes, impactos, UI sounds
│   │   ├── MusicAnalyser.ts              ← analiza la canción → visualizer
│   │   ├── InstrumentAnalyser.ts         ← analiza instrumentos → interaction FX
│   │   ├── synthesis/
│   │   │   ├── PianoVoice.ts
│   │   │   ├── GuitarVoice.ts            ← Karplus-Strong en AudioWorklet
│   │   │   ├── ViolinVoice.ts
│   │   │   └── ThereminVoice.ts
│   │   └── RoomReverb.ts                 ← IR procedural
│   │
│   ├── performance/
│   │   ├── PerformanceManager.ts         ← decide tier LOW/MEDIUM/HIGH
│   │   └── QualityController.ts          ← adapta DPR, partículas, post-FX
│   │
│   ├── ui/
│   │   ├── SpatialHUD.tsx                ← overlay, zen ghost, hints
│   │   ├── InstrumentSelector.tsx
│   │   ├── ModeSelector.tsx              ← INSTRUMENT / OBJECT LAB / etc
│   │   ├── CalibrationFlow.tsx           ← 3 pasos de onboarding
│   │   └── SpatialMode.tsx               ← contenedor raíz
│   │
│   ├── ImmersiveProvider.tsx             ← context: estado global del módulo
│   └── types.ts                          ← interfaces compartidas
│
└── (resto de Aura3D sin tocar)
```

No necesitas crear todo ahora. Es la arquitectura objetivo. Los sprints van poblando esta estructura.

---

## 11. LOS 10 SPRINTS

Cada sprint debe terminar con un resultado observable. No "implementé X", sino "puedo hacer Y".

### Sprint 1 — Entrar y ver
```
Fullscreen Spatial Mode
+ Camera permission
+ reutilizar hand tracking existente
+ botón de salida claro (Esc)
```
**Resultado:** *Puedo entrar a pantalla completa, activo la cámara, y veo mis manos dibujadas como esqueleto.*

**Criterio de aceptación:** funciona en Chrome desktop y Safari iOS (con fallback). La pantalla no se apaga en 30 min.

### Sprint 2 — Señalar
```
Finger cursor
+ 3D ray/projection
+ interaction zones visuales
```
**Resultado:** *Puedo señalar objetos 3D y ver un cursor/rayo que sale de mi dedo índice.*

**Criterio de aceptación:** latencia del cursor < 40 ms p95. Sin jitter perceptible en reposo.

### Sprint 3 — Tocar
```
Touch interaction
+ hover state
+ selection feedback
```
**Resultado:** *Puedo tocar objetos virtuales y ver cómo reaccionan (cambio de color, shockwave pequeño).*

**Criterio de aceptación:** falsos positivos < 1 % en 5 min de uso.

### Sprint 4 — Agarrar
```
Grab (máquina de estados PINCH_*)
+ Move
+ Release con inercia
```
**Resultado:** *Puedo agarrar un cubo, moverlo por el espacio, y soltarlo con inercia natural.*

**Criterio de aceptación:** 20 ciclos agarrar/soltar sin falsos positivos. Inercia con damping 0.92 se siente natural (test 5 usuarios, media ≥ 4/5).

### Sprint 5 — Rotar
```
Rotation (quaternion slerp con orientación de palma)
+ Two-hand interaction (pinch con dos manos para escalar)
```
**Resultado:** *Puedo rotar objetos girando la muñeca, y escalarlos con dos manos.*

### Sprint 6 — Audio Engine + Piano
```
AudioContext único con buses separados
+ PianoInstrument con síntesis ADSR
+ Pantalla "Toca para comenzar" (Safari fix)
```
**Resultado:** *Puedo tocar un piano espacial con las yemas de mis dedos y escuchar las notas.*

**Criterio de aceptación:** latencia gesto→sonido < 40 ms p95. 5 notas simultáneas sin clip.

### Sprint 7 — Audio → Visualizer
```
InstrumentAnalyser
+ Interaction FX layer (shockwaves, color, partículas extra)
+ MusicAnalyser separado
```
**Resultado:** *Cada nota genera una onda visual que se suma a la del universo, sin sustituirla.*

**Criterio de aceptación:** el visualizador principal (música) es indistinguible con y sin instrumentos activos. Test A/B ciego con 5 usuarios.

### Sprint 8 — Aislamiento estricto de audio
```
MusicBus / InstrumentBus separados
+ Test CI que compara señal
+ Lint rule: prohibido connect() a MusicBus desde spatial/
```
**Resultado:** *La canción sigue intacta con el módulo inmersivo activo.*

**Criterio de aceptación:** test CI pasa. Diferencia RMS < 0.5 dB, correlación > 0.99.

### Sprint 9 — Guitarra, Violín, Theremin
```
Karplus-Strong en AudioWorklet
+ ViolinVoice con waveshaper y vibrato
+ ThereminVoice con control continuo
```
**Resultado:** *Puedo cambiar entre 4 instrumentos y tocar cada uno con gestos propios.*

### Sprint 10 — Performance y rollout
```
PerformanceManager con tiers LOW/MEDIUM/HIGH
+ adaptive quality
+ fallback para móvil y gama baja
+ feature flag para rollout progresivo
```
**Resultado:** *La experiencia corre a 60 fps en gama media, 30 fps en gama baja, sin leaks tras 30 min.*

---

## 12. CRITERIOS DE ACEPTACIÓN NUMÉRICOS

Estos son los números que definen "terminado". Sin ellos, una fase puede quedar "casi lista" para siempre.

| Área | Métrica | Objetivo |
|---|---|---|
| Latencia gesto→sonido | p95 | < 40 ms |
| Latencia gesto→cursor | p95 | < 40 ms |
| Jitter en reposo | desviación estándar | < 2 mm |
| Falsos positivos de gesto | % de hits | < 1 % |
| Falsos negativos de gesto | % de hits esperados | < 5 % |
| FPS del render | media en gama media | ≥ 58 fps |
| FPS del render | mínimo en gama baja | ≥ 28 fps |
| FPS del tracker | media | ≥ 25 fps |
| Aislamiento de audio | diferencia RMS | < 0.5 dB |
| Aislamiento de audio | correlación | > 0.99 |
| Uso de memoria | heap tras 30 min | estable (± 5 %) |
| Uso de GPU | draw calls | < 40 |
| Tiempo de arranque | de click a escena visible | < 3 s |

---

## 13. TESTING Y CI

### Tests automáticos obligatorios

**1. Test de aislamiento de audio (Sprint 8)**
- Reproduce un WAV de referencia por `MusicBus`.
- Graba la salida del `MasterGain` con un `MediaStreamDestination`.
- Compara con y sin módulo inmersivo activo.
- Falla si RMS diff > 0.5 dB o correlación < 0.99.

**2. Test de rendimiento (Playwright)**
- Chrome headless, viewport 1920×1080.
- Ejecuta 60 s de interacción scripted (movimientos de mano simulados).
- Mide FPS medio y p95 de frameTime.
- Falla si FPS medio < 55 o p95 > 22 ms.

**3. Test de memoria (Playwright)**
- Heap snapshot antes y después de 100 ciclos abrir/cerrar Spatial Mode.
- Falla si el heap crece > 20 %.

**4. Lint rule custom**
- Cualquier `connect()` a `MusicBus` desde `src/spatial/**` dispara error.
- Cualquier `new AudioContext()` fuera de `SpatialAudioEngine` dispara error.
- Cualquier `new` dentro del hot path del render loop dispara warning.

### Testing manual (checklist obligatorio antes de cada release)

- [ ] Chrome, Edge, Firefox, Safari (desktop y móvil).
- [ ] Con 0, 1, 2 manos en el frame.
- [ ] Con cara visible y oculta.
- [ ] Con luz tenue, luz fuerte, contraluz.
- [ ] Con fondo limpio y con fondo con movimiento.
- [ ] Con música reproduciéndose y sin música.
- [ ] 30 min seguidos sin crash ni leak.
- [ ] Salir con Esc desde cualquier estado.
- [ ] Cambiar de pestaña y volver: el tracker se reanuda.
- [ ] Sin permiso de cámara: la app sigue funcionando sin el módulo.

---

## 14. RIESGOS Y MITIGACIONES

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| MediaPipe cae a < 20 fps en gama baja | Alta | Alto | Degradar input a 480p, luego apagar face tracking |
| El usuario siente latencia al tocar | Media | Alto | AudioWorklet + `latencyHint: interactive` + buffer 128 |
| La música se ensucia | Baja | Muy alto | Bus separado + test CI obligatorio + lint rule |
| Gestos faciales disparan por error | Alta | Medio | Solo modulaciones continuas, nunca acciones discretas |
| Safari iOS no soporta fullscreen | Media | Alto | Fallback a `position:fixed` + `viewport-fit=cover` |
| El `AudioContext` queda `suspended` | Alta | Alto | Pantalla "Toca para comenzar" con `ctx.resume()` |
| Drift del tracking tras 10 min | Media | Medio | Recalibración automática silenciosa cada 5 min |
| Sobrecalentamiento del dispositivo | Media | Medio | Pausa activa sugerida cada 15 min |
| El heap crece sin parar | Alta | Medio | Object pooling, sin `new` en hot path |
| El usuario pierde las manos y no sabe qué hacer | Media | Medio | Hint automático tras 3 s sin detección |

---

## 15. LO QUE NO SE HACE EN V1

Documentar esto explícitamente es tan importante como documentar lo que sí se hace. Cada uno de estos es tentador y cada uno multiplica la complejidad por 2–5.

1. **No WebXR.** Soporte irregular, añade una capa entera de abstracción. La webcam + MediaPipe cubre el 95 % de dispositivos. WebXR es v3.
2. **No física real (Ammo.js, Rapier).** Inercia simple + colisión con un plano es suficiente. Física real cuesta 3–5 ms por frame.
3. **No multijugador.** Aunque es tentador (dos personas tocando juntas), añade sincronización, servidor, y multiplica la complejidad por 5. v2.
4. **No samples de audio.** Síntesis pura. Los samples traen peso, latencia de decode, licencias, y no se sienten vivos.
5. **No reconocimiento de instrumentos reales.** El usuario quiere tocar el aire, no su guitarra física. Eso es otro producto.
6. **No machine learning para clasificar gestos.** Reglas geométricas + máquina de estados son suficientes y 100× más rápidas.
7. **No grabación de video en v1.** Aunque `StudioCaptureCard` lo tiene, integrarlo con Spatial Mode añade complejidad. v2.
8. **No exportar composiciones.** El usuario toca en vivo, no guarda. v2.

---

## CHECKLIST PRE-ARRANQUE

Antes de escribir la primera línea de código:

- [ ] Auditoría de `spatialVisionService`, `AirInstruments3D`, `CameraStudioPanel` completada.
- [ ] Feature flag `AURA_SPATIAL_V2` creada y probada.
- [ ] Interfaces TypeScript definidas y revisadas (`types.ts`).
- [ ] Diagrama del grafo de audio aprobado y commiteado a `/docs/audio-graph.md`.
- [ ] Presupuesto de frame documentado y aceptado.
- [ ] 3 usuarios de prueba agendados para validar Sprint 2 y Sprint 4.
- [ ] Archivo WAV de referencia para el test de aislamiento.
- [ ] Test de aislamiento escrito **antes** de escribir el `SpatialAudioEngine` (TDD).

---

## ORDEN DE EJECUCIÓN (Gantt resumido)

```
Semana 1:    Sprint 1 (fullscreen + cámara + tracking existente)
Semana 2:    Sprint 2 (finger cursor + raycasting)
Semana 3:    Sprint 3 (touch + hover)
Semana 4:    Sprint 4 (grab + move + release)
Semana 5:    Sprint 5 (rotate + two-hand)
Semana 6:    Sprint 6 (audio engine + piano)
Semana 7:    Sprint 7 (audio → visualizer)
Semana 8:    Sprint 8 (aislamiento estricto + CI)
Semana 9:    Sprint 9 (guitarra, violín, theremin)
Semana 10:   Sprint 10 (performance + rollout progresivo)
```

**Total realista:** 10 semanas con 1 dev senior full-time, o 5–6 semanas con 2 devs (uno en audio + tracking, otro en render + UX).

---

## LO QUE GANA ESTE PLAN FRENTE A LOS DOS ANTERIORES

**Del plan de ChatGPT:**
- Visión de producto clara (la canción controla el universo, el instrumento controla una capa encima).
- Separación de analyzers (Music vs Instrument) como eje arquitectónico.
- Máquina de estados de gestos con histéresis.
- Modos de experiencia (INSTRUMENT / OBJECT LAB / VISUALIZER / FREE).
- Los 10 sprints orientados a resultado observable.
- Advertencia explícita sobre React en el hot path.

**De mi plan:**
- Números reales de presupuesto por frame.
- Parámetros del filtro One-Euro.
- Técnicas de síntesis por instrumento (Karplus-Strong, waveshaper, IR procedural).
- Trampas de navegador específicas (Safari, iOS, GPU integrada).
- Criterios de aceptación numéricos.
- Testing CI obligatorio.
- Lint rules anti-regresión.

**Sinergia nueva:**
- Los sprints ahora tienen criterios de aceptación numéricos.
- El grafo de audio ahora incluye los analyzers separados.
- Los modos ahora están integrados con el flujo de calibración.
- El checklist pre-arranque cubre tanto producto como técnica.

Este es el documento que le daría a un agente de código o a un dev nuevo para que arranque sin ambigüedad.




