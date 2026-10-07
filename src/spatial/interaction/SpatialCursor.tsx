import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpatialState } from '../state/SpatialState';

// Zero GC: Vectores e instancias matemáticas pre-reservadas
const _dirVec = new THREE.Vector3();
const _midVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _pinchCenter = new THREE.Vector3();
const _pinchAxis = new THREE.Vector3();
const _tempColor = new THREE.Color();

const TRAIL_LENGTH = 24;
const STARDUST_COUNT = 36;

const initialTrailPositions = new Float32Array(TRAIL_LENGTH * 3);
const initialTrailColors = new Float32Array(TRAIL_LENGTH * 3);
const initialStardustPositions = new Float32Array(STARDUST_COUNT * 3);
const initialStardustColors = new Float32Array(STARDUST_COUNT * 3);

interface StardustSpark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  alpha: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

interface SpatialCursorProps {
  accentColor?: string;
}

/**
 * SpatialCursor — Cursor 3D Holográfico visionOS con:
 *  1. Anillo de Pellizco Bio-Luminiscente (Pinch Feedback Ring):
 *     Arco de energía entre índice y pulgar que se comprime en un aro cristalino
 *     ultrabrillante al confirmar el pellizco (PINCH_HOLD), emitiendo un ping óptico.
 *  2. Estela Ribbon Trails con Gradiente Z:
 *     Estela de profundidad espacial continua que cambia de color según el eje Z
 *     (cian diamante cerca, magenta/violeta profundo lejos).
 *  3. Polvo de Estrellas (Stardust Particles):
 *     Chispas cósmicas etéreas que flotan con inercia y titilan al mover la mano en el aire.
 */
export const SpatialCursor: React.FC<SpatialCursorProps> = ({
  accentColor = '#00e5ff',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const rayMeshRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  // ── 1. Anillo de Pellizco Bio-Luminiscente ─────────────────────────────────
  const pinchGroupRef = useRef<THREE.Group>(null);
  const pinchRingMeshRef = useRef<THREE.Mesh>(null);
  const pinchBeamMeshRef = useRef<THREE.Mesh>(null);
  const pinchPingMeshRef = useRef<THREE.Mesh>(null);
  const prevPinchStateRef = useRef<string>('IDLE');
  const pinchPingScale = useRef(0);
  const pinchPingAlpha = useRef(0);

  // ── 2. Estela Ribbon Trail (Gradiente en Eje Z) ────────────────────────────
  const trailLineRef = useRef<THREE.Line>(null);
  const trailGeoRef = useRef<THREE.BufferGeometry>(null);
  const trailHistory = useRef<THREE.Vector3[]>(
    Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(0, -999, 0))
  );
  const trailHeadIdx = useRef(0);
  const lastRecordedPos = useRef(new THREE.Vector3());

  // ── 3. Polvo de Estrellas (Stardust Sparkles) ─────────────────────────────
  const stardustPointsRef = useRef<THREE.Points>(null);
  const stardustGeoRef = useRef<THREE.BufferGeometry>(null);
  const stardustPool = useRef<StardustSpark[]>(
    Array.from({ length: STARDUST_COUNT }, () => ({
      x: 0,
      y: -999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      alpha: 0,
      size: 0.02,
      color: new THREE.Color('#00e5ff'),
      active: false,
    }))
  );

  const shockwaveScale = useRef(0);
  const shockwaveAlpha = useRef(0);

  useEffect(() => {
    const tGeo = trailGeoRef.current;
    const sGeo = stardustGeoRef.current;
    return () => {
      tGeo?.dispose();
      sGeo?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    const spatialState = SpatialState.getInstance();
    const domHand = spatialState.getDominantHand();

    if (!groupRef.current) return;

    // Si la mano no está visible o no es confiable, ocultar cursor y apagar estelas
    if (!domHand.isPresent || domHand.confidenceTier === 'untrusted') {
      groupRef.current.visible = false;
      if (pinchGroupRef.current) pinchGroupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Posición del cursor en la punta del dedo índice
    const tipPos = domHand.worldIndexTip;
    const thumbPos = domHand.worldThumbTip;
    groupRef.current.position.copy(tipPos);

    // Orientación del rayo proyectado hacia adelante a lo largo del dedo
    _dirVec.subVectors(tipPos, domHand.worldWrist).normalize();

    // Rotación del anillo orbital del cursor
    if (ringMeshRef.current) {
      ringMeshRef.current.rotation.z += delta * 2.5;
      ringMeshRef.current.rotation.x = Math.sin(performance.now() * 0.003) * 0.3;
    }

    // Adaptación visual según el estado del pellizco y gesto
    const isPinching = domHand.pinchState === 'PINCH_HOLD' || domHand.pinchState === 'PINCH_MOVE';
    const isGrabIntent = domHand.pinchState === 'PINCH_START';

    // ── A. Gradiente de Profundidad Z para el Cursor y Rayo ───────────────
    // Z en torno a 3.4: cerca (< 3.3) = Diamante blanco/cian, medio (3.4-3.6) = Cian láser, lejos (> 3.7) = Magenta/violeta
    const depthRatio = Math.max(0, Math.min(1, (tipPos.z - 3.1) / 0.9));
    let targetColor = accentColor;
    let coreScale = 1.0;

    if (isPinching) {
      targetColor = '#ff088a'; // Magenta visionOS de agarre activo
      coreScale = 1.35 + Math.sin(performance.now() * 0.02) * 0.15;
    } else if (isGrabIntent) {
      targetColor = '#00f2fe'; // Cian brillante de intención
      coreScale = 0.9;
    } else if (domHand.isPointing) {
      targetColor = depthRatio > 0.5 ? '#a855f7' : '#00e5ff';
      coreScale = 1.15;
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

    // Rayo láser proyectado
    if (rayMeshRef.current) {
      const rayLength = domHand.isPointing || isPinching ? 1.4 : 0.6;
      rayMeshRef.current.scale.set(1, rayLength, 1);

      _midVec.copy(_dirVec).multiplyScalar(rayLength * 0.5);
      rayMeshRef.current.position.copy(_midVec);

      _quat.setFromUnitVectors(_upVec, _dirVec);
      rayMeshRef.current.quaternion.copy(_quat);

      const rayMat = rayMeshRef.current.material as THREE.MeshBasicMaterial;
      rayMat.color.set(targetColor);
      rayMat.opacity = domHand.isPointing ? 0.65 : isPinching ? 0.85 : 0.25;
    }

    // ── B. Anillo de Pellizco Bio-Luminiscente (Pinch Feedback Ring) ──────────
    const pinchGroup = pinchGroupRef.current;
    if (pinchGroup) {
      const pinchDist = tipPos.distanceTo(thumbPos);
      const pinchProgress = domHand.pinchProgress ?? Math.max(0, Math.min(1, (0.075 - pinchDist) / 0.04));

      if (pinchProgress > 0.12 || isPinching) {
        pinchGroup.visible = true;

        // Centrado exactamente en el punto medio entre índice y pulgar
        _pinchCenter.copy(tipPos).lerp(thumbPos, 0.5);
        pinchGroup.position.copy(_pinchCenter);

        // Orientado a lo largo del eje índice-pulgar
        _pinchAxis.subVectors(tipPos, thumbPos).normalize();
        _quat.setFromUnitVectors(_upVec, _pinchAxis);
        pinchGroup.quaternion.copy(_quat);

        // Compresión bio-luminiscente: el aro se contrae al acercarse los dedos
        const ringScale = Math.max(0.3, 1.0 - pinchProgress * 0.65);
        if (pinchRingMeshRef.current) {
          pinchRingMeshRef.current.scale.setScalar(ringScale);
          pinchRingMeshRef.current.rotation.z += delta * (4.0 + pinchProgress * 6.0);

          const ringMat = pinchRingMeshRef.current.material as THREE.MeshBasicMaterial;
          if (isPinching) {
            ringMat.color.set('#ffffff'); // Núcleo de cristal blanco brillante
            ringMat.opacity = 0.95;
          } else {
            ringMat.color.set(targetColor);
            ringMat.opacity = 0.35 + pinchProgress * 0.55;
          }
        }

        // Rayo de energía conectivo entre ambos dedos
        if (pinchBeamMeshRef.current) {
          pinchBeamMeshRef.current.scale.set(1, pinchDist, 1);
          const beamMat = pinchBeamMeshRef.current.material as THREE.MeshBasicMaterial;
          beamMat.opacity = isPinching ? 0.75 : pinchProgress * 0.45;
          beamMat.color.set(isPinching ? '#ff088a' : targetColor);
        }
      } else {
        pinchGroup.visible = false;
      }
    }

    // Detección de confirmación instantánea de pellizco (PINCH_HOLD)
    if (domHand.pinchState === 'PINCH_HOLD' && prevPinchStateRef.current !== 'PINCH_HOLD') {
      pinchPingScale.current = 0.02;
      pinchPingAlpha.current = 1.0;
    }
    prevPinchStateRef.current = domHand.pinchState;

    // Ping radial bio-luminiscente al confirmar pellizco
    if (pinchPingMeshRef.current && pinchPingAlpha.current > 0.01) {
      pinchPingMeshRef.current.visible = true;
      pinchPingScale.current += delta * 2.5;
      pinchPingAlpha.current -= delta * 3.8;
      pinchPingMeshRef.current.scale.setScalar(pinchPingScale.current);
      const pingMat = pinchPingMeshRef.current.material as THREE.MeshBasicMaterial;
      pingMat.opacity = Math.max(0, pinchPingAlpha.current);
    } else if (pinchPingMeshRef.current) {
      pinchPingMeshRef.current.visible = false;
    }

    // Onda expansiva en PINCH_END
    if (domHand.pinchState === 'PINCH_END') {
      shockwaveScale.current = 0.05;
      shockwaveAlpha.current = 1.0;
    }

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

    // ── C. Ribbon Trail con Gradiente Z en Tiempo Real ────────────────────────
    const distMoved = tipPos.distanceTo(lastRecordedPos.current);
    if (distMoved > 0.008) {
      lastRecordedPos.current.copy(tipPos);
      trailHistory.current[trailHeadIdx.current].copy(tipPos);
      trailHeadIdx.current = (trailHeadIdx.current + 1) % TRAIL_LENGTH;

      // Spawn de partículas de Polvo de Estrellas (Stardust)
      const freeSpark = stardustPool.current.find((p) => !p.active);
      if (freeSpark) {
        freeSpark.x = tipPos.x + (Math.random() - 0.5) * 0.025;
        freeSpark.y = tipPos.y + (Math.random() - 0.5) * 0.025;
        freeSpark.z = tipPos.z + (Math.random() - 0.5) * 0.025;
        freeSpark.vx = (Math.random() - 0.5) * 0.06;
        freeSpark.vy = 0.02 + Math.random() * 0.05;
        freeSpark.vz = (Math.random() - 0.5) * 0.06;
        freeSpark.alpha = 0.95;
        freeSpark.size = 0.015 + Math.random() * 0.02;

        // Color con gradiente en Z
        if (tipPos.z < 3.3) {
          freeSpark.color.set('#ffffff');
        } else if (tipPos.z < 3.6) {
          freeSpark.color.set('#00e5ff');
        } else {
          freeSpark.color.set('#ff007f');
        }
        freeSpark.active = true;
      }
    }

    if (trailGeoRef.current) {
      const posAttr = trailGeoRef.current.attributes.position as THREE.BufferAttribute;
      const colAttr = trailGeoRef.current.attributes.color as THREE.BufferAttribute;
      if (posAttr && colAttr) {
        const trailPositions = posAttr.array as Float32Array;
        const trailColors = colAttr.array as Float32Array;
        let posPtr = 0;
        let colPtr = 0;
        for (let i = 0; i < TRAIL_LENGTH; i++) {
          const idx = (trailHeadIdx.current - 1 - i + TRAIL_LENGTH) % TRAIL_LENGTH;
          const pt = trailHistory.current[idx];

          trailPositions[posPtr++] = pt.x;
          trailPositions[posPtr++] = pt.y;
          trailPositions[posPtr++] = pt.z;

          // Gradiente de profundidad en el eje Z
          const ageAlpha = Math.max(0, 1.0 - i / TRAIL_LENGTH);
          if (pt.z < 3.35) {
            _tempColor.set('#00f0ff').lerp(new THREE.Color('#ffffff'), 0.4);
          } else if (pt.z < 3.7) {
            _tempColor.set('#00e5ff').lerp(new THREE.Color('#818cf8'), (pt.z - 3.35) / 0.35);
          } else {
            _tempColor.set('#ff007f').lerp(new THREE.Color('#a855f7'), 0.5);
          }

          trailColors[colPtr++] = _tempColor.r * ageAlpha;
          trailColors[colPtr++] = _tempColor.g * ageAlpha;
          trailColors[colPtr++] = _tempColor.b * ageAlpha;
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }
    }

    // ── D. Actualización y Render de Polvo de Estrellas (Stardust) ───────────
    if (stardustGeoRef.current) {
      const posAttr = stardustGeoRef.current.attributes.position as THREE.BufferAttribute;
      const colAttr = stardustGeoRef.current.attributes.color as THREE.BufferAttribute;
      if (posAttr && colAttr) {
        const stardustPositions = posAttr.array as Float32Array;
        const stardustColors = colAttr.array as Float32Array;
        let sparkPosPtr = 0;
        let sparkColPtr = 0;
        for (let i = 0; i < STARDUST_COUNT; i++) {
          const spark = stardustPool.current[i];
          if (spark.active) {
            spark.x += spark.vx * delta;
            spark.y += spark.vy * delta;
            spark.z += spark.vz * delta;
            spark.alpha -= delta * 1.6;

            if (spark.alpha <= 0.01) {
              spark.active = false;
              spark.y = -999;
            }

            stardustPositions[sparkPosPtr++] = spark.x;
            stardustPositions[sparkPosPtr++] = spark.y;
            stardustPositions[sparkPosPtr++] = spark.z;

            stardustColors[sparkColPtr++] = spark.color.r * spark.alpha;
            stardustColors[sparkColPtr++] = spark.color.g * spark.alpha;
            stardustColors[sparkColPtr++] = spark.color.b * spark.alpha;
          } else {
            stardustPositions[sparkPosPtr++] = 0;
            stardustPositions[sparkPosPtr++] = -999;
            stardustPositions[sparkPosPtr++] = 0;
            stardustColors[sparkColPtr++] = 0;
            stardustColors[sparkColPtr++] = 0;
            stardustColors[sparkColPtr++] = 0;
          }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {/* ── 1. Cursor Principal en la punta del dedo índice ── */}
      <group ref={groupRef} visible={false}>
        {/* Núcleo central luminoso */}
        <mesh ref={coreMeshRef}>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.95} />
        </mesh>

        {/* Anillo reticular orbital con rotación viva */}
        <mesh ref={ringMeshRef}>
          <torusGeometry args={[0.045, 0.004, 12, 32]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.8} />
        </mesh>

        {/* Rayo de Energía Láser Proyectado hacia adelante */}
        <mesh ref={rayMeshRef}>
          <cylinderGeometry args={[0.0025, 0.0055, 1.0, 12]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.4} />
        </mesh>

        {/* Onda de choque expansiva al soltar pellizco */}
        <mesh ref={shockwaveRef} visible={false}>
          <ringGeometry args={[0.05, 0.07, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.0} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── 2. Anillo de Pellizco Bio-Luminiscente (Entre pulgar e índice) ── */}
      <group ref={pinchGroupRef} visible={false}>
        {/* Aro de cristal comprimible */}
        <mesh ref={pinchRingMeshRef}>
          <torusGeometry args={[0.038, 0.0035, 16, 36]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.85} />
        </mesh>

        {/* Haz de energía conectivo */}
        <mesh ref={pinchBeamMeshRef}>
          <cylinderGeometry args={[0.002, 0.002, 1.0, 8]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.5} />
        </mesh>

        {/* Ping óptico de confirmación al enganchar PINCH_HOLD */}
        <mesh ref={pinchPingMeshRef} visible={false}>
          <ringGeometry args={[0.035, 0.05, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── 3. Estela Ribbon Trail con Gradiente Z ── */}
      <line ref={trailLineRef as any}>
        <bufferGeometry ref={trailGeoRef}>
          <bufferAttribute attach="attributes-position" args={[initialTrailPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[initialTrailColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.85} linewidth={2} />
      </line>

      {/* ── 4. Polvo de Estrellas (Stardust Particles) ── */}
      <points ref={stardustPointsRef}>
        <bufferGeometry ref={stardustGeoRef}>
          <bufferAttribute attach="attributes-position" args={[initialStardustPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[initialStardustColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.024}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
};

export default SpatialCursor;
