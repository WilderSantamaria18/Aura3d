import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Label3D } from './Label3D';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { SYNTH_SCALES } from '../../services/airInstrumentsAudioEngine';
import { SpatialState } from '../../spatial/state/SpatialState';
import { GestureEngine } from '../../spatial/gestures/GestureEngine';
import { SpatialInstrumentEngine } from '../../spatial/instruments/SpatialInstrumentEngine';
import { PerformanceManager } from '../../spatial/performance/PerformanceManager';

/**
 * Instrumentos aéreos con estética de hardware de estudio: cuerpos mate oscuros, filo iluminado
 * y un LED por control. Todo con materiales básicos (sin luces, transmisión ni blur) para que
 * corra fluido en GPU integrada; el brillo se logra con color, no con post-proceso.
 */

// ── Paleta de estudio ─────────────────────────────────────────────────────────
const BODY_DARK = new THREE.Color('#0f1218');
const EDGE_COLOR = '#aab4cb';
const HOT_WHITE = new THREE.Color('#ffffff');
const KEY_COLD = new THREE.Color('#38e8ff');
const KEY_WARM = new THREE.Color('#8b7bff');
const THEREMIN_COLOR = '#ffc23d';

// Geometrías de bordes compartidas (una sola vez por tipo de control)
const KEY_SIZE: [number, number, number] = [0.36, 0.72, 0.1];
const PAD_SIZE: [number, number, number] = [0.46, 0.46, 0.06];

// Campo del theremin: por encima del dock inferior de reproducción
const FIELD = { cx: 0, cy: 0.42, w: 2.4, h: 1.3 };

const MAX_SHOCKWAVES = 16;

interface KeyVisualState {
  pressAmount: number;
  glowIntensity: number;
  inside: boolean;
}

interface ShockwaveRing {
  x: number;
  y: number;
  z: number;
  scale: number;
  alpha: number;
  speed: number;
  fadeSpeed: number;
  color: string;
}

const _tint = new THREE.Color();

export const AirInstruments3D: React.FC = () => {
  const { camera } = useThree();
  const isAirInstrumentsActive = usePlayerStore((s) => s.isAirInstrumentsActive);
  const airInstrumentType = usePlayerStore((s) => s.airInstrumentType);

  // Refs de escena
  const thereminRef = useRef<THREE.Group>(null);
  const thereminHLineRef = useRef<THREE.Mesh>(null);
  const thereminVLineRef = useRef<THREE.Mesh>(null);
  const tipMeshesRef = useRef<(THREE.Mesh | null)[]>([]);

  // Teclas: estado independiente por tecla (Array.fill compartiría una única referencia)
  const keyStatesRef = useRef<KeyVisualState[]>(
    Array.from({ length: 7 }, () => ({ pressAmount: 0, glowIntensity: 0, inside: false }))
  );
  const keyGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const keyBodyMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const keyLedMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const keyFlashMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  // Pads de batería
  const padGlowRef = useRef<number[]>([0, 0, 0, 0]);
  const padGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const padFillMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const padFlashMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const drumInsideRef = useRef<boolean[]>([false, false, false, false]);

  // Ondas de choque dobles concéntricas: datos + pool fijo de mallas
  const shockwavesRef = useRef<ShockwaveRing[]>([]);
  const shockwaveMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Escala musical activa
  const scaleNotes = useMemo(() => SYNTH_SCALES.pentatonic_minor.notes.slice(0, 7), []);

  // Disposición ergonómica en arco de 7 teclas a 2.8 m de la cámara
  const synthKeyLayout = useMemo(() => {
    const count = 7;
    const spacing = 0.46;
    const startX = -((count - 1) * spacing) / 2;
    // Cámara en Z=6.2 con targetDistance=2.8 => plano de interacción en Z=3.4
    const baseZ = 3.4;
    const baseY = 0.08;

    return scaleNotes.map((note, i) => {
      const x = startX + i * spacing;
      const curveOffset = Math.sin((i / (count - 1)) * Math.PI) * 0.18;
      const z = baseZ + curveOffset;
      const y = baseY + curveOffset * 0.2;

      return {
        ...note,
        index: i,
        position: [x, y, z] as [number, number, number],
        color: new THREE.Color().copy(KEY_COLD).lerp(KEY_WARM, i / (count - 1)),
        bounds: { minX: x - 0.22, maxX: x + 0.22, minY: y - 0.36, maxY: y + 0.36, z },
      };
    });
  }, [scaleNotes]);

  // Cuadrícula 2x2 de percusión (estilo MPC) en Z=3.45
  const drumPads = useMemo(
    () => [
      { id: 'kick', name: 'KICK', pos: [-0.3, -0.05, 3.45] as [number, number, number], color: new THREE.Color('#ff3d8b') },
      { id: 'snare', name: 'SNARE', pos: [0.3, -0.05, 3.45] as [number, number, number], color: new THREE.Color('#38e8ff') },
      { id: 'hihat', name: 'HI-HAT', pos: [-0.3, 0.5, 3.45] as [number, number, number], color: new THREE.Color('#ffc23d') },
      { id: 'clap', name: 'CLAP', pos: [0.3, 0.5, 3.45] as [number, number, number], color: new THREE.Color('#5dea8c') },
    ],
    []
  );

  // Geometrías de filo compartidas (se liberan al desmontar)
  const keyEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...KEY_SIZE)), []);
  const padEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...PAD_SIZE)), []);
  const fieldEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(FIELD.w, FIELD.h)), []);
  useEffect(
    () => () => {
      keyEdges.dispose();
      padEdges.dispose();
      fieldEdges.dispose();
    },
    [keyEdges, padEdges, fieldEdges]
  );

  const pushDoubleShockwave = (x: number, y: number, z: number, color: string) => {
    // Menos ondas simultáneas en calidad baja
    const cap = PerformanceManager.getInstance().getTier() === 'LOW' ? 6 : MAX_SHOCKWAVES;
    while (shockwavesRef.current.length >= cap - 1) shockwavesRef.current.shift();
    // 1. Núcleo primario rápido y brillante
    shockwavesRef.current.push({
      x,
      y,
      z,
      scale: 0.08,
      alpha: 1.0,
      speed: 4.8,
      fadeSpeed: 3.2,
      color: '#ffffff',
    });
    // 2. Halo armónico difuso secundario
    shockwavesRef.current.push({
      x,
      y,
      z,
      scale: 0.05,
      alpha: 0.85,
      speed: 2.8,
      fadeSpeed: 1.8,
      color,
    });
  };

  // ── Frame Loop Principal (Three.js rAF) ────────────────────────────────────
  useFrame((_, delta) => {
    if (!isAirInstrumentsActive) return;

    const spatialState = SpatialState.getInstance();
    const spatialInstruments = SpatialInstrumentEngine.getInstance();
    GestureEngine.getInstance().setCamera(camera as THREE.PerspectiveCamera);

    // Sincronizar tipo de instrumento respetando la selección activa de SpatialInstrumentEngine
    if (airInstrumentType === 'synth' && !spatialInstruments.getInstrument()) {
      spatialInstruments.setInstrument('piano');
    }

    // 1. Manos desde SpatialState (sin asignaciones, sin pasar por React)
    const domHand = spatialState.getDominantHand();
    const secHand = spatialState.getSecondaryHand();

    const tip0 = tipMeshesRef.current[0];
    if (tip0) {
      const show = domHand.isPresent && domHand.confidenceTier !== 'untrusted';
      tip0.visible = show;
      if (show) tip0.position.copy(domHand.worldIndexTip);
    }
    const tip1 = tipMeshesRef.current[1];
    if (tip1) {
      const show = secHand.isPresent && secHand.confidenceTier !== 'untrusted';
      tip1.visible = show;
      if (show) tip1.position.copy(secHand.worldIndexTip);
    }

    const primaryTip =
      domHand.isPresent && domHand.confidenceTier !== 'untrusted' ? domHand.worldIndexTip : null;

    // Liberar teclas sostenidas si la mano se pierde o cambia el instrumento
    if (!(airInstrumentType === 'synth' && primaryTip)) {
      keyStatesRef.current.forEach((state, idx) => {
        if (state.inside) {
          state.inside = false;
          spatialInstruments.triggerNoteOff(idx);
        }
      });
    }
    if (!(airInstrumentType === 'drums' && primaryTip)) {
      drumInsideRef.current.fill(false);
    }

    // 2. Colisión según el instrumento activo
    if (airInstrumentType === 'synth' && primaryTip) {
      synthKeyLayout.forEach((key, idx) => {
        const b = key.bounds;
        const state = keyStatesRef.current[idx];
        const isInside =
          primaryTip.x >= b.minX && primaryTip.x <= b.maxX && primaryTip.y >= b.minY && primaryTip.y <= b.maxY;

        if (isInside && !state.inside) {
          // Entrada al plano de la tecla: una sola nota por pulsación
          state.inside = true;
          spatialInstruments.triggerNoteOn(idx, key.freq, 0.9);
          state.pressAmount = 1.0;
          state.glowIntensity = 1.0;
          pushDoubleShockwave(key.position[0], key.position[1], key.position[2], '#' + key.color.getHexString());
        } else if (isInside) {
          // Dedo sostenido: la tecla se mantiene encendida
          state.pressAmount = Math.max(state.pressAmount, 0.6);
          state.glowIntensity = Math.max(state.glowIntensity, 0.6);
        } else if (state.inside) {
          state.inside = false;
          spatialInstruments.triggerNoteOff(idx);
        }
      });
    } else if (airInstrumentType === 'drums' && primaryTip) {
      drumPads.forEach((pad, i) => {
        const inside =
          Math.abs(primaryTip.x - pad.pos[0]) < 0.26 && Math.abs(primaryTip.y - pad.pos[1]) < 0.26;
        // Golpe solo al entrar en el pad (no en cada frame mientras el dedo permanece)
        if (inside && !drumInsideRef.current[i]) {
          spatialInstruments.triggerDrum(pad.id as never, 0.95);
          padGlowRef.current[i] = 1;
          pushDoubleShockwave(pad.pos[0], pad.pos[1], pad.pos[2], '#' + pad.color.getHexString());
        }
        drumInsideRef.current[i] = inside;
      });
    } else if (airInstrumentType === 'theremin') {
      const group = thereminRef.current;
      if (primaryTip) {
        spatialInstruments.startTheremin();
        const normX = Math.max(0, Math.min(1, (primaryTip.x - FIELD.cx + FIELD.w / 2) / FIELD.w));
        const normY = Math.max(0, Math.min(1, (primaryTip.y - FIELD.cy + FIELD.h / 2) / FIELD.h));
        spatialInstruments.updateTheremin(normX, normY, primaryTip.z);

        if (group) {
          group.visible = true;
          group.position.copy(primaryTip);
        }
        // Líneas guía que cruzan el campo por la posición del dedo (tono en X, volumen en Y)
        if (thereminVLineRef.current) thereminVLineRef.current.position.x = primaryTip.x - FIELD.cx;
        if (thereminHLineRef.current) thereminHLineRef.current.position.y = primaryTip.y - FIELD.cy;
      } else {
        spatialInstruments.stopTheremin();
        if (group) group.visible = false;
      }
    }

    // 3. Desvanecimiento y aplicación imperativa a mallas/materiales
    //    (React no re-renderiza este componente por frame: nada se lee desde el JSX)
    const decay = Math.min(1.0, delta * 8);
    for (let i = 0; i < 7; i++) {
      const state = keyStatesRef.current[i];
      if (state.pressAmount > 0.01) {
        state.pressAmount = Math.max(0, state.pressAmount - decay);
        state.glowIntensity = Math.max(0, state.glowIntensity - decay * 0.8);
      }
      const g = keyGroupRefs.current[i];
      if (g) {
        // Depresión física 3D con pivote angular y desplazamiento en Y/Z
        g.position.y = -state.pressAmount * 0.065;
        g.position.z = -state.pressAmount * 0.055;
        g.rotation.x = -state.pressAmount * 0.14;
      }

      const base = synthKeyLayout[i].color;
      const bodyMat = keyBodyMatRefs.current[i];
      if (bodyMat) bodyMat.color.copy(BODY_DARK).lerp(base, state.glowIntensity * 0.6);
      const ledMat = keyLedMatRefs.current[i];
      if (ledMat) {
        ledMat.color.copy(base).lerp(HOT_WHITE, state.glowIntensity * 0.8);
        ledMat.opacity = 0.3 + state.glowIntensity * 0.7;
      }
      const flashMat = keyFlashMatRefs.current[i];
      if (flashMat) {
        // Destello especular de alta intensidad fotónica que decae elásticamente
        flashMat.opacity = Math.pow(state.pressAmount, 2.5) * 0.85;
      }
    }
    for (let i = 0; i < 4; i++) {
      if (padGlowRef.current[i] > 0.01) padGlowRef.current[i] = Math.max(0, padGlowRef.current[i] - delta * 5);
      const glow = padGlowRef.current[i];
      const g = padGroupRefs.current[i];
      if (g) {
        // Hundimiento físico y absorción de impacto elástica
        g.position.z = drumPads[i].pos[2] - glow * 0.08;
        g.scale.set(1 - glow * 0.035, 1 - glow * 0.035, 1 - glow * 0.08);
      }
      const mat = padFillMatRefs.current[i];
      if (mat) {
        _tint.copy(drumPads[i].color);
        mat.color.copy(_tint).lerp(HOT_WHITE, glow * 0.5);
        mat.opacity = 0.16 + glow * 0.8;
      }
      const flashMat = padFlashMatRefs.current[i];
      if (flashMat) {
        flashMat.opacity = Math.pow(glow, 2.0) * 0.9;
      }
    }

    // 4. Ondas de choque dobles concéntricas
    for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
      const sw = shockwavesRef.current[i];
      sw.scale += delta * sw.speed;
      sw.alpha -= delta * sw.fadeSpeed;
      if (sw.alpha <= 0) shockwavesRef.current.splice(i, 1);
    }
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const mesh = shockwaveMeshRefs.current[i];
      if (!mesh) continue;
      const sw = shockwavesRef.current[i];
      if (!sw) {
        mesh.visible = false;
        continue;
      }
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mesh.visible = true;
      mesh.position.set(sw.x, sw.y, sw.z);
      mesh.scale.setScalar(sw.scale);
      mat.opacity = Math.max(0, sw.alpha);
      mat.color.set(sw.color);
    }
  });

  if (!isAirInstrumentsActive) return null;

  return (
    <group>
      {/* ── Teclado: 7 teclas mate con LED inferior y destello especular ── */}
      {airInstrumentType === 'synth' &&
        synthKeyLayout.map((key, idx) => (
          <group key={key.name} position={key.position}>
            <group
              ref={(el) => {
                keyGroupRefs.current[idx] = el;
              }}
            >
              <mesh>
                <boxGeometry args={KEY_SIZE} />
                <meshBasicMaterial
                  ref={(el) => {
                    keyBodyMatRefs.current[idx] = el;
                  }}
                  color={BODY_DARK}
                />
              </mesh>
              <lineSegments geometry={keyEdges}>
                <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.5} />
              </lineSegments>
              {/* LED de base */}
              <mesh position={[0, -0.28, 0.055]}>
                <planeGeometry args={[0.24, 0.04]} />
                <meshBasicMaterial
                  ref={(el) => {
                    keyLedMatRefs.current[idx] = el;
                  }}
                  color={key.color}
                  transparent
                  opacity={0.3}
                />
              </mesh>
              {/* Specular Flash Overlay: Destello frontal en impacto */}
              <mesh position={[0, 0, 0.052]}>
                <planeGeometry args={[0.35, 0.71]} />
                <meshBasicMaterial
                  ref={(el) => {
                    keyFlashMatRefs.current[idx] = el;
                  }}
                  color={HOT_WHITE}
                  transparent
                  opacity={0}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              <Label3D text={key.name} position={[0, 0.27, 0.06]} size={0.07} />
            </group>
          </group>
        ))}

      {/* ── Batería: 4 pads en rejilla 2x2 con destello especular ── */}
      {airInstrumentType === 'drums' &&
        drumPads.map((pad, idx) => (
          <group
            key={pad.id}
            position={pad.pos}
            ref={(el) => {
              padGroupRefs.current[idx] = el;
            }}
          >
            <mesh>
              <boxGeometry args={PAD_SIZE} />
              <meshBasicMaterial color={BODY_DARK} />
            </mesh>
            <mesh position={[0, 0, 0.032]}>
              <planeGeometry args={[0.42, 0.42]} />
              <meshBasicMaterial
                ref={(el) => {
                  padFillMatRefs.current[idx] = el;
                }}
                color={pad.color}
                transparent
                opacity={0.16}
              />
            </mesh>
            {/* Specular Flash Overlay en Pad */}
            <mesh position={[0, 0, 0.033]}>
              <planeGeometry args={[0.44, 0.44]} />
              <meshBasicMaterial
                ref={(el) => {
                  padFlashMatRefs.current[idx] = el;
                }}
                color={HOT_WHITE}
                transparent
                opacity={0}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <lineSegments geometry={padEdges}>
              <lineBasicMaterial color={pad.color} transparent opacity={0.9} />
            </lineSegments>
            <Label3D text={pad.name} position={[-0.21, -0.18, 0.04]} size={0.055} color="#dfe6f5" anchorX="left" />
          </group>
        ))}

      {/* ── Theremin: campo de juego con ejes y retícula ── */}
      {airInstrumentType === 'theremin' && (
        <>
          <group position={[FIELD.cx, FIELD.cy, 3.4]}>
            <lineSegments geometry={fieldEdges}>
              <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.4} />
            </lineSegments>
            <Label3D text="TONO" position={[0, -FIELD.h / 2 - 0.09, 0]} size={0.07} />
            <Label3D text="VOL" position={[-FIELD.w / 2 - 0.06, 0, 0]} size={0.07} anchorX="right" />
            {/* Guías que siguen al dedo (dentro del campo, recortadas por su tamaño) */}
            <mesh ref={thereminVLineRef} position={[0, 0, 0]}>
              <planeGeometry args={[0.006, FIELD.h]} />
              <meshBasicMaterial color={THEREMIN_COLOR} transparent opacity={0.35} />
            </mesh>
            <mesh ref={thereminHLineRef} position={[0, 0, 0]}>
              <planeGeometry args={[FIELD.w, 0.006]} />
              <meshBasicMaterial color={THEREMIN_COLOR} transparent opacity={0.35} />
            </mesh>
          </group>
          <group ref={thereminRef} visible={false}>
            <mesh>
              <ringGeometry args={[0.1, 0.12, 40]} />
              <meshBasicMaterial color={THEREMIN_COLOR} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.035, 24]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </>
      )}

      {/* ── Indicadores de puntas de dedos (anillo + punto) ── */}
      {[0, 1].map((idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            tipMeshesRef.current[idx] = el;
          }}
          visible={false}
        >
          <ringGeometry args={[0.04, 0.055, 24]} />
          <meshBasicMaterial color={idx === 0 ? '#ffffff' : '#aab4cb'} />
          <mesh>
            <circleGeometry args={[0.014, 16]} />
            <meshBasicMaterial color={idx === 0 ? '#ffffff' : '#aab4cb'} />
          </mesh>
        </mesh>
      ))}

      {/* ── Ondas de choque (anillos finos) ── */}
      {Array.from({ length: MAX_SHOCKWAVES }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            shockwaveMeshRefs.current[i] = el;
          }}
          visible={false}
        >
          <ringGeometry args={[0.94, 1, 40]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default AirInstruments3D;
