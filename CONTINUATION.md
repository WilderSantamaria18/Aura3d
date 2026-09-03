# AURALIS 3D - Estado del Proyecto y Checklist de Continuación

Este documento contiene el estado actual del desarrollo de **Auralis**, la arquitectura implementada y la hoja de ruta detallada para que el próximo asistente o sesión de trabajo pueda retomar el proyecto inmediatamente sin fricciones.

---

## 🚀 Estado Actual (Completado)

### 1. Captura de Audio Optimizada y Ruteo de Volumen
- [x] Captura de sistema con descarte de video inmediato (`track.stop()`) para máximo rendimiento.
- [x] Ruteo a través de `GainNode` para control de volumen en tiempo real sobre capturas y archivos locales.
- [x] Seek funcional sobre archivos cargados y reposo automático en silencio/pausa.

### 2. Los 3 Apartados Visualizadores Principales
- [x] 🌐 **Esfera 3D**: Formas cristalinas, 2000 anillos de arena cósmica y Auto AI Mode.
- [x] ✨ **Rainbow Void**: Anillo blob ondulado arcoíris, logos SVG vectoriales intercambiables, subida de imagen y boost de graves.
- [x] 🎉 **Modo Fiesta**: 48 barras radiales arcoíris, destellos estroboscópicos, rayos láser cyberpunk y orbe disco void.

### 3. Modo Lúcido (10 Colores) y Modo VR Gestual
- [x] 10 paletas de color neón seleccionables en el botón Lúcido.
- [x] VR con MediaPipe Hands con filtro de suavizado y control de sensibilidad.
- [x] Letras Karaoke (LRC) sincronizadas con auto-scroll.

---

## 🛠️ Cómo Ejecutar el Proyecto

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```
