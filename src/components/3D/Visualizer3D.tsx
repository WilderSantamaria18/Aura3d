import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { optimizeImageTexture } from '../../services/imageOptimizer';
import { audioEngine } from '../../services/audioEngine';

interface Visualizer3DProps {
  frequencyData?: Uint8Array;
  isCapturing?: boolean;
  sphereColor?: string;
  glowIntensity?: number;
  imageUrl?: string | null;
  sphereRadius?: number;
  barColor?: string;
  showBars?: boolean;
}

const BAR_COUNT = 32;

const SphereWithBars: React.FC<{
  color: string;
  glow: number;
  image: string | null;
  radius: number;
  barColor: string;
  showBars: boolean;
}> = ({ color, glow, image, radius, barColor, showBars }) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // 1. Audio data reference decoupled from React state
  const audioDataRef = useRef<{ frequencies: Uint8Array; volume: number }>({
    frequencies: new Uint8Array(BAR_COUNT),
    volume: 0,
  });
  const frameCounter = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  // Load and optimize image texture if provided (max 512x512 for GPU memory budget)
  useEffect(() => {
    let isMounted = true;
    if (image) {
      optimizeImageTexture(image, 512)
        .then((optimizedUrl) => {
          if (!isMounted) return;
          const loader = new THREE.TextureLoader();
          loader.load(
            optimizedUrl,
            (tex) => {
              if (!isMounted) return;
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.generateMipmaps = false;
              tex.minFilter = THREE.LinearFilter;
              setTexture(tex);
            },
            undefined,
            (err) => {
              console.warn('Error loading texture:', err);
              if (isMounted) setTexture(null);
            }
          );
        })
        .catch(() => {
          if (isMounted) setTexture(null);
        });
    } else {
      setTexture(null);
    }
    return () => {
      isMounted = false;
    };
  }, [image]);

  const sphereColorObj = useMemo(() => new THREE.Color(color), [color]);
  const emissiveColor = useMemo(
    () => sphereColorObj.clone().multiplyScalar(glow),
    [sphereColorObj, glow]
  );

  const barBoxGeometry = useMemo(() => new THREE.BoxGeometry(0.1, 1, 0.1), []);
  const barMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: barColor,
        emissive: barColor,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      }),
    [barColor]
  );

  // 2. Direct useFrame loop with zero React state modifications
  useFrame(({ clock }) => {
    frameCounter.current++;
    const t = clock.getElapsedTime();

    // Read audio data throttled (every 2 frames)
    if (frameCounter.current % 2 === 0) {
      const freshData = audioEngine.getFrequencyData();
      if (freshData && freshData.raw) {
        const step = Math.max(1, Math.floor(freshData.raw.length / BAR_COUNT));
        let sum = 0;
        for (let i = 0; i < BAR_COUNT; i++) {
          const val = freshData.raw[i * step] || 0;
          audioDataRef.current.frequencies[i] = val;
          sum += val;
        }
        audioDataRef.current.volume = sum / (BAR_COUNT * 255);
      }
    }

    const { frequencies, volume } = audioDataRef.current;

    // Direct mesh update on sphere
    if (sphereRef.current) {
      sphereRef.current.rotation.x = Math.sin(t * 0.15) * 0.2;
      sphereRef.current.rotation.y += 0.008;

      const targetScaleVal = radius * (1.0 + volume * 0.45);
      tempScaleVec.set(targetScaleVal, targetScaleVal, targetScaleVal);
      sphereRef.current.scale.lerp(tempScaleVec, 0.1);
    }

    // Direct InstancedMesh updates for bars
    if (barsRef.current && showBars) {
      const ringRadius = radius * 1.55;
      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * Math.PI * 2 + t * 0.2;
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius;
        const height = Math.max(0.15, (frequencies[i] / 255) * 2.2);

        dummy.position.set(x, height / 2 - 0.5, z);
        dummy.rotation.set(0, -angle, 0);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();

        barsRef.current.setMatrixAt(i, dummy.matrix);
      }
      barsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Dynamic Starfield Background */}
      <Stars radius={40} depth={40} count={1200} factor={3} saturation={0.5} fade speed={0.8} />

      {/* Main 3D Sphere */}
      <Sphere ref={sphereRef} args={[1, 64, 64]}>
        {texture ? (
          <meshStandardMaterial
            map={texture}
            emissive={emissiveColor}
            emissiveIntensity={glow}
            roughness={0.25}
            metalness={0.15}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            emissive={emissiveColor}
            emissiveIntensity={glow}
            roughness={0.28}
            metalness={0.2}
            wireframe={false}
          />
        )}
      </Sphere>

      {/* Orbital 3D Instanced Frequency Bars */}
      {showBars && (
        <instancedMesh
          ref={barsRef}
          args={[barBoxGeometry, barMaterial, BAR_COUNT]}
        />
      )}

      {/* Point Lights & Ambient Lighting */}
      <pointLight position={[6, 6, 6]} intensity={1.5} color={color} />
      <pointLight position={[-6, -6, -6]} intensity={1.2} color="#ff088a" />
      <ambientLight intensity={0.65} />
    </group>
  );
};

export const Visualizer3D: React.FC<Visualizer3DProps> = React.memo(({
  isCapturing = false,
  sphereColor = '#00f2fe',
  glowIntensity = 0.6,
  imageUrl = null,
  sphereRadius = 1.35,
  barColor = '#00E5FF',
  showBars = true,
}) => {
  return (
    <div className="relative w-full h-full min-h-[360px] bg-[#060814] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <Canvas
        camera={{ position: [0, 1.2, 4.5], fov: 55 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
          stencil: false,
          depth: true,
        }}
        dpr={[0.8, 1.5]}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x060814), 1.0);
          gl.toneMapping = THREE.NoToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.autoClear = true;
        }}
      >
        <color attach="background" args={['#060814']} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2.5}
          maxDistance={8}
          rotateSpeed={0.6}
          dampingFactor={0.05}
        />
        <SphereWithBars
          color={sphereColor}
          glow={glowIntensity}
          image={imageUrl}
          radius={sphereRadius}
          barColor={barColor}
          showBars={showBars}
        />
      </Canvas>

      {!isCapturing && (
        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/40 font-light tracking-widest uppercase pointer-events-none">
          Audio en espera • Carga un archivo o captura pantalla
        </div>
      )}
    </div>
  );
});

export default Visualizer3D;

