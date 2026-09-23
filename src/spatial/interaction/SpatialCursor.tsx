import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpatialState } from '../state/SpatialState';

// Vectores temporales para orientación del rayo (Zero GC)
const _dirVec = new THREE.Vector3();
const _midVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

interface SpatialCursorProps {
  accentColor?: string;
}

/**
 * SpatialCursor — Cursor 3D y Rayo de Energía proyectado desde la punta del dedo índice.
 *
 * Especificación de Sprint 2 (Señalar) de DESING_DECAMARA.md:
 * - Finger cursor
 * - 3D ray / projection
 * - Visualización reactiva según el estado de la mano (Idle, Pointing, Pinching)
 */
export const SpatialCursor: React.FC<SpatialCursorProps> = ({
  accentColor = '#00e5ff',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const rayMeshRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  const shockwaveScale = useRef(0);
  const shockwaveAlpha = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const spatialState = SpatialState.getInstance();
    const domHand = spatialState.getDominantHand();

    // Si la mano no está visible o no es confiable, ocultar cursor
    if (!domHand.isPresent || domHand.confidenceTier === 'untrusted') {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Posición del cursor en la punta del dedo índice
    const tipPos = domHand.worldIndexTip;
    groupRef.current.position.copy(tipPos);

    // Orientación del rayo proyectado hacia adelante a lo largo del dedo
    _dirVec.subVectors(tipPos, domHand.worldWrist).normalize();

    // Rotación del anillo
    if (ringMeshRef.current) {
      ringMeshRef.current.rotation.z += delta * 2.5;
      ringMeshRef.current.rotation.x = Math.sin(performance.now() * 0.003) * 0.3;
    }

    // Adaptación visual según el estado del pellizco y gesto
    const isPinching = domHand.pinchState === 'PINCH_HOLD' || domHand.pinchState === 'PINCH_MOVE';
    const isGrabIntent = domHand.pinchState === 'PINCH_START';

    let targetColor = accentColor;
    let coreScale = 1.0;

    if (isPinching) {
      targetColor = '#ff088a'; // Magenta activo de agarre
      coreScale = 1.4 + Math.sin(performance.now() * 0.02) * 0.2;
    } else if (isGrabIntent) {
      targetColor = '#ffbd00'; // Ámbar de intención
      coreScale = 0.8;
    } else if (domHand.isPointing) {
      targetColor = '#00e5ff'; // Cian láser
      coreScale = 1.1;
    }

    if (coreMeshRef.current) {
      const mat = coreMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(targetColor);
      coreMeshRef.current.scale.setScalar(coreScale);
    }

    if (ringMeshRef.current) {
      const mat = ringMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(targetColor);
    }

    // Configuración del rayo láser (proyección hacia el infinito relativo ~1.8m adelante)
    if (rayMeshRef.current) {
      const rayLength = domHand.isPointing || isPinching ? 1.4 : 0.6;
      rayMeshRef.current.scale.set(1, rayLength, 1);

      // Calcular punto medio y orientación del cilindro
      _midVec.copy(_dirVec).multiplyScalar(rayLength * 0.5);
      rayMeshRef.current.position.copy(_midVec);

      _quat.setFromUnitVectors(_upVec, _dirVec);
      rayMeshRef.current.quaternion.copy(_quat);

      const rayMat = rayMeshRef.current.material as THREE.MeshBasicMaterial;
      rayMat.color.set(targetColor);
      rayMat.opacity = domHand.isPointing ? 0.65 : isPinching ? 0.85 : 0.25;
    }

    // Disparar shockwave si se liberó el pellizco
    if (domHand.pinchState === 'PINCH_END') {
      shockwaveScale.current = 0.05;
      shockwaveAlpha.current = 1.0;
    }

    // Animación de shockwave
    if (shockwaveRef.current && shockwaveAlpha.current > 0.01) {
      shockwaveRef.current.visible = true;
      shockwaveScale.current += delta * 2.8;
      shockwaveAlpha.current -= delta * 3.5;
      shockwaveRef.current.scale.setScalar(shockwaveScale.current);
      const swMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      swMat.opacity = Math.max(0, shockwaveAlpha.current);
    } else if (shockwaveRef.current) {
      shockwaveRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* 1. Núcleo central luminoso */}
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.95} />
      </mesh>

      {/* 2. Anillo reticular orbital */}
      <mesh ref={ringMeshRef}>
        <torusGeometry args={[0.045, 0.004, 12, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.8} />
      </mesh>

      {/* 3. Rayo de Energía Láser Proyectado */}
      <mesh ref={rayMeshRef}>
        <cylinderGeometry args={[0.003, 0.006, 1.0, 12]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.4} />
      </mesh>

      {/* 4. Onda de choque expansiva al soltar */}
      <mesh ref={shockwaveRef} visible={false}>
        <ringGeometry args={[0.05, 0.065, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
