import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpatialAudioEngine } from '../audio/SpatialAudioEngine';
import { SpatialState } from '../state/SpatialState';

interface FxShockwave {
  position: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  maxScale: number;
  alpha: number;
  speed: number;
  active: boolean;
}

interface FxSparkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  alpha: number;
  size: number;
  life: number;
  active: boolean;
}

const MAX_FX_RINGS = 8;
const MAX_FX_SPARKS = 48;

/**
 * SpatialInteractionFx — Capa visual reactiva al audio de los instrumentos (Sprint 7).
 *
 * Principio rector:
 * "La canción controla el universo. El instrumento controla una capa encima. Nunca al revés."
 *
 * Escucha el InstrumentAnalyser dedicado y emite:
 * 1. Ondas de choque lumínicas (shockwaves) orientadas en el espacio 3D.
 * 2. Halo de partículas / chispas tonales aditivas disparadas por el ataque de cada nota.
 * Zero GC: Vectores e instancias Float32 pre-reservadas.
 */
export const SpatialInteractionFx: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const ringMeshesRef = useRef<(THREE.Mesh | null)[]>([]);
  const sparkPointsRef = useRef<THREE.Points>(null);

  // Pool de ondas de choque reutilizables (Zero GC)
  const shockwavesRef = useRef<FxShockwave[]>(
    Array.from({ length: MAX_FX_RINGS }, () => ({
      position: new THREE.Vector3(0, -999, 0),
      color: new THREE.Color('#00e5ff'),
      scale: 0.1,
      maxScale: 2.2,
      alpha: 0,
      speed: 3.2,
      active: false,
    }))
  );

  // Pool de partículas/chispas de impacto tonal
  const sparksRef = useRef<FxSparkParticle[]>(
    Array.from({ length: MAX_FX_SPARKS }, () => ({
      position: new THREE.Vector3(0, -999, 0),
      velocity: new THREE.Vector3(),
      color: new THREE.Color('#00e5ff'),
      alpha: 0,
      size: 0.04,
      life: 0,
      active: false,
    }))
  );

  // Buffer continuo de posiciones y colores para THREE.Points (Zero GC)
  const sparkPositions = useMemo(() => new Float32Array(MAX_FX_SPARKS * 3), []);
  const sparkColors = useMemo(() => new Float32Array(MAX_FX_SPARKS * 3), []);

  useEffect(() => {
    const spatialAudio = SpatialAudioEngine.getInstance();
    const analyser = spatialAudio.getInstrumentAnalyser();

    if (!analyser) return;

    // Suscribir al detector de onset del analizador de instrumentos
    const unsubscribe = analyser.onTrigger((event) => {
      const spatialState = SpatialState.getInstance();
      const domHand = spatialState.getDominantHand();
      const spawnPos = domHand.isPresent ? domHand.worldIndexTip : new THREE.Vector3(0, 0.4, -2.6);

      // Color tonal según el registro del ataque (graves = magenta, medios = ámbar, agudos = cian)
      const targetColor = new THREE.Color(
        event.peakFrequency < 300
          ? '#ff088a'
          : event.peakFrequency < 800
          ? '#ffbd00'
          : '#00e5ff'
      );

      // 1. Emitir onda de choque
      const freeSlot = shockwavesRef.current.find((s) => !s.active);
      if (freeSlot) {
        freeSlot.position.copy(spawnPos);
        freeSlot.scale = 0.08;
        freeSlot.maxScale = 1.2 + event.intensity * 1.5;
        freeSlot.alpha = 0.95;
        freeSlot.speed = 2.4 + event.intensity * 2.0;
        freeSlot.color.copy(targetColor);
        freeSlot.active = true;
      }

      // 2. Emitir ráfaga de 6-8 micro-chispas tonales aditivas
      const sparkCount = Math.floor(6 + event.intensity * 6);
      let spawned = 0;
      for (const spark of sparksRef.current) {
        if (!spark.active && spawned < sparkCount) {
          spark.position.copy(spawnPos);
          const theta = Math.random() * Math.PI * 2;
          const phi = (Math.random() - 0.5) * Math.PI;
          const speed = 0.8 + Math.random() * 1.4;

          spark.velocity.set(
            Math.cos(theta) * Math.cos(phi) * speed,
            Math.sin(phi) * speed,
            Math.sin(theta) * Math.cos(phi) * speed
          );
          spark.color.copy(targetColor);
          spark.alpha = 1.0;
          spark.life = 0.6 + Math.random() * 0.4;
          spark.active = true;
          spawned++;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useFrame((_, delta) => {
    // 1. Actualizar el analizador de instrumentos para detección continua de picos
    const spatialAudio = SpatialAudioEngine.getInstance();
    spatialAudio.getInstrumentAnalyser()?.update();

    // 2. Animar anillos de choque en el pool
    shockwavesRef.current.forEach((sw, idx) => {
      const mesh = ringMeshesRef.current[idx];
      if (!mesh) return;

      if (sw.active && sw.alpha > 0.02) {
        sw.scale += delta * sw.speed;
        sw.alpha -= delta * 1.8;

        mesh.visible = true;
        mesh.position.copy(sw.position);
        mesh.scale.setScalar(sw.scale);

        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.copy(sw.color);
        mat.opacity = Math.max(0, sw.alpha);
      } else {
        sw.active = false;
        mesh.visible = false;
      }
    });

    // 3. Animar chispas tonales y actualizar buffers
    let hasActiveSparks = false;
    sparksRef.current.forEach((spark, idx) => {
      const pIdx = idx * 3;
      if (spark.active && spark.life > 0) {
        spark.life -= delta * 1.6;
        spark.alpha = Math.max(0, spark.life);
        spark.position.addScaledVector(spark.velocity, delta);
        spark.velocity.y -= delta * 0.9; // Ligera gravedad física

        sparkPositions[pIdx] = spark.position.x;
        sparkPositions[pIdx + 1] = spark.position.y;
        sparkPositions[pIdx + 2] = spark.position.z;

        sparkColors[pIdx] = spark.color.r * spark.alpha;
        sparkColors[pIdx + 1] = spark.color.g * spark.alpha;
        sparkColors[pIdx + 2] = spark.color.b * spark.alpha;

        hasActiveSparks = true;
      } else {
        spark.active = false;
        sparkPositions[pIdx] = 0;
        sparkPositions[pIdx + 1] = -999;
        sparkPositions[pIdx + 2] = 0;
        sparkColors[pIdx] = 0;
        sparkColors[pIdx + 1] = 0;
        sparkColors[pIdx + 2] = 0;
      }
    });

    if (sparkPointsRef.current) {
      const geom = sparkPointsRef.current.geometry;
      geom.attributes.position.needsUpdate = true;
      geom.attributes.color.needsUpdate = true;
      sparkPointsRef.current.visible = hasActiveSparks;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Pool de Ondas de Choque (Rings) */}
      {shockwavesRef.current.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            ringMeshesRef.current[idx] = el;
          }}
          visible={false}
        >
          <ringGeometry args={[0.2, 0.26, 32]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Pool de Chispas Tonales (Points) */}
      <points ref={sparkPointsRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparkPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[sparkColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
