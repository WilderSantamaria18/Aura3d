import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CalibrationEngine } from './CalibrationEngine';

/**
 * CalibrationVisuals3D — Elementos visuales 3D durante la fase de calibración de esquinas.
 *
 * Muestra los 4 objetivos flotantes que el usuario debe tocar con la punta de su dedo.
 */
export const CalibrationVisuals3D: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const engine = CalibrationEngine.getInstance();

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const active = engine.isActive() && engine.getStep() === 'BOUNDS_TOUCH';
    groupRef.current.visible = active;

    if (!active) return;

    // Actualizar motor de calibración
    engine.update(performance.now());
  });

  return (
    <group ref={groupRef} visible={false}>
      {engine.targets.map((target) => (
        <group key={target.id} position={target.position}>
          {/* Núcleo de destino */}
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial
              color={target.isConfirmed ? '#34c759' : '#00e5ff'}
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Anillo de pulso exterior */}
          <mesh>
            <ringGeometry args={[0.09, 0.12, 24]} />
            <meshBasicMaterial
              color={target.isConfirmed ? '#34c759' : '#ffbd00'}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
