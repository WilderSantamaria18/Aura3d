import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import {
  AirInstrumentsAudioEngine,
  SYNTH_SCALES,
} from '../../services/airInstrumentsAudioEngine';
import {
  SpatialVisionService,
  projectLandmarkToWorld,
} from '../../services/spatialVisionService';

// ── Reutilización de vectores para 0 Garbage Collection ───────────────────────
const _tmpVec = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _shockwaveScale = new THREE.Vector3();

interface KeyVisualState {
  pressAmount: number;
  glowIntensity: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  z: number;
  scale: number;
  alpha: number;
  color: string;
}

export const AirInstruments3D: React.FC = () => {
  const { camera } = useThree();
  const isAirInstrumentsActive = usePlayerStore((s) => s.isAirInstrumentsActive);
  const airInstrumentType = usePlayerStore((s) => s.airInstrumentType);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);

  const activeAccent = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#00e5ff';

  // Refs de escena
  const groupRef = useRef<THREE.Group>(null);
  const keysGroupRef = useRef<THREE.Group>(null);
  const drumsGroupRef = useRef<THREE.Group>(null);
  const padsGroupRef = useRef<THREE.Group>(null);
  const thereminOrbRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Estados visuales de las 7 teclas del sintetizador
  const keyStatesRef = useRef<KeyVisualState[]>(
    Array(7).fill({ pressAmount: 0, glowIntensity: 0 })
  );
  const [keyStates, setKeyStates] = useState<KeyVisualState[]>(() =>
    Array(7).fill({ pressAmount: 0, glowIntensity: 0 })
  );

  // Ondas de choque dinámicas
  const shockwavesRef = useRef<ShockwaveRing[]>([]);

  // Puntas de dedos proyectadas en espacio de mundo Three.js (hasta 2 manos, 10 dedos)
  const worldFingertipsRef = useRef<THREE.Vector3[]>(
    Array.from({ length: 10 }, () => new THREE.Vector3(0, -999, 0))
  );
  const tipMeshesRef = useRef<(THREE.Mesh | null)[]>([]);

  // Escala musical activa
  const scaleNotes = useMemo(() => {
    return SYNTH_SCALES.pentatonic_minor.notes.slice(0, 7);
  }, []);

  // Disposición ergonómica en arco de 7 teclas flotantes a 2.8m de la cámara
  const synthKeyLayout = useMemo(() => {
    const count = 7;
    const spacing = 0.46;
    const startX = -((count - 1) * spacing) / 2;
    const baseZ = -2.8;
    const baseY = -0.5;

    return scaleNotes.map((note, i) => {
      const x = startX + i * spacing;
      // Curvatura convexa natural
      const curveOffset = Math.sin((i / (count - 1)) * Math.PI) * 0.18;
      const z = baseZ + curveOffset;
      const y = baseY + curveOffset * 0.3;

      return {
        ...note,
        index: i,
        position: [x, y, z] as [number, number, number],
        bounds: {
          minX: x - 0.2,
          maxX: x + 0.2,
          minY: y - 0.45,
          maxY: y + 0.45,
          z,
        },
      };
    });
  }, [scaleNotes]);

  // Disposición de los 4 pads de percusión gestual
  const drumPads = useMemo(
    () => [
      { id: 'kick', name: 'KICK 808', pos: [-0.65, -0.75, -2.6] as [number, number, number], color: '#ff088a' },
      { id: 'snare', name: 'SNARE', pos: [0.65, -0.75, -2.6] as [number, number, number], color: '#00e5ff' },
      { id: 'hihat', name: 'HI-HAT', pos: [-0.65, 0.05, -2.6] as [number, number, number], color: '#ffbd00' },
      { id: 'clap', name: 'CLAP', pos: [0.65, 0.05, -2.6] as [number, number, number], color: '#34c759' },
    ],
    []
  );

  // Cuadrícula 4x4 de pads melódicos tipo Launchpad
  const gridPads = useMemo(() => {
    const pads = [];
    const size = 0.22;
    const gap = 0.06;
    const offset = ((4 - 1) * (size + gap)) / 2;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * (size + gap) - offset;
        const y = -(r * (size + gap) - offset) - 0.3;
        pads.push({
          id: r * 4 + c,
          noteIdx: (r * 4 + c) % scaleNotes.length,
          pos: [x, y, -2.65] as [number, number, number],
          size,
        });
      }
    }
    return pads;
  }, [scaleNotes]);

  // Sistema de partículas reactivas (200 puntos que gravitan hacia las manos)
  const particlePositions = useMemo(() => {
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = -2.5 + (Math.random() - 0.5) * 1.5;
    }
    return pos;
  }, []);

  // ── Frame Loop Principal (Three.js rAF) ────────────────────────────────────
  useFrame((_, delta) => {
    if (!isAirInstrumentsActive) return;

    const vision = SpatialVisionService.getInstance();
    const audioEngine = AirInstrumentsAudioEngine.getInstance();
    const perspCamera = camera as THREE.PerspectiveCamera;

    // 1. Obtener manos y proyectar fingertips al espacio 3D
    let handCount = 0;

    // Proyección con cero allocations
    const hands = (vision as any).previousHands || [];
    if (hands.length > 0) {
      hands.forEach((hand: any, hIdx: number) => {
        const tipLandmark = hand.landmarks[8]; // Punta del índice
        if (tipLandmark) {
          projectLandmarkToWorld(tipLandmark, perspCamera, 2.8, _targetVec);
          const worldPos = worldFingertipsRef.current[hIdx * 5];
          if (worldPos) {
            worldPos.copy(_targetVec);

            // Actualizar visualizador de punta de dedo
            const tipMesh = tipMeshesRef.current[hIdx];
            if (tipMesh) {
              tipMesh.visible = true;
              tipMesh.position.copy(worldPos);
            }
          }
        }
        handCount++;
      });
    }

    const primaryTip: THREE.Vector3 | null = handCount > 0 ? worldFingertipsRef.current[0] : null;

    // Ocultar mallas de dedos no detectados
    for (let i = handCount; i < 2; i++) {
      if (tipMeshesRef.current[i]) {
        tipMeshesRef.current[i]!.visible = false;
      }
    }

    // 2. Lógica de Colisión según el Instrumento Activo
    if (airInstrumentType === 'synth' && primaryTip) {
      synthKeyLayout.forEach((key, idx) => {
        const b = key.bounds;
        // Colisión en caja AABB
        if (
          primaryTip.x >= b.minX &&
          primaryTip.x <= b.maxX &&
          primaryTip.y >= b.minY &&
          primaryTip.y <= b.maxY
        ) {
          // Si entra al plano de la tecla
          if (keyStatesRef.current[idx].pressAmount < 0.1) {
            audioEngine.triggerNoteOn(idx, 0.9);
            keyStatesRef.current[idx].pressAmount = 1.0;
            keyStatesRef.current[idx].glowIntensity = 1.0;

            // Generar onda de choque
            shockwavesRef.current.push({
              x: key.position[0],
              y: key.position[1],
              z: key.position[2],
              scale: 0.1,
              alpha: 1.0,
              color: activeAccent,
            });
          }
        } else {
          if (keyStatesRef.current[idx].pressAmount > 0.5) {
            audioEngine.triggerNoteOff(idx);
          }
        }
      });
    } else if (airInstrumentType === 'drums' && primaryTip) {
      drumPads.forEach((pad) => {
        const dist = Math.hypot(primaryTip.x - pad.pos[0], primaryTip.y - pad.pos[1]);
        if (dist < 0.28) {
          audioEngine.triggerDrum(pad.id as any, 0.95);
          shockwavesRef.current.push({
            x: pad.pos[0],
            y: pad.pos[1],
            z: pad.pos[2],
            scale: 0.1,
            alpha: 1.0,
            color: pad.color,
          });
        }
      });
    } else if (airInstrumentType === 'theremin') {
      if (primaryTip) {
        audioEngine.startTheremin();
        const normX = Math.max(0, Math.min(1, (primaryTip.x + 1.5) / 3.0));
        const normY = Math.max(0, Math.min(1, (primaryTip.y + 1.0) / 2.0));
        audioEngine.updateTheremin(normX, normY, primaryTip.z);

        if (thereminOrbRef.current) {
          thereminOrbRef.current.visible = true;
          thereminOrbRef.current.position.copy(primaryTip);
        }
      } else {
        audioEngine.stopTheremin();
        if (thereminOrbRef.current) {
          thereminOrbRef.current.visible = false;
        }
      }
    }

    // 3. Desvanecimiento suave de estados visuales de teclas
    const decay = Math.min(1.0, delta * 8);
    for (let i = 0; i < 7; i++) {
      const state = keyStatesRef.current[i];
      if (state.pressAmount > 0.01) {
        state.pressAmount = Math.max(0, state.pressAmount - decay);
        state.glowIntensity = Math.max(0, state.glowIntensity - decay * 0.8);
      }
    }

    // 4. Animar Ondas de Choque
    for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
      const sw = shockwavesRef.current[i];
      sw.scale += delta * 3.5;
      sw.alpha -= delta * 2.2;
      if (sw.alpha <= 0) {
        shockwavesRef.current.splice(i, 1);
      }
    }
  });

  if (!isAirInstrumentsActive) return null;

  return (
    <group ref={groupRef}>
      {/* ── 1. Sintetizador 3D (Arco de 7 Teclas Liquid Glass) ── */}
      {airInstrumentType === 'synth' && (
        <group ref={keysGroupRef}>
          {synthKeyLayout.map((key, idx) => {
            const visual = keyStatesRef.current[idx];
            return (
              <group key={key.name} position={key.position}>
                {/* Cuerpo de la tecla: MeshPhysicalMaterial con transmisión de cristal */}
                <mesh
                  position={[0, -visual.pressAmount * 0.08, 0]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[0.38, 1.1, 0.12]} />
                  <meshPhysicalMaterial
                    color={visual.glowIntensity > 0.2 ? activeAccent : '#ffffff'}
                    transmission={0.88}
                    roughness={0.15}
                    metalness={0.1}
                    thickness={0.6}
                    ior={1.4}
                    transparent
                    opacity={0.85}
                    emissive={visual.glowIntensity > 0.2 ? activeAccent : '#000000'}
                    emissiveIntensity={visual.glowIntensity * 1.5}
                  />
                </mesh>

                {/* Etiqueta de la nota musical */}
                <Text
                  position={[0, -0.42, 0.08]}
                  fontSize={0.09}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                >
                  {key.name}
                </Text>
              </group>
            );
          })}
        </group>
      )}

      {/* ── 2. Batería Gestual (4 Pads Emisivos de Estudio) ── */}
      {airInstrumentType === 'drums' && (
        <group ref={drumsGroupRef}>
          {drumPads.map((pad) => (
            <group key={pad.id} position={pad.pos}>
              <mesh>
                <cylinderGeometry args={[0.26, 0.26, 0.06, 32]} />
                <meshPhysicalMaterial
                  color={pad.color}
                  emissive={pad.color}
                  emissiveIntensity={0.5}
                  transmission={0.7}
                  roughness={0.2}
                  transparent
                  opacity={0.85}
                />
              </mesh>
              <Text
                position={[0, 0, 0.06]}
                fontSize={0.08}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {pad.name}
              </Text>
            </group>
          ))}
        </group>
      )}

      {/* ── 3. Theremin Espacial (Orbe Resonante) ── */}
      {airInstrumentType === 'theremin' && (
        <mesh ref={thereminOrbRef} visible={false}>
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshBasicMaterial color={activeAccent} wireframe transparent opacity={0.85} />
        </mesh>
      )}

      {/* ── 4. Indicadores de Puntas de Dedos ── */}
      {[0, 1].map((idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            tipMeshesRef.current[idx] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={activeAccent} />
        </mesh>
      ))}

      {/* ── 5. Ondas de Choque Expansivas ── */}
      {shockwavesRef.current.map((sw, i) => (
        <mesh key={i} position={[sw.x, sw.y, sw.z]}>
          <ringGeometry args={[sw.scale * 0.8, sw.scale, 32]} />
          <meshBasicMaterial
            color={sw.color}
            transparent
            opacity={sw.alpha}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

export default AirInstruments3D;
