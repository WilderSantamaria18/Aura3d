import React from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpatialSceneLayer } from './SpatialSceneLayer';
import { PerformanceManager } from './performance/PerformanceManager';
import { usePlayerStore } from '../stores/playerStore';

// Los instrumentos asumen esta cámara: plano de interacción en Z=3.4 (6.2 - targetDistance 2.8).
const BASE_DISTANCE = 6.2;
const LOOK_AT_Y = 0.35;

/**
 * Cámara fija del overlay espacial. Independiente de los presets del visualizador de fondo
 * para que el plano de los instrumentos y la proyección de los dedos no se desplacen.
 */
/** Ancho de la consola anclada (380 px + margen): el campo de juego se centra en el espacio libre */
const DOCK_WIDTH_PX = 396;

const FixedSpatialCamera: React.FC<{ docked: boolean }> = ({ docked }) => {
  const { camera, size } = useThree();

  React.useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    camera.aspect = aspect;
    camera.position.set(
      0,
      LOOK_AT_Y,
      aspect < 1.0 ? BASE_DISTANCE / Math.max(0.45, aspect * 0.92) : BASE_DISTANCE
    );
    camera.lookAt(0, LOOK_AT_Y, 0);
    // Con la consola abierta en escritorio, desplazar la vista a la izquierda (sin mover la cámara:
    // la proyección de los dedos usa este mismo frustum, así que sigue coherente)
    if (docked && size.width >= 1024) {
      camera.setViewOffset(size.width, size.height, DOCK_WIDTH_PX / 2, 0, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, docked]);

  useFrame((_, delta) => {
    PerformanceManager.getInstance().recordFrame(delta, performance.now());
  });

  return null;
};

/**
 * SpatialOverlay — Canvas transparente que monta SpatialSceneLayer sobre el visualizador activo.
 * Se monta solo bajo demanda (Camera Studio abierto o instrumentos activos).
 */
export const SpatialOverlay: React.FC = () => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const docked = usePlayerStore((s) => s.isCameraStudioOpen);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const accent = isLucid ? lucidPrimary || '#00e5ff' : '#00e5ff';
  const [dpr, setDpr] = React.useState(() => PerformanceManager.getInstance().getMetrics().dpr);
  React.useEffect(
    () => PerformanceManager.getInstance().subscribe((m) => setDpr((prev) => (prev === m.dpr ? prev : m.dpr))),
    []
  );

  return (
    <div className="fixed inset-0 z-[15] pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, LOOK_AT_Y, BASE_DISTANCE], fov: 50 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'default' }}
        dpr={Math.min(dpr, 1)}
        style={{ pointerEvents: 'none' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <FixedSpatialCamera docked={docked} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 7]} intensity={0.6} />
        <SpatialSceneLayer accentColor={accent} />
      </Canvas>
    </div>
  );
};

export default SpatialOverlay;
