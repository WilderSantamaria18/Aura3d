import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { useShallow } from 'zustand/react/shallow';
import { useMotionScaleRef } from '../../hooks/useMotionScale';
import { makePointSprite } from '../../utils/pointSprite';

// ── Terrain Grid Mesh Settings ───────────────────────────────────────────────
const GRID_WIDTH = 28;
const GRID_DEPTH = 55;
const SEG_X = 48;
const SEG_Z = 64;
const VERT_COUNT = (SEG_X + 1) * (SEG_Z + 1);
const RIDGE_LIMIT = 4.2;

/** Datos de audio compartidos: se escriben en sitio cada frame y se leen dentro de useFrame. */
type TerrainAudio = { bass: number; mids: number; highs: number; energy: number };
type TerrainAudioRef = React.RefObject<TerrainAudio>;

const AudioTerrainMesh: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  audioRef: TerrainAudioRef;
  style?: 'wireframe' | 'surface' | 'points' | 'dual_mesh';
  elevation?: number;
  roughness?: number;
  speed?: number;
  reactivity?: number;
  motionRef: React.RefObject<number>;
}> = ({
  primaryColor,
  secondaryColor,
  audioRef,
  style = 'wireframe',
  elevation = 1.0,
  roughness = 1.0,
  speed = 1.0,
  reactivity = 1.0,
  motionRef,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const sprite = useMemo(() => makePointSprite(), []);
  useEffect(() => () => sprite.dispose(), [sprite]);

  // Build plane geometry and initial base vertex positions
  const [geometry, originalZ, mountainMasks] = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_WIDTH, GRID_DEPTH, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const pos = geo.attributes.position.array as Float32Array;
    const orig = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i++) {
      orig[i] = pos[i];
    }

    // Vertex colors buffer
    const colors = new Float32Array(pos.length);
    const col1 = new THREE.Color(primaryColor);
    const col2 = new THREE.Color(secondaryColor);
    const tempCol = new THREE.Color();

    for (let i = 0; i < VERT_COUNT; i++) {
      const idx = i * 3;
      const x = pos[idx];
      const z = pos[idx + 2];
      const distFromCenter = Math.abs(x) / (GRID_WIDTH * 0.5);
      const depthRatio = (z + GRID_DEPTH * 0.5) / GRID_DEPTH;

      tempCol.copy(col1).lerp(col2, (distFromCenter + depthRatio) * 0.5);
      colors[idx] = tempCol.r;
      colors[idx + 1] = tempCol.g;
      colors[idx + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Máscara de montañas por vértice (0 en la autopista central, 1 en los laterales): no cambia entre frames
    const masks = new Float32Array(VERT_COUNT);
    for (let i = 0; i < VERT_COUNT; i++) {
      const latNorm = Math.min(1.0, Math.abs(orig[i * 3]) / (GRID_WIDTH * 0.42));
      masks[i] = Math.pow(latNorm, 1.8);
    }
    return [geo, orig, masks] as const;
  }, [primaryColor, secondaryColor]);

  // Clean up geometry in GPU memory
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.1);
    const { bass, mids, highs, energy } = audioRef.current;
    timeRef.current += (1.2 + energy * 2.2) * dt * speed * (0.5 + 0.5 * motionRef.current);

    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;

    const t = timeRef.current;
    // Ganancias acotadas (antes llegaban a ×11 y las montañas se disparaban como pinchos)
    const bassMultiplier = 1.0 + bass * 1.6 * reactivity;
    const midMultiplier = 0.85 + mids * 0.9 * reactivity;
    const ridgeGain = bassMultiplier * midMultiplier;

    const freq1 = 0.35 * roughness;
    const freq2 = 0.65 * roughness;
    const peakFreqX = 0.8 * roughness;
    const peakFreqZ = 0.4 * roughness;

    for (let i = 0; i < VERT_COUNT; i++) {
      const idx = i * 3;
      const x = originalZ[idx];
      const z = originalZ[idx + 2];

      // Normalized lateral distance (0 at center highway, 1 at mountains)
      const mountainMask = mountainMasks[i];

      // Waves traveling towards viewer (-Z to +Z)
      const wave1 = Math.sin(z * freq1 + t * 2.0 + x * 0.2 * roughness) * 0.8;
      const wave2 = Math.cos(z * freq2 - t * 3.0 + x * 0.4 * roughness) * 0.45;
      const mountainPeaks = Math.sin(x * peakFreqX + t * 0.5) * Math.cos(z * peakFreqZ + t) * 2.2;

      // Center valley is flatter, lateral edges form dramatic rhythmic mountains
      const valleyHeight = (wave1 + wave2) * 0.35 * (0.2 + highs * 0.8 * reactivity);
      // Compresión suave: las crestas crecen con la música pero nunca superan RIDGE_LIMIT
      const rawRidge = (mountainPeaks + wave1 * 1.5) * mountainMask * ridgeGain;
      const ridgeHeight = RIDGE_LIMIT * Math.tanh(rawRidge / RIDGE_LIMIT);

      pos[idx + 1] = (valleyHeight + ridgeHeight) * elevation;
    }

    posAttr.needsUpdate = true;
    if (style === 'surface') {
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  if (style === 'points') {
    return (
      <points ref={meshRef as unknown as React.Ref<THREE.Points>} geometry={geometry} position={[0, -0.6, -GRID_DEPTH * 0.28]}>
        <pointsMaterial
          size={0.2}
          map={sprite}
          alphaTest={0.01}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    );
  }

  if (style === 'surface') {
    return (
      <mesh ref={meshRef} geometry={geometry} position={[0, -0.6, -GRID_DEPTH * 0.28]}>
        <meshStandardMaterial
          vertexColors
          roughness={0.62}
          metalness={0.08}
          emissive={primaryColor}
          emissiveIntensity={0.06}
        />
      </mesh>
    );
  }

  if (style === 'dual_mesh') {
    return (
      <group position={[0, -0.6, -GRID_DEPTH * 0.28]}>
        <mesh ref={meshRef} geometry={geometry}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={0.3}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <mesh geometry={geometry}>
          <meshBasicMaterial wireframe vertexColors transparent opacity={0.9} />
        </mesh>
      </group>
    );
  }

  // Default: wireframe
  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.6, -GRID_DEPTH * 0.28]}>
      <meshBasicMaterial wireframe vertexColors transparent opacity={0.9} />
    </mesh>
  );
};

// ── Distant Horizon Neon Sun & Glow ──────────────────────────────────────────
const HorizonSun: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  audioRef: TerrainAudioRef;
  style?: 'classic' | 'corona' | 'grid_orb' | 'none';
}> = ({ primaryColor, secondaryColor, audioRef, style = 'classic' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const { bass, mids, highs } = audioRef.current;
    const scale = 1.0 + bass * 0.28;
    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, 1);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.5;
      const rScale = 1.0 + mids * 0.4;
      ring1Ref.current.scale.set(rScale, rScale, 1);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.8;
      const rScale2 = 1.0 + highs * 0.5;
      ring2Ref.current.scale.set(rScale2, rScale2, 1);
    }
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * (0.8 + bass * 1.5);
      orbRef.current.rotation.x = 0.25;
      orbRef.current.scale.set(scale, scale, scale);
    }
  });

  if (style === 'none') return null;

  if (style === 'grid_orb') {
    return (
      <group position={[0, 2.8, -GRID_DEPTH * 0.85]}>
        {/* 3D Wireframe Cyber Core */}
        <mesh ref={orbRef}>
          <sphereGeometry args={[5.2, 18, 18]} />
          <meshBasicMaterial
            wireframe
            color={secondaryColor}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Central Pulsing Plasma Core */}
        <mesh position={[0, 0, -0.2]}>
          <circleGeometry args={[3.2, 32]} />
          <meshBasicMaterial
            color={primaryColor}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    );
  }

  if (style === 'corona') {
    return (
      <group position={[0, 2.8, -GRID_DEPTH * 0.85]}>
        <mesh ref={meshRef}>
          <circleGeometry args={[5.5, 32]} />
          <meshBasicMaterial
            color={secondaryColor}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Rotating Corona Ring 1 */}
        <mesh ref={ring1Ref} position={[0, 0, -0.05]}>
          <ringGeometry args={[5.8, 7.2, 32]} />
          <meshBasicMaterial
            color={primaryColor}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Highs Flare Outer Ring 2 */}
        <mesh ref={ring2Ref} position={[0, 0, -0.1]}>
          <ringGeometry args={[7.4, 9.2, 32]} />
          <meshBasicMaterial
            color={secondaryColor}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    );
  }

  // Default: classic sun + halo
  return (
    <group position={[0, 2.8, -GRID_DEPTH * 0.85]}>
      <mesh ref={meshRef}>
        <circleGeometry args={[5.5, 32]} />
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Corona Outer Ring */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[5.6, 7.8, 32]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

// ── Terrain Camera Controller ────────────────────────────────────────────────
/** Centro del terreno en el mundo (la malla se coloca en y=-0.6, z=-GRID_DEPTH*0.28) */
const TERRAIN_CENTER_Z = -GRID_DEPTH * 0.28;

const TerrainCameraController: React.FC<{
  audioRef: TerrainAudioRef;
  motionRef: React.RefObject<number>;
  elevation: number;
}> = ({ audioRef, motionRef, elevation }) => {
  const { camera } = useThree();
  const cameraPreset = usePlayerStore((s) => s.cameraPreset);
  const mouseEffectsEnabled = usePlayerStore((s) => s.mouseEffectsEnabled);
  const mousePos = useRef({ x: 0, y: 0 });
  const orbitAngleRef = useRef(0);
  // Punto al que mira la cámara: se desplaza suavemente al cambiar de vista (antes saltaba de golpe)
  const lookRef = useRef(new THREE.Vector3(0, 0.4, -GRID_DEPTH * 0.4));
  const desiredLook = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!mouseEffectsEnabled) {
      mousePos.current = { x: 0, y: 0 };
      return;
    }
    const onMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mousePos.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseEffectsEnabled]);

  useFrame((_, delta) => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;
    const dt = Math.min(delta, 0.1);
    const { bass, energy } = audioRef.current;
    const motion = motionRef.current;
    // Altura mínima segura sobre las crestas más altas, en función de la altura del terreno
    const safeY = 2.6 + elevation * 2.2;

    let tx = 0;
    let ty = 0;
    let tz = 0;
    let rate = 4;
    const look = desiredLook.current;

    if (cameraPreset === 'driver') {
      // Cockpit: a ras de la autopista central
      tx = mousePos.current.x * 0.8 * motion;
      ty = 0.25 - bass * 0.15 * motion;
      tz = 1.0;
      look.set(tx * 0.5, 0.2, -GRID_DEPTH * 0.45);
    } else if (cameraPreset === 'top') {
      // Vista cenital: mira hacia abajo al centro del terreno (antes no se orientaba y apuntaba al cielo)
      tx = mousePos.current.x * 2.0 * motion;
      ty = 18;
      tz = TERRAIN_CENTER_Z + 5;
      rate = 3;
      look.set(0, 0, TERRAIN_CENTER_Z - 2);
    } else if (cameraPreset === 'drone') {
      // Vuelo sobre el valle con barridos laterales contenidos y altura segura
      orbitAngleRef.current += dt * 0.4 * motion;
      const t = orbitAngleRef.current;
      tx = Math.sin(t) * 5;
      ty = safeY * 0.62 + Math.sin(t * 1.5) * 0.9 + bass * 0.4 * motion;
      tz = -3.0 + Math.cos(t * 0.8) * 4.0;
      rate = 3;
      look.set(0, 0.5, -GRID_DEPTH * 0.4);
    } else if (cameraPreset === 'orbit') {
      // Órbita alrededor del centro real del terreno, por encima de las montañas
      orbitAngleRef.current += dt * 0.25 * motion;
      const a = orbitAngleRef.current;
      const radius = 11;
      tx = Math.sin(a) * radius;
      ty = safeY + 1.5 + Math.sin(a * 0.5) * 1.0;
      tz = TERRAIN_CENTER_Z + Math.cos(a) * radius;
      rate = 3;
      look.set(0, 0.6, TERRAIN_CENTER_Z);
    } else {
      // Frontal clásica
      tx = mousePos.current.x * 1.5 * motion;
      ty = 1.6 + mousePos.current.y * -0.5 * motion - bass * 0.35 * motion;
      tz = 3.5 + energy * 0.8 * motion;
      look.set(tx * 0.4, 0.4, -GRID_DEPTH * 0.4);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, rate, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, rate, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, rate, dt);
    lookRef.current.x = THREE.MathUtils.damp(lookRef.current.x, look.x, 3, dt);
    lookRef.current.y = THREE.MathUtils.damp(lookRef.current.y, look.y, 3, dt);
    lookRef.current.z = THREE.MathUtils.damp(lookRef.current.z, look.z, 3, dt);
    camera.lookAt(lookRef.current);
  });

  return null;
};

// ── Exported Terrain Visualizer Component ─────────────────────────────────────
export const TerrainVisualizer: React.FC = () => {
  const { isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme, performanceTier, effectiveTier, blobSettings } = usePlayerStore(
    useShallow((s) => ({
      isLucid: s.isLucid,
      lucidPrimaryColor: s.lucidPrimaryColor,
      lucidSecondaryColor: s.lucidSecondaryColor,
      lucidTheme: s.lucidTheme,
      performanceTier: s.performanceTier,
      effectiveTier: s.effectiveTier,
      blobSettings: s.blobSettings,
    }))
  );
  const { getSmoothedData } = useVisualizer(0.16);
  const { primaryColor: aiPrimary, secondaryColor: aiSecondary } = useAIAudioEngine();

  const motionRef = useMotionScaleRef();
  const audioDataRef = useRef<TerrainAudio>({ bass: 0, mids: 0, highs: 0, energy: 0 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      const data = getSmoothedData();
      const a = audioDataRef.current;
      a.bass = data.bass;
      a.mids = data.mids;
      a.highs = data.highs;
      a.energy = data.energy;
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [getSmoothedData]);

  const primaryColor = isLucid
    ? lucidPrimaryColor || lucidTheme.primary || '#00f2fe'
    : aiPrimary || '#00f2fe';
  const secondaryColor = isLucid
    ? lucidSecondaryColor || lucidTheme.secondary || '#ff088a'
    : aiSecondary || '#ff088a';

  // La resolución sí puede cambiar en caliente, así que sigue al nivel efectivo (calidad automática);
  // 'antialias' se fija al crear el contexto WebGL y se queda con la elección del usuario.
  const dpr: [number, number] | number =
    effectiveTier === 'eco' ? 0.85 : effectiveTier === 'medium' ? 1.0 : [1, 1.5];

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#03050d] pointer-events-auto select-none">
      <Canvas
        data-visualizer="true"
        camera={{ position: [0, 1.6, 3.5], fov: 65, near: 0.1, far: 180 }}
        dpr={dpr}
        gl={{
          antialias: performanceTier !== 'eco',
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl, scene }) => {
          gl.domElement.dataset.visualizer = 'true';
          gl.setClearColor(0x03050d, 1);
          scene.fog = new THREE.FogExp2(0x03050d, 0.024);
        }}
      >
        <TerrainCameraController audioRef={audioDataRef} motionRef={motionRef} elevation={blobSettings?.terrainElevation ?? 1.0} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 8, 4]} intensity={0.9} color={primaryColor} />
        {(blobSettings?.terrainStyle === 'surface' || blobSettings?.terrainStyle === 'dual_mesh') && (
          <>
            {/* Luz rasante lateral: las crestas proyectan sombra de forma y se lee el volumen */}
            <directionalLight position={[-9, 3, -10]} intensity={1.6} color={secondaryColor} />
            <hemisphereLight args={[primaryColor, '#05060f', 0.35]} />
          </>
        )}

        <HorizonSun
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          audioRef={audioDataRef}
          style={blobSettings?.terrainSunStyle ?? 'classic'}
        />

        <AudioTerrainMesh
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          audioRef={audioDataRef}
          style={blobSettings?.terrainStyle ?? 'wireframe'}
          elevation={blobSettings?.terrainElevation ?? 1.0}
          roughness={blobSettings?.terrainRoughness ?? 1.0}
          speed={blobSettings?.terrainSpeed ?? 1.0}
          reactivity={blobSettings?.terrainReactivity ?? 1.0}
          motionRef={motionRef}
        />
      </Canvas>

      {/* Cyberpunk Horizon & Edge Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(3, 5, 13, 0.8) 0%, transparent 40%, rgba(3, 5, 13, 0.6) 100%)',
        }}
      />
    </div>
  );
};

export default TerrainVisualizer;
