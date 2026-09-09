import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { airSynth, SYNTH_SCALES, DRUM_PADS } from '../../services/airSynthEngine';
import { fingertipTracker, type FingertipPoint } from '../../services/fingertipTracker';

// ── Synth Key Configuration ──
interface Key3DState {
  pressAmount: number; // 0 to 1
  glowIntensity: number; // 0 to 1
}

// ── Drum Pad Configuration ──
interface DrumPadState {
  hitAmount: number;
  glowIntensity: number;
}

export const AirInstruments3D: React.FC = () => {
  const isAirInstrumentsActive = usePlayerStore((s) => s.isAirInstrumentsActive);
  const airInstrumentType = usePlayerStore((s) => s.airInstrumentType);
  const airSynthScale = usePlayerStore((s) => s.airSynthScale);
  const handLandmarks = usePlayerStore((s) => s.handLandmarks);
  const multiHandLandmarks = usePlayerStore((s) => s.multiHandLandmarks);
  const setLastTriggeredNote = usePlayerStore((s) => s.setLastTriggeredNote);

  // Group references
  const groupRef = useRef<THREE.Group>(null);
  const synthKeysRef = useRef<THREE.Group>(null);
  const drumKitRef = useRef<THREE.Group>(null);
  const thereminRef = useRef<THREE.Group>(null);

  // Fingertip visual indicator meshes (up to 10 fingers: 5 per hand)
  const tipMeshesRef = useRef<(THREE.Mesh | null)[]>([]);

  // Key visual states for animations
  const [keyStates, setKeyStates] = useState<Key3DState[]>(() =>
    Array(8).fill({ pressAmount: 0, glowIntensity: 0 })
  );
  const keyStatesRef = useRef<Key3DState[]>(
    Array(8).fill({ pressAmount: 0, glowIntensity: 0 })
  );

  // Drum visual states
  const [drumStates, setDrumStates] = useState<DrumPadState[]>(() =>
    Array(DRUM_PADS.length).fill({ hitAmount: 0, glowIntensity: 0 })
  );
  const drumStatesRef = useRef<DrumPadState[]>(
    Array(DRUM_PADS.length).fill({ hitAmount: 0, glowIntensity: 0 })
  );

  // Theremin indicator ref
  const thereminOrbRef = useRef<THREE.Mesh>(null);
  const thereminBeamRef = useRef<THREE.Mesh>(null);

  // Current active scale notes
  const currentNotes = useMemo(() => {
    return SYNTH_SCALES[airSynthScale]?.notes || SYNTH_SCALES.pentatonic_minor.notes;
  }, [airSynthScale]);

  // 3D Key positions (centered arc)
  const synthKeyLayout = useMemo(() => {
    const count = 8;
    const spacing = 0.52;
    const startX = -((count - 1) * spacing) / 2;
    const baseZ = 2.9;
    const baseY = -1.1;

    return currentNotes.slice(0, count).map((note, i) => {
      const x = startX + i * spacing;
      // Slight ergonomic concave curve
      const curveOffset = Math.sin((i / (count - 1)) * Math.PI) * 0.15;
      const z = baseZ - curveOffset;
      const y = baseY + curveOffset * 0.5;

      return {
        ...note,
        index: i,
        position: [x, y, z] as [number, number, number],
        bounds: {
          x,
          y,
          z,
          width: 0.48,
          height: 1.3,
          depth: 0.25,
        },
      };
    });
  }, [currentNotes]);

  // 3D Drum Pad positions (ergonomic arc)
  const drumPadLayout = useMemo(() => {
    // 6 drum pads in a dual arc
    const layout = [
      { id: 'snare', x: -1.05, y: -0.9, z: 2.85, radius: 0.36 },
      { id: 'kick', x: 0.0, y: -1.2, z: 2.75, radius: 0.42 },
      { id: 'tom', x: 1.05, y: -0.9, z: 2.85, radius: 0.36 },
      { id: 'hihat', x: -1.7, y: -0.55, z: 3.0, radius: 0.32 },
      { id: 'crash', x: 0.0, y: -0.4, z: 3.15, radius: 0.38 },
      { id: 'clap', x: 1.7, y: -0.55, z: 3.0, radius: 0.32 },
    ];

    return DRUM_PADS.map((pad) => {
      const cfg = layout.find((l) => l.id === pad.id) || {
        x: 0,
        y: 0,
        z: 2.8,
        radius: 0.35,
      };
      return {
        ...pad,
        position: [cfg.x, cfg.y, cfg.z] as [number, number, number],
        radius: cfg.radius,
        bounds: {
          x: cfg.x,
          y: cfg.y,
          z: cfg.z,
          width: cfg.radius * 2,
          height: cfg.radius * 2,
          depth: 0.3,
        },
      };
    });
  }, []);

  // Handler to trigger synth note (shared by hand strike and direct click)
  const triggerKeyStrike = (index: number, velocity = 0.8) => {
    const note = currentNotes[index];
    if (!note) return;

    airSynth.setScale(airSynthScale);
    airSynth.triggerNote(index, velocity);
    setLastTriggeredNote(note.name);

    // Set visual hit
    keyStatesRef.current[index] = {
      pressAmount: 1.0,
      glowIntensity: 1.0,
    };
  };

  // Handler to trigger drum strike (shared by hand strike and direct click)
  const triggerDrumStrike = (index: number, velocity = 0.85) => {
    const pad = DRUM_PADS[index];
    if (!pad) return;

    airSynth.triggerDrum(pad.id, velocity);
    setLastTriggeredNote(pad.name);

    drumStatesRef.current[index] = {
      hitAmount: 1.0,
      glowIntensity: 1.0,
    };
  };

  // Frame Loop: Hand collision checks and visual lerps
  useFrame((_, delta) => {
    if (!isAirInstrumentsActive) return;

    // 1. Process Fingertip Tracking
    const tips: FingertipPoint[] = fingertipTracker.extractFingertips(
      handLandmarks,
      multiHandLandmarks
    );

    // Update 3D Tip spheres
    for (let i = 0; i < 10; i++) {
      const mesh = tipMeshesRef.current[i];
      if (!mesh) continue;

      const tip = tips[i];
      if (tip) {
        mesh.visible = true;
        mesh.position.set(tip.x3d, tip.y3d, tip.z3d);

        // Scale up slightly on strike
        const targetScale = tip.isStriking ? 1.4 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.3);

        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.color.set(tip.handIndex === 0 ? '#00f2fe' : '#ff088a');
        }
      } else {
        mesh.visible = false;
      }
    }

    // 2. Collision and Strike Handling by Instrument
    if (airInstrumentType === 'synth') {
      tips.forEach((tip) => {
        if (!tip.isStriking) return;

        synthKeyLayout.forEach((key, kIdx) => {
          if (fingertipTracker.check3DCollision(tip, key.bounds)) {
            triggerKeyStrike(kIdx, tip.velocity);
          }
        });
      });
    } else if (airInstrumentType === 'drums') {
      tips.forEach((tip) => {
        if (!tip.isStriking) return;

        drumPadLayout.forEach((drum, dIdx) => {
          if (fingertipTracker.check3DCollision(tip, drum.bounds)) {
            triggerDrumStrike(dIdx, tip.velocity);
          }
        });
      });
    } else if (airInstrumentType === 'theremin') {
      // Index finger of first detected hand controls pitch & volume
      const indexTip = tips.find((t) => t.name === 'index');
      if (indexTip) {
        // Map X (-2.5 to +2.5) to normalized cutoff/timbre
        const normX = Math.max(0, Math.min(1, (indexTip.x3d + 2.5) / 5.0));

        // Map Y (-1.5 to +1.5) to normalized Y (0.0 to 1.0)
        const normY = Math.max(0, Math.min(1, 1 - (indexTip.y3d + 1.5) / 3.0));
        const freq = 150 + (1 - normY) * 1050;

        airSynth.setThereminState(true, normY, normX);
        setLastTriggeredNote(`${Math.round(freq)} Hz`);

        if (thereminOrbRef.current) {
          thereminOrbRef.current.position.set(indexTip.x3d, indexTip.y3d, indexTip.z3d);
          thereminOrbRef.current.visible = true;
        }
      } else {
        airSynth.setThereminState(false);
        if (thereminOrbRef.current) {
          thereminOrbRef.current.visible = false;
        }
      }
    }

    // 3. Smoothly Lerp Key States back to rest
    let needsKeyUpdate = false;
    const decayRate = Math.min(1.0, delta * 12);

    for (let i = 0; i < 8; i++) {
      const cur = keyStatesRef.current[i];
      if (cur.pressAmount > 0.01 || cur.glowIntensity > 0.01) {
        cur.pressAmount = Math.max(0, cur.pressAmount - decayRate);
        cur.glowIntensity = Math.max(0, cur.glowIntensity - decayRate * 0.8);
        needsKeyUpdate = true;
      }
    }
    if (needsKeyUpdate) {
      setKeyStates([...keyStatesRef.current]);
    }

    // 4. Smoothly Lerp Drum States back to rest
    let needsDrumUpdate = false;
    for (let i = 0; i < DRUM_PADS.length; i++) {
      const cur = drumStatesRef.current[i];
      if (cur.hitAmount > 0.01 || cur.glowIntensity > 0.01) {
        cur.hitAmount = Math.max(0, cur.hitAmount - decayRate * 1.2);
        cur.glowIntensity = Math.max(0, cur.glowIntensity - decayRate * 0.7);
        needsDrumUpdate = true;
      }
    }
    if (needsDrumUpdate) {
      setDrumStates([...drumStatesRef.current]);
    }
  });

  if (!isAirInstrumentsActive) return null;

  return (
    <group ref={groupRef}>
      {/* ── Fingertip Indicator Spheres (10 Pointers) ── */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={`tip-${i}`}
          ref={(el) => {
            tipMeshesRef.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color="#00f2fe" transparent opacity={0.85} />
        </mesh>
      ))}

      {/* ── Instrument 1: 3D Quantum Synth / Aerial Piano ── */}
      {airInstrumentType === 'synth' && (
        <group ref={synthKeysRef}>
          {synthKeyLayout.map((key, i) => {
            const state = keyStates[i] || { pressAmount: 0, glowIntensity: 0 };
            const pressedY = key.position[1] - state.pressAmount * 0.12;
            const glow = state.glowIntensity;

            return (
              <group
                key={`synth-key-${key.name}-${i}`}
                position={[key.position[0], pressedY, key.position[2]]}
                rotation={[0.32, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerKeyStrike(i, 0.85);
                }}
              >
                {/* 3D Glass Key Mesh */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.46, 1.35, 0.16]} />
                  <meshStandardMaterial
                    color={glow > 0.1 ? '#00f2fe' : '#0e1628'}
                    emissive={glow > 0.1 ? '#00f2fe' : '#031024'}
                    emissiveIntensity={0.2 + glow * 2.8}
                    roughness={0.15}
                    metalness={0.85}
                    transparent
                    opacity={0.88}
                  />
                </mesh>

                {/* Neon Top Edge Accent */}
                <mesh position={[0, 0.65, 0.08]}>
                  <boxGeometry args={[0.44, 0.04, 0.02]} />
                  <meshBasicMaterial
                    color={glow > 0.1 ? '#ffffff' : '#38bdf8'}
                    transparent
                    opacity={0.9}
                  />
                </mesh>

                {/* 3D Holographic Note Badge */}
                <Text
                  position={[0, -0.4, 0.1]}
                  fontSize={0.16}
                  color={glow > 0.1 ? '#ffffff' : '#94a3b8'}
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.015}
                  outlineColor="#000000"
                >
                  {key.name}
                </Text>
              </group>
            );
          })}
        </group>
      )}

      {/* ── Instrument 2: 3D Cyber Drum Kit ── */}
      {airInstrumentType === 'drums' && (
        <group ref={drumKitRef}>
          {drumPadLayout.map((drum, i) => {
            const state = drumStates[i] || { hitAmount: 0, glowIntensity: 0 };
            const pressedY = drum.position[1] - state.hitAmount * 0.14;
            const glow = state.glowIntensity;

            return (
              <group
                key={`drum-pad-${drum.id}`}
                position={[drum.position[0], pressedY, drum.position[2]]}
                rotation={[0.4, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerDrumStrike(i, 0.9);
                }}
              >
                {/* Main Cylindrical Drum Pad */}
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[drum.radius, drum.radius * 0.95, 0.14, 32]} />
                  <meshStandardMaterial
                    color={glow > 0.1 ? drum.color : '#0f172a'}
                    emissive={drum.color}
                    emissiveIntensity={0.25 + glow * 3.2}
                    roughness={0.2}
                    metalness={0.8}
                    transparent
                    opacity={0.92}
                  />
                </mesh>

                {/* Holographic Glowing Ring */}
                <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[drum.radius * 0.72, drum.radius * 0.86, 32]} />
                  <meshBasicMaterial
                    color={glow > 0.1 ? '#ffffff' : drum.color}
                    transparent
                    opacity={0.85}
                  />
                </mesh>

                {/* Pad Label */}
                <Text
                  position={[0, 0.1, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.12}
                  color={glow > 0.1 ? '#ffffff' : '#e2e8f0'}
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.015}
                  outlineColor="#000000"
                >
                  {drum.name}
                </Text>
              </group>
            );
          })}
        </group>
      )}

      {/* ── Instrument 3: Laser Ribbon / Theremin ── */}
      {airInstrumentType === 'theremin' && (
        <group ref={thereminRef}>
          {/* Horizontal Pitch Ribbon Beam */}
          <mesh ref={thereminBeamRef} position={[0, -0.9, 2.8]}>
            <boxGeometry args={[5.0, 0.05, 0.05]} />
            <meshBasicMaterial color="#39FF14" transparent opacity={0.65} />
          </mesh>

          {/* Vertical Amplitude Beam */}
          <mesh position={[0, 0, 2.8]}>
            <boxGeometry args={[0.05, 3.2, 0.05]} />
            <meshBasicMaterial color="#00f2fe" transparent opacity={0.4} />
          </mesh>

          {/* Dynamic Laser Orb following finger */}
          <mesh ref={thereminOrbRef} visible={false}>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshBasicMaterial color="#39FF14" transparent opacity={0.9} />
          </mesh>

          {/* Guide Text */}
          <Text
            position={[0, -1.25, 2.8]}
            fontSize={0.16}
            color="#39FF14"
            anchorX="center"
            anchorY="middle"
          >
            ← FRECUENCIA / PITCH → (Eje Horizontal)
          </Text>
        </group>
      )}
    </group>
  );
};

export default AirInstruments3D;
