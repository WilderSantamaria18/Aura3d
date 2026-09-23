import React, { memo } from 'react';
import { AirInstruments3D } from '../components/3D/AirInstruments3D';
import { SpatialInteractionFx } from './visuals/SpatialInteractionFx';
import { SpatialInteractiveObjects } from './interaction/SpatialInteractiveObjects';
import { SpatialCursor } from './interaction/SpatialCursor';
import { CalibrationVisuals3D } from './calibration/CalibrationVisuals3D';

interface SpatialSceneLayerProps {
  accentColor?: string;
}

/**
 * SpatialSceneLayer — Apartado 3D Aislado para Aura Spatial.
 *
 * Se monta EXCLUSIVAMENTE cuando el usuario activa el modo espacial / cámara.
 * Al desactivarse, Three.js desinstala todas las geometrías, shaders, materiales
 * y bucles de render `useFrame` asociados, reduciendo el consumo de RAM/VRAM a cero
 * y liberando la CPU para el reproductor musical estándar.
 */
export const SpatialSceneLayer: React.FC<SpatialSceneLayerProps> = memo(({ accentColor = '#00e5ff' }) => {
  return (
    <group name="AuraSpatialApartadoGroup">
      {/* 1. Instrumentos Virtuales Aéreos (Piano, Theremin, Sintetizadores) */}
      <AirInstruments3D />

      {/* 2. Capa Reactiva de Ondas y Partículas de Interacción de Audio */}
      <SpatialInteractionFx />

      {/* 3. Objetos Físicos Manipulables 3D (Hover, Grab, Inercia) */}
      <SpatialInteractiveObjects />

      {/* 4. Retícula Láser y Cursor 3D en la Punta del Dedo */}
      <SpatialCursor accentColor={accentColor} />

      {/* 5. Dianas Visuales de Calibración Espacial Guiada */}
      <CalibrationVisuals3D />
    </group>
  );
});

export default SpatialSceneLayer;
