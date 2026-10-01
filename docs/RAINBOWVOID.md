Actúa como desarrollador senior de gráficos en tiempo real, Canvas 2D, React y TypeScript. Implementa una mejora visual y funcional del visualizador **Rainbow Void de Aura3D**, tomando la imagen adjunta como referencia visual principal.

Trabaja sobre el código real del proyecto. No te limites a entregar recomendaciones: inspecciona los archivos, implementa los cambios y verifica el resultado en el navegador.

## 1. Objetivo visual

Quiero que Rainbow Void se acerque a la imagen adjunta:

- Fondo azul noche casi negro.
- Disco central oscuro, circular y claramente definido.
- Aura amplia y multicolor que rodea el disco.
- Colores mezclados suavemente: magenta y violeta arriba, cyan y turquesa a la derecha, verde y amarillo abajo, naranja y rojo a la izquierda.
- Luz volumétrica sugerida mediante transparencias, gradientes y composición en Canvas 2D.
- Contorno exterior difuso, orgánico y ligeramente asimétrico.
- Centro limpio, con icono o carátula legibles.

La referencia es estática. Tu trabajo es convertir esa composición en una experiencia musical viva: el aura debe respirar, deformarse y expandirse con el audio, especialmente con el kick.

No copies el texto “AURALIS VOID” de la imagen ni cambies la identidad de Aura3D. Usa la referencia para la composición, la iluminación y la suavidad.

## 2. Inspección obligatoria

Localiza y revisa:

- `RainbowBlobVisualizer.tsx`
- `voidEffects.ts`
- `src/components/Visualizers/effects/`
- `useProEffectsManager.ts`
- `useFPSMonitor.ts`
- `types/audio.ts`
- `visualPresets.ts`
- `VoidFxCustomizer.tsx`

Comprueba cómo funcionan realmente:

- El bucle de animación.
- La detección de kick y su intensidad.
- El resorte del núcleo.
- La normalización de escala.
- Los datos FFT, chroma y RMS.
- La composición de capas.
- Las paletas y la extracción de color de carátulas.
- La persistencia de ajustes y presets.

La descripción proporcionada es contexto; el código es la fuente de verdad. No presupongas que una función existe o se comporta exactamente como se ha descrito.

Conserva Canvas 2D y el ecosistema Lucid. Aprovecha la arquitectura existente antes de introducir abstracciones nuevas.

## 3. Aura orgánica por capas

Mejora o sustituye internamente el halo existente para obtener tres niveles de luz coordinados:

### A. Halo interior

Una luz contenida y suave inmediatamente detrás del perímetro del disco.

- Define la separación entre el disco y el fondo.
- Sigue la deformación del núcleo.
- Mantiene baja opacidad.
- Aumenta brevemente con los transitorios.
- No invade el contenido central.

### B. Cuerpo cromático

La capa principal de la referencia.

- Usa lóbulos de luz superpuestos con gradientes radiales y caída suave de alpha.
- Distribuye los colores alrededor del disco.
- Introduce variaciones lentas de posición, tamaño y opacidad.
- Evita divisiones visibles entre sectores.
- Mantén suficiente densidad cromática para que se perciba una nube luminosa, sin convertirla en un anillo sólido.
- Conserva zonas de diferente extensión para conseguir una silueta orgánica.

### C. Bloom exterior

Una difusión más amplia, tenue y suave.

- Aporta profundidad alrededor del cuerpo cromático.
- Se desvanece por completo antes de alcanzar el borde del canvas.
- No presenta rectángulos, recortes ni saltos de color.
- Su intensidad queda subordinada al cuerpo cromático.

Resuelve el efecto mediante buffers reutilizables y composición controlada. Evalúa `screen`, `lighter` y `source-over`; utiliza cada modo donde aporte el resultado correcto. Evita sumar luz hasta blanquear la paleta.

El desenfoque debe afectar al aura, conservando nítidos el disco, el icono y la carátula.

## 4. Reacción al kick

El kick debe sentirse como una presión que atraviesa el núcleo y desplaza su aura.

Implementa esta secuencia:

1. El detector existente identifica un transitorio válido.
2. Su fuerza normalizada genera un impulso acotado.
3. El núcleo responde con su resorte.
4. El cuerpo cromático se expande y sus lóbulos se deforman.
5. El bloom exterior crece con un pequeño desfase.
6. Todas las capas regresan suavemente a su posición de reposo.

Usa el impulso del kick y el estado del resorte como señales compartidas. Evita que cada capa detecte golpes de manera independiente.

Requisitos:

- Los golpes suaves generan una respuesta sutil.
- Los golpes fuertes generan una expansión clara, sin saturar toda la pantalla.
- La deformación combina expansión radial y variaciones locales suaves.
- La respuesta vuelve al reposo sin temblores ni parpadeos.
- Los golpes consecutivos se acumulan de forma controlada.
- La animación usa tiempo real y permanece estable a distintas tasas de frames.
- Acota el delta de tiempo y trata correctamente la reanudación de pestañas.

Si el detector produce falsos positivos, revisa su umbral adaptativo, normalización e intervalo mínimo entre golpes antes de aumentar la intensidad gráfica.

No fuerces un +25 % de expansión en cada kick. Conserva ese límite solo si el código y las pruebas confirman que funciona bien.

## 5. Separación de señales de audio

Asigna responsabilidades claras:

- **Kick:** impulso de expansión y deformación.
- **Graves sostenidos:** volumen y amplitud del cuerpo cromático.
- **RMS:** respiración general y nivel de luminosidad.
- **Medios:** ondulaciones locales.
- **Agudos:** detalles luminosos breves y contenidos.
- **Chroma:** matices de color o respuesta de formas musicales existentes.

Suaviza las señales continuas con tiempos de ataque y liberación. Conserva la inmediatez del transitorio.

No vincules todos los parámetros al volumen global. El resultado debe distinguir entre un bombo, una voz sostenida y un hi-hat.

## 6. Disco central y compatibilidad

Mantén el disco oscuro y bien separado del aura.

Preserva:

- Carátulas y logos personalizados.
- Vinilo, surcos y rotación.
- Iconos vectoriales.
- Apertura de `LogoCropFilterModal.tsx`.
- Biseles y controles existentes.
- Formas `cat`, `bunny`, `horns`, `crown`, `flame`, `wings`, `notes`, `spikes` y `fractal`.
- Acabados `neon`, `glass` e `ink`.
- Paletas y modo `lucid`.
- Modo DHONKIO.

El aura debe complementar las formas activas. Equilibra su brillo para conservar la lectura de orejas, picos, pétalos y contornos.

Evita duplicar ondas de choque entre `Boom` y `shockwave`. Si ambos están activos, coordina su comportamiento o reduce su superposición.

En DHONKIO, conserva el skyline, las estrellas y el rótulo legibles.

## 7. Controles y preset

Integra los ajustes en el personalizador existente. Expón solo controles comprensibles:

- Intensidad del aura.
- Extensión.
- Suavidad.
- Respuesta al kick.
- Movimiento ambiental.

Reutiliza controles equivalentes si ya existen. Define rangos seguros y valores iniciales equilibrados.

Añade un preset inspirado en la referencia, siguiendo el sistema real de presets del proyecto. Este preset debe combinar:

- Disco oscuro.
- Aura amplia y suave.
- Distribución cromática similar a la imagen.
- Movimiento ambiental lento.
- Respuesta elástica al kick.
- Efectos adicionales discretos.

Conserva compatibilidad con presets guardados y proporciona valores de respaldo para cualquier campo nuevo.

## 8. Rendimiento

Apunta a 60 FPS y verifica el coste real.

- Reutiliza buffers, arrays y estructuras temporales.
- No crees canvases ni colecciones por frame.
- Evita generar gradientes complejos repetidamente cuando se puedan cachear.
- No actualices estado React dentro del bucle de animación.
- Renderiza la difusión en un buffer de resolución reducida si mantiene buena calidad.
- Limita DPR y resolución de efectos según el dispositivo.
- Recalcula tamaños y cachés cuando cambien sus dependencias.
- Libera recursos, listeners y animation frames al desmontar.
- Respeta el máximo existente de efectos Pro.

Integra la degradación de calidad con el monitor de FPS. Reduce primero resolución de difusión, detalle y capas secundarias. Mantén la respuesta principal al kick.

Usa histéresis y periodos de evaluación para evitar cambios constantes de calidad alrededor de 45 FPS. No afirmes “cero allocations” ni “60 FPS garantizados” sin mediciones.

## 9. Verificación

Prueba en navegador:

- Silencio y pausa: reposo suave y estable.
- Música con bombo marcado: impulsos claros y recuperación elástica.
- Música vocal o ambiental: respiración contenida.
- Percusión rápida: sin destellos excesivos ni acumulación descontrolada.
- Carátula, logo e icono central.
- Cambio de paleta, preset, forma y acabado.
- Modo DHONKIO.
- Redimensionamiento, móvil, escritorio y DPR alto.
- Ocultar y recuperar la pestaña.
- Activación de varios efectos Pro.

Comprueba que el aura no se recorta, no tapa los controles y mantiene el disco legible. Respeta `prefers-reduced-motion`, reduciendo deformaciones y destellos.

Ejecuta las comprobaciones del proyecto apropiadas para los cambios. Mide rendimiento indicando dispositivo, resolución, DPR y efectos activos.

## 10. Entrega

Entrega la implementación terminada y un resumen breve con:

- Archivos modificados.
- Comportamiento nuevo del aura y del kick.
- Controles y preset incorporados.
- Capturas del resultado.
- Comprobaciones ejecutadas.
- Rendimiento observado y limitaciones pendientes.

Prioriza el parecido con la referencia, la sincronización musical y la estabilidad. El resultado debe sentirse como un núcleo oscuro suspendido dentro de una nube cromática líquida, cuya luz recibe y transmite cada golpe de bombo.