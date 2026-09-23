import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpatialManipulator } from './SpatialManipulator';
import { SpatialState } from '../state/SpatialState';

/**
 * SpatialInteractiveObjects — Capa de objetos 3D interactivos en el espacio Aura.
 *
 * Cumple con los Sprints 2, 3, 4 y 5 de DESING_DECAMARA.md:
 * - Hover / Tocar (cambio de color, micro-vibración, feedback sonoro)
 * - Agarrar (Pinch con máquina de estados)
 * - Mover y Rotar (quaternion slerp con orientación de muñeca)
 * - Escalar con dos manos (pinch a 2 manos)
 * - Soltar con inercia física natural (damping 0.92)
 */
export const SpatialInteractiveObjects: React.FC = () => {
  // 1. Instancias de manipulación física separadas por objeto
  const cubeManipulator = useMemo(
    () => new SpatialManipulator(new THREE.Vector3(-0.9, 0.45, -2.6)),
    []
  );

  const orbManipulator = useMemo(
    () => new SpatialManipulator(new THREE.Vector3(0.9, 0.45, -2.6)),
    []
  );

  const prismManipulator = useMemo(
    () => new SpatialManipulator(new THREE.Vector3(0.0, 0.85, -2.8)),
    []
  );

  // Refs de mallas en la escena
  const cubeGroupRef = useRef<THREE.Group>(null);
  const cubeInnerMeshRef = useRef<THREE.Mesh>(null);
  const cubeOuterMeshRef = useRef<THREE.Mesh>(null);

  const orbGroupRef = useRef<THREE.Group>(null);
  const orbInnerMeshRef = useRef<THREE.Mesh>(null);

  const prismGroupRef = useRef<THREE.Group>(null);
  const prismMeshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const spatialState = SpatialState.getInstance();
    const domHand = spatialState.getDominantHand();
    const cursorPoint = domHand.isPresent && domHand.confidenceTier !== 'untrusted'
      ? domHand.worldIndexTip
      : null;

    // Actualizar físicas e inercia de cada objeto
    cubeManipulator.update(delta, cursorPoint);
    orbManipulator.update(delta, cursorPoint);
    prismManipulator.update(delta, cursorPoint);

    // ── 1. Sincronizar Hipercubo Cristalino ─────────────────────────────
    if (cubeGroupRef.current) {
      cubeGroupRef.current.position.copy(cubeManipulator.position);
      cubeGroupRef.current.quaternion.copy(cubeManipulator.quaternion);
      cubeGroupRef.current.scale.copy(cubeManipulator.scale);

      // Rotación autónoma leve en reposo
      if (!cubeManipulator.isGrabbed) {
        cubeGroupRef.current.rotation.x += delta * 0.4;
        cubeGroupRef.current.rotation.y += delta * 0.6;
      }

      // Feedback visual reactivo (Hover y Grab)
      if (cubeOuterMeshRef.current) {
        const mat = cubeOuterMeshRef.current.material as THREE.MeshPhysicalMaterial;
        const hover = cubeManipulator.hoverAmount;
        const grab = cubeManipulator.grabEnergy;

        mat.emissive.set(grab > 0.1 ? '#ff088a' : hover > 0.1 ? '#00e5ff' : '#002b4d');
        mat.emissiveIntensity = 0.2 + hover * 0.8 + grab * 1.5;
        mat.roughness = 0.2 - hover * 0.15;
      }
    }

    // ── 2. Sincronizar Orbe Sonoro Reactivo ─────────────────────────────
    if (orbGroupRef.current) {
      orbGroupRef.current.position.copy(orbManipulator.position);
      orbGroupRef.current.quaternion.copy(orbManipulator.quaternion);
      orbGroupRef.current.scale.copy(orbManipulator.scale);

      if (!orbManipulator.isGrabbed) {
        orbGroupRef.current.rotation.y -= delta * 0.5;
      }

      if (orbInnerMeshRef.current) {
        const mat = orbInnerMeshRef.current.material as THREE.MeshPhysicalMaterial;
        const hover = orbManipulator.hoverAmount;
        const grab = orbManipulator.grabEnergy;

        mat.emissive.set(grab > 0.1 ? '#ffbd00' : hover > 0.1 ? '#ff088a' : '#4d003b');
        mat.emissiveIntensity = 0.3 + hover * 1.0 + grab * 1.8;
      }
    }

    // ── 3. Sincronizar Prisma Armónico Flotante ────────────────────────
    if (prismGroupRef.current) {
      prismGroupRef.current.position.copy(prismManipulator.position);
      prismGroupRef.current.quaternion.copy(prismManipulator.quaternion);
      prismGroupRef.current.scale.copy(prismManipulator.scale);

      if (!prismManipulator.isGrabbed) {
        prismGroupRef.current.rotation.z += delta * 0.4;
      }

      if (prismMeshRef.current) {
        const mat = prismMeshRef.current.material as THREE.MeshPhysicalMaterial;
        const hover = prismManipulator.hoverAmount;
        const grab = prismManipulator.grabEnergy;

        mat.emissive.set(grab > 0.1 ? '#34c759' : hover > 0.1 ? '#00e5ff' : '#003322');
        mat.emissiveIntensity = 0.2 + hover * 0.9 + grab * 1.4;
      }
    }
  });

  return (
    <group>
      {/* ── OBJETO 1: Hipercubo Cristalino (Cyan / Magenta) ── */}
      <group ref={cubeGroupRef} position={[-0.9, 0.45, -2.6]}>
        {/* Cuerpo exterior translúcido */}
        <mesh ref={cubeOuterMeshRef} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.34, 0.34]} />
          <meshPhysicalMaterial
            color="#00e5ff"
            transmission={0.85}
            thickness={0.5}
            roughness={0.15}
            metalness={0.1}
            transparent
            opacity={0.88}
            emissive="#002b4d"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Núcleo interno wireframe rotatorio */}
        <mesh ref={cubeInnerMeshRef}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.65} />
        </mesh>
      </group>

      {/* ── OBJETO 2: Orbe Sonoro Reactivo (Ámbar / Magenta) ── */}
      <group ref={orbGroupRef} position={[0.9, 0.45, -2.6]}>
        <mesh ref={orbInnerMeshRef} castShadow receiveShadow>
          <icosahedronGeometry args={[0.22, 2]} />
          <meshPhysicalMaterial
            color="#ff088a"
            transmission={0.8}
            roughness={0.12}
            metalness={0.2}
            transparent
            opacity={0.85}
            emissive="#4d003b"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Malla exterior de halo de energía */}
        <mesh scale={[1.18, 1.18, 1.18]}>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshBasicMaterial color="#ffbd00" wireframe transparent opacity={0.4} />
        </mesh>
      </group>

      {/* ── OBJETO 3: Prisma Armónico (Esmeralda / Cian) ── */}
      <group ref={prismGroupRef} position={[0.0, 0.85, -2.8]}>
        <mesh ref={prismMeshRef} castShadow receiveShadow>
          <octahedronGeometry args={[0.24, 0]} />
          <meshPhysicalMaterial
            color="#34c759"
            transmission={0.78}
            roughness={0.18}
            metalness={0.15}
            transparent
            opacity={0.85}
            emissive="#003322"
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>
    </group>
  );
};
