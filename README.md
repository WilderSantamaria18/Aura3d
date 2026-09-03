# 🌌 Aura3D — 3D Music Visualizer & Studio Audio Player

<div align="center">

![Aura3D Hero](https://img.shields.io/badge/AURA3D-STUDIO%20PLAYER-00f2fe?style=for-the-badge&logo=three.js&logoColor=black)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Web Audio API](https://img.shields.io/badge/Web%20Audio%20DSP-FF088A?style=for-the-badge)

**Aura3D** es una estación de reproducción de audio y visualizador de música 3D de última generación construida con **React 19**, **Three.js**, **Web Audio API (Biquad DSP)** y **MediaPipe VR**. Transforma cualquier fuente de sonido en una experiencia sensorial inmersiva con física reactiva, control gestual por cámara web y ecualización de estudio.

[Características](#-características-principales) • [Modos de Visualización](#-modos-de-visualización) • [Control Gestual VR](#-control-gestual-vr-mediapipe) • [Ecualizador Studio](#-master-equalizer-studio-pro) • [Instalación](#-instalación-y-ejecución)

</div>

---

## ✨ Características Principales

- 🪐 **Visualizadores 3D en Tiempo Real**: Geometrías tridimensionales y de partículas reactivas al espectro FFT (Esfera, Anillos Orbitales, Picos de Frecuencia, Nube Cuántica, Toroide y Ondas de Terreno).
- 🌈 **Modo Rainbow Void**: Núcleo reactivo con física de bombeo subgrave (*Subwoofer Pump: de pequeño a grande*), halo líquido morphing orgánico y detección automática de carátulas con disco de vinilo rotatorio y resplandor difuminado (*Bloom & Blur*).
- 🖐️ **Control Gestual VR con MediaPipe**: Reconocimiento de manos en tiempo real sin hardware especial. Controla la rotación 3D, cambia colores y activa pantalla completa con gestos naturales de tus dedos.
- 🎚️ **Master Equalizer Studio Pro**: Ecualizador gráfico de 10 bandas con filtros Biquad, visualización de curva de respuesta en frecuencia (Spline Bézier en tiempo real), 12 presets de estudio profesionales y modo de comparación A/B (*Bypass*).
- 💥 **Física Visceral de Bajos ("Bass Boom")**: Algoritmo de detección de transitorios de baja frecuencia (20Hz - 150Hz), rebote dinámico de cámara (*Camera Kick*), ondas de choque expansivas múltiples y ataque con latencia cero.
- ✨ **Sistema Lúcido Neón**: 10 temas cibernéticos luminiscentes de alto contraste con personalización integral en toda la interfaz.
- 🎤 **Karaoke y Letras Sincronizadas (LRC)**: Motor de letras con desplazamiento automático, resaltado rítmico y modo pantalla completa.
- 🎵 **Fuentes Universales de Audio**:
  - Archivos locales (MP3, WAV, FLAC, OGG, MP4) con soporte *Drag & Drop*.
  - Captura directa de audio del sistema o pestañas del navegador (YouTube, Spotify Web) con extracción automática de título y artista.
  - Micrófono en vivo para conciertos, instrumentos o eventos.
  - Integración e incrustación de Spotify y YouTube.
- 📱 **Interfaz 100% Responsiva**: Diseño optimizado para móviles, tablets y escritorios, con pestaña lateral flotante para el Mini Player.

---

## 🎨 Modos de Visualización

| Modo | Descripción |
|---|---|
| **🪐 Esfera 3D (`SphereVisualizer`)** | Nube de 12.000 partículas en Three.js con ondulación armónica en tiempo real, deformación por frecuencias y retroceso dinámico de cámara en cada golpe de bajo. Incluye 6 formas seleccionables. |
| **🌈 Rainbow Void (`RainbowBlobVisualizer`)** | Núcleo central líquido con física de subwoofer. Cuando detecta carátula de audio, proyecta un disco de vinilo rotatorio con un halo difuminado (*Bloom*) ambiental detrás. Incluye editor de filtros y recorte de logos. |
| **🎉 Estudio 3D / Modo Fiesta (`PartyVisualizer`)** | Escenario virtual 3D con altavoces y subwoofers que rebotan físicamente con la música, iluminación estroboscópica y ondas holográficas de suelo. |

---

## 🖐️ Control Gestual VR (MediaPipe)

Activa el botón **`VR ON`** para controlar el visualizador con tu cámara web:

```
    ✊ PUÑO CERRADO        ☝️ SIGNO DE "1"         🖐️ MANO ABIERTA        👌 PELLIZCO
  [ Cambiar Paleta ]    [ Pantalla Completa ]    [ Rotación 3D Libre ]   [ Zoom de Radio ]
```

- **Filtro de Media Móvil**: Suavizado de 5 fotogramas para eliminar temblores.
- **Zona Muerta Central (*Deadzone*)**: Evita rotaciones involuntarias al descansar la mano.
- **HUD Cyberpunk**: Notificaciones toast y badges flotantes en vivo con el estado del gesto.

---

## 🎛️ Master Equalizer Studio Pro

Procesamiento de audio profesional con 10 filtros `BiquadFilterNode`:

- **Bandas**: `32Hz` (SUB), `64Hz` (SUB), `125Hz` (BASS), `250Hz` (BASS), `500Hz` (MID), `1kHz` (MID), `2kHz` (MID), `4kHz` (PRESENCE), `8kHz` (PRESENCE), `16kHz` (AIR).
- **Curva en Tiempo Real**: Gráfico de respuesta en frecuencia con gradiente reactivo y líneas de referencia en `+12dB`, `+6dB`, `0dB`, `-6dB`, `-12dB`.
- **12 Presets de Estudio**: *Plano/Neutral, Bass Boost 808, Club EDM, Hip Hop & Trap, Rock/Metal, Pop Acústico, Voces & Presencia, Treble Aire, Lofi Vinyl, Jazz Cálido, Gaming Pasos, Synthwave Retro*.
- **Herramientas de Precisión**: Micro-ajustes de `+`/`-` 0.5dB, doble clic para reset a `0.0dB`, inversión de curva y botón **Bypass A/B**.

---

## ⚡ Sincronización y Motor FFT

- **Cero Latencia**: `smoothingTimeConstant: 0.22` y ventana FFT de `512 bins` (~11ms de latencia).
- **Ataque Asimétrico (`attackFactor: 0.90`)**: Reacción inmediata al compás de la música en el primer fotograma.
- **Descompresión Rápida (`bassDecay: 0.24`)**: Contracción ágil para garantizar el efecto de bombeo rítmico (*de pequeño a grande*).

---

## 🚀 Instalación y Ejecución

### Requisitos
- [Node.js](https://nodejs.org/) v18.0 o superior
- Administrador de paquetes `npm` o `pnpm`

### 1. Clonar el Repositorio
```bash
git clone https://github.com/WilderSantamaria18/Aura3d.git
cd Aura3d
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador preferido (Chrome, Edge, Firefox, Brave o Safari).

### 4. Compilar para Producción
```bash
npm run build
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Gráficos 3D & Shaders**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei)
- **Computer Vision & IA**: [@mediapipe/hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker), [@mediapipe/camera_utils](https://www.npmjs.com/package/@mediapipe/camera_utils)
- **Audio DSP**: Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`, `MediaElementAudioSourceNode`, `getDisplayMedia`)
- **Estilos & UI**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/), [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- **Gestión de Estado**: [Zustand](https://github.com/pmndrs/zustand)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

<div align="center">

Hecho con ⚡ por [WilderSantamaria18](https://github.com/WilderSantamaria18)

</div>
