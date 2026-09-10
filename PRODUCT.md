# Aura3D — Especificación del Producto (PRODUCT.md)

## 1. Visión del Producto
**Aura3D** (también conocido como *Auralis Studio*) es una suite inmersiva de visualización musical en 3D, síntesis de audio en tiempo real e instrumentos gestuales en el navegador. Combina la potencia gráfica de **Three.js / WebGL**, el procesamiento de señal digital de la **Web Audio API** y la visión por computadora con **MediaPipe** para crear una experiencia sensorial de nivel de estudio.

---

## 2. Modos de Superficie

Aura3D opera en dos modos principales según la superficie de interacción:

1. **Modo Experiencia (`Experience`)**:
   - **Superficie**: Escena WebGL inmersiva a pantalla completa (Esfera 3D, Rainbow Void 2D, Fiesta 3D, VR).
   - **Objetivo**: El usuario está inmerso en la música y las partículas reactivas; la interfaz retrocede a los bordes con acabado mate y precisión milimétrica.
2. **Modo Operación (`Operate`)**:
   - **Superficie**: Consola de mezcla, ecualizador paramétrico de 10 bandas, gestor de listas de reproducción, panel de telemetría y configuración del visualizador.
   - **Objetivo**: Precisión táctil, legibilidad de decibelios y hercios, estabilidad de cifras tabulares y cero distracciones decorativas.

---

## 3. Arquetipos de Usuario
- **Audiófilos y Productores de Música**: Buscan ecualización analítica precisa, gráficos de respuesta espectral y reproducción de archivos de alta fidelidad (FLAC, WAV, MP3 320k).
- **VJs y Creadores Visuales**: Utilizan los visualizadores 3D en proyectores o pantallas secundarias para eventos en vivo, sets de DJ o grabaciones de vídeo.
- **Entusiastas de Nuevas Tecnologías / VR**: Disfrutan de tocar sintetizadores y baterías en el aire mediante el seguimiento de manos con cámara web en tiempo real.

---

## 4. Restricciones Técnicas
- **Plataforma**: Web moderna con aceleración por hardware (WebGL 2.0 / Web Audio API).
- **Rendimiento**: Tasa de refresco objetivo de 60 FPS estables con mínimo consumo de CPU.
- **Privacidad**: Todo el análisis de audio y tracking de cámara se realiza de forma 100% local en el navegador del usuario (cero telemetría invasiva a servidores externos).
