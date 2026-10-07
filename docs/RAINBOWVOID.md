# RAINBOW VOID — PLAN MAESTRO DE REDISEÑO VISUAL

## REGLA PRINCIPAL

NO rediseñes Rainbow Void completo de una sola vez.

Vamos a trabajar efecto por efecto.

Cada efecto tendrá estas etapas obligatorias:

1. AUDITORÍA
2. DISEÑO VISUAL
3. DISEÑO DE MOVIMIENTO
4. DISEÑO DE REACCIÓN MUSICAL
5. IMPLEMENTACIÓN
6. VALIDACIÓN VISUAL
7. VALIDACIÓN DE RENDIMIENTO
8. APROBACIÓN

NO avances al siguiente efecto hasta recibir mi aprobación.

---

# EFECTOS

Trabajar exactamente en este orden:

1. Spectrum → Spectral Crown
2. Wave → Liquid Resonance
3. Particles → Stardust Flow
4. Geometry → Sacred Lattice
5. Radar → Echo Lens
6. Electro → Neural Arc
7. Laser → Prismatic Caustics
8. Spiro / Mandala → CONSERVAR
9. Tunnel → Event Horizon
10. Hive → Liquid Tessellation
11. Spiral → Golden Flow

IMPORTANTE:

`Spiro / Mandala` está aprobado visualmente.

NO modificarlo.

Puede utilizarse como referencia de calidad, complejidad y elegancia, pero los demás efectos NO deben copiar su geometría.

---

# REGLAS DE DISEÑO

Rainbow Void debe dejar de parecer una colección de:

- demos de Canvas;
- ecualizadores;
- formas geométricas básicas;
- líneas con glow;
- círculos pulsantes;
- partículas aleatorias;
- efectos típicos de tutorial;
- barras FFT;
- animaciones generativas genéricas.

Cada efecto debe tener:

IDENTIDAD VISUAL
+
PROFUNDIDAD
+
MOVIMIENTO
+
FÍSICA
+
RESPUESTA MUSICAL
+
MICRODETALLES
+
JERARQUÍA VISUAL.

---

# REGLA DE PROFUNDIDAD

No considerar un efecto terminado si consiste únicamente en:

`draw shape → apply color → add glow`.

Cada efecto debe evaluar una estructura visual multicapa.

Ejemplo conceptual:

ATMOSPHERE
↓
GHOST LAYER
↓
SECONDARY STRUCTURE
↓
MAIN STRUCTURE
↓
HIGHLIGHT
↓
MICRODETAIL
↓
TRANSIENT FX

No significa que todos necesiten siete capas.

Significa que debe existir profundidad visual intencional.

---

# REGLA DE MOVIMIENTO

NO utilizar solamente:

`scale = audioEnergy`

Eso genera visualizadores básicos.

Separar:

POSITION
VELOCITY
ACCELERATION
TARGET
DAMPING
SPRING
PHASE
ENERGY

Cuando sea apropiado.

El audio modifica el comportamiento físico.

No simplemente el tamaño.

---

# REGLA FFT

SUB / BASS:

Debe controlar masa, presión, deformaciones grandes, expansión o profundidad.

MID:

Debe controlar movimiento estructural, ondulación, rotación secundaria o deformaciones medias.

HIGH:

Debe controlar microdetalle, refracción, highlights, pequeñas perturbaciones o textura.

KICK:

Debe producir eventos físicos.

Ejemplos:

- shock;
- propagation;
- displacement;
- burst;
- refraction;
- recoil;
- elastic response.

No simplemente:

`scale += kick`.

---

# REGLA DE COLOR

Todos los efectos deben respetar las paletas existentes.

NO crear colores hardcodeados innecesarios.

Color debe provenir del sistema Rainbow Void.

Usar gradientes y transparencias con moderación.

Glow no puede utilizarse para esconder geometría pobre.

---

# REGLA DE RENDIMIENTO

Mantener Zero-GC cuando sea posible.

Preferir:

Float32Array
Uint8Array
buffers reutilizables
variables precomputadas
lookup tables

Evitar creación innecesaria de:

Array
Object
Path
Gradient
Particle

por frame.

No utilizar `shadowBlur` pesado como solución visual principal.

Objetivo:

60 FPS estables.

---

# PROCESO OBLIGATORIO PARA CADA EFECTO

Antes de escribir código:

## ETAPA A — AUDITORÍA

Identificar:

- archivo;
- función;
- renderer;
- buffers;
- entrada FFT;
- kick;
- paleta;
- configuración;
- inners;
- dependencias.

Entregar un pequeño reporte.

NO modificar código todavía.

---

## ETAPA B — PROPUESTA VISUAL

Explicar:

1. Qué se eliminará.
2. Qué permanecerá.
3. Nueva identidad.
4. Forma principal.
5. Capas.
6. Movimiento.
7. Respuesta musical.
8. Comportamiento en silencio.
9. Comportamiento con música intensa.
10. Comportamiento durante kick.

NO implementar todavía.

Esperar aprobación.

---

## ETAPA C — IMPLEMENTACIÓN

Una vez aprobado:

Modificar exclusivamente el efecto seleccionado.

No refactorizar otros motores.

No realizar cambios globales innecesarios.

No modificar Mandala.

---

## ETAPA D — VALIDACIÓN

Probar:

SILENCE

BASS

MID

HIGH

KICK

DENSE MUSIC

LOW ENERGY MUSIC

HIGH ENERGY MUSIC

RESIZE

FULLSCREEN

DPR ALTO

DPR NORMAL

---

## ETAPA E — PERFORMANCE

Verificar:

FPS

frame time

allocations

GC

CPU

cantidad de draw calls

cantidad de vértices

buffers

---

## ETAPA F — REPORTE

Entregar:

### Archivos modificados

### Código eliminado

### Código agregado

### Algoritmo

### Reacción FFT

### Física

### Rendimiento

### Problemas encontrados

### Posibles mejoras

Después:

DETENERTE.

No continuar automáticamente.

---

# FASE 1

## SPECTRUM → SPECTRAL CROWN

Objetivo:

Eliminar completamente la sensación de ecualizador radial.

Crear una membrana espectral continua alrededor del núcleo.

### Diseño

La forma debe sentirse:

orgánica
+
líquida
+
elástica
+
precisa.

No utilizar barras.

Construir una curva radial continua de aproximadamente 128–256 muestras adaptables según rendimiento.

Cada muestra puede almacenar:

radius
target
velocity
energy
phase.

Utilizar interpolación espacial.

La forma debe parecer una membrana bajo presión acústica.

### Bass

Grandes deformaciones.

### Mid

Ondulaciones.

### High

Microdetalle.

### Kick

Propagación elástica alrededor de la membrana.

### Inners

2–4 membranas parciales interiores.

NO simples círculos escalables.

---

# FASE 2

## WAVE → LIQUID RESONANCE

Eliminar el aspecto de osciloscopio.

Crear interferencias fluidas alrededor del núcleo.

Inspiración conceptual:

ondas sobre líquido
+
resonancia
+
interferencia
+
caustics.

No dibujar simplemente una senoide.

Crear dos o tres campos de ondas que interactúan.

Cuando dos ondas se encuentran:

constructive interference

o

destructive interference.

Bass controla amplitud.

Mid controla propagación.

High controla pequeñas refracciones.

Kick genera una onda primaria que atraviesa el sistema.

---

# FASE 3

## PARTICLES → STARDUST FLOW

NO generar partículas aleatorias flotando.

Crear un campo de partículas coherente.

Las partículas deben seguir:

flow fields
+
órbitas
+
atractores
+
inercia.

El disco central puede funcionar como campo gravitacional visual.

Bass:

modifica órbitas.

Mid:

modifica flow.

High:

produce pequeños destellos.

Kick:

expulsa temporalmente partículas y posteriormente el campo las recupera.

---

# FASE 4

## GEOMETRY → SACRED LATTICE

No utilizar polígonos simplemente rotando.

Crear una estructura geométrica interconectada.

Nodos
+
aristas
+
simetría
+
deformación.

Las conexiones deben reaccionar como una estructura tensionada.

Bass:

deforma la red.

Mid:

rota regiones.

High:

ilumina conexiones.

Kick:

genera una deformación estructural que viaja por la lattice.

---

# FASE 5

## RADAR → ECHO LENS

Eliminar completamente el radar tradicional.

NO:

círculos
+
línea giratoria.

Crear una lente acústica.

Cada transitorio genera un eco visual.

El eco se expande, refracta y desaparece.

Pueden existir múltiples ecos simultáneos.

Visualmente:

acoustic lensing
+
refraction
+
echo
+
depth.

---

# FASE 6

## ELECTRO → NEURAL ARC

Mantener la idea eléctrica pero eliminar el efecto "rayo aleatorio".

Crear conexiones eléctricas estructuradas.

Los arcos deben buscar nodos.

Nodo A
→ trayectoria
→ nodo B.

Utilizar branching controlado.

Bass:

carga eléctrica.

Mid:

longitud.

High:

microarcos.

Kick:

descarga principal.

No convertir toda la pantalla en rayos.

---

# FASE 7

## LASER → PRISMATIC CAUSTICS

Eliminar haces láser básicos.

Crear refracciones de luz.

Inspiración:

glass
+
prism
+
caustics
+
dispersion.

La música debe deformar virtualmente una superficie refractiva.

Esto genera líneas luminosas curvas y fragmentos espectrales.

Debe sentirse óptico, no como luces de discoteca.

---

# FASE 8

## SPIRO / MANDALA

NO MODIFICAR.

Estado:

APPROVED.

Puede utilizarse como referencia visual de calidad.

---

# FASE 9

## TUNNEL → EVENT HORIZON

Eliminar túnel clásico de círculos escalándose.

Crear sensación de profundidad gravitacional.

Elementos visuales deben:

aparecer
→ acelerar
→ deformarse
→ cruzar horizonte
→ desaparecer.

El centro funciona como una región gravitacional.

Bass:

profundidad.

Mid:

torsión.

High:

distorsión periférica.

Kick:

pulso gravitacional.

---

# FASE 10

## HIVE → LIQUID TESSELLATION

Eliminar panal estático.

Mantener la idea de teselación pero convertirla en una superficie dinámica.

Las celdas deben:

comprimirse
expandirse
deformarse
transferir energía.

No todas reaccionan simultáneamente.

La energía debe propagarse entre celdas vecinas.

---

# FASE 11

## SPIRAL → GOLDEN FLOW

No dibujar simplemente una espiral Fibonacci.

Crear múltiples corrientes siguiendo proporciones áureas.

Debe parecer flujo.

No dibujo matemático.

Los brazos pueden:

expandirse
contraerse
dividirse
fusionarse.

Bass:

radio.

Mid:

curvatura.

High:

detalle.

Kick:

onda que recorre los brazos.

---

# CRITERIO FINAL DE CALIDAD

Antes de considerar cualquier efecto terminado, responder:

¿Parece un tutorial de Canvas?

Si SÍ:

NO está terminado.

¿Depende principalmente del glow para verse atractivo?

Si SÍ:

NO está terminado.

¿Simplemente escala según FFT?

Si SÍ:

NO está terminado.

¿Tiene identidad propia?

¿Tiene profundidad?

¿Tiene microdetalle?

¿Tiene movimiento secundario?

¿Tiene respuesta física?

¿Tiene buena composición alrededor del disco?

¿Funciona incluso con bloom reducido?

Si estas respuestas son positivas:

el efecto puede pasar a revisión.

---

# INSTRUCCIÓN FINAL

Empieza EXCLUSIVAMENTE con:

FASE 1 — SPECTRAL CROWN.

Primero realiza:

ETAPA A — AUDITORÍA.

NO escribas código todavía.

Muéstrame:

- archivos encontrados;
- funciones;
- arquitectura actual;
- dependencias;
- problemas visuales detectados;
- plan exacto de modificación.

Después DETENTE.

Espera mi aprobación.