import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface Visualizer3DProps {
  frequencyData: Uint8Array;
  isCapturing: boolean;
  sphereColor?: string;
  glowIntensity?: number;
  imageUrl?: string | null;
  sphereRadius?: number;
  barColor?: string;
  showBars?: boolean;
}

const SphereWithBars: React.FC<{
  freqData: Uint8Array;
  color: string;
  glow: number;
  image: string | null;
  radius: number;
  barColor: string;
  showBars: boolean;
}> = ({ freqData, color, glow, image, radius, barColor, showBars }) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const barGroupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load image texture if provided
  useEffect(() => {
    if (image) {
      const loader = new THREE.TextureLoader();
      loader.load(
        image,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          setTexture(tex);
        },
        undefined,
        (err) => {
          console.warn('Error loading texture:', err);
          setTexture(null);
        }
      );
    } else {
      setTexture(null);
    }
  }, [image]);

  // Compute 32 averaged FFT frequency bins for the bars
  const barData = useMemo(() => {
    if (!freqData || freqData.length === 0) return new Array(32).fill(0);
    const step = Math.max(1, Math.floor(freqData.length / 32));
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < freqData.length) sum += freqData[idx];
      }
      bars.push(sum / step / 255);
    }
    return bars;
  }, [freqData]);

  // Frame animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (sphereRef.current) {
      sphereRef.current.rotation.x = Math.sin(t * 0.15) * 0.2;
      sphereRef.current.rotation.y += 0.008;

      // Scale sphere with audio volume
      const avg = barData.reduce((a, b) => a + b, 0) / (barData.length || 1);
      const bassVal = (barData[0] + barData[1] + barData[2]) / 3;
      const targetScale = radius * (1 + bassVal * 0.2 + avg * 0.1);

      sphereRef.current.scale.set(targetScale, targetScale, targetScale);
    }

    if (barGroupRef.current && showBars) {
      barGroupRef.current.rotation.y += 0.004;
      const children = barGroupRef.current.children;
      const count = children.length;

      for (let i = 0; i < count; i++) {
        const bar = children[i] as THREE.Mesh;
        const val = barData[i] || 0;
        const targetHeight = Math.max(0.15, val * 2.2);

        bar.scale.y = targetHeight;
        bar.position.y = targetHeight / 2 - 0.5;

        // Dynamic HSL color transition from Cyan to Neon Pink / Gold
        if (bar.material instanceof THREE.MeshStandardMaterial) {
          const hue = 0.55 - val * 0.45; // Cyan/Blue -> Magenta/Red
          bar.material.color.setHSL(hue, 0.95, 0.55);
          bar.material.emissive.setHSL(hue, 0.95, 0.35 * (val + 0.2));
        }
      }
    }
  });

  // Generate 32 orbital 3D Box bars around sphere equator
  const bars = useMemo(() => {
    const count = 32;
    const ringRadius = radius * 1.55;
    const barWidth = 0.09;
    const barDepth = 0.09;
    const temp = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;

      temp.push(
        <mesh
          key={i}
          position={[x, 0, z]}
          rotation={[0, -angle, 0]}
        >
          <boxGeometry args={[barWidth, 1, barDepth]} />
          <meshStandardMaterial
            color={barColor}
            emissive={barColor}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      );
    }
    return temp;
  }, [radius, barColor]);

  const sphereColorObj = useMemo(() => new THREE.Color(color), [color]);
  const emissiveColor = useMemo(
    () => sphereColorObj.clone().multiplyScalar(glow),
    [sphereColorObj, glow]
  );

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

      {/* Orbital 3D Frequency Bars */}
      {showBars && <group ref={barGroupRef}>{bars}</group>}

      {/* Point Lights & Ambient Lighting */}
      <pointLight position={[6, 6, 6]} intensity={1.5} color={color} />
      <pointLight position={[-6, -6, -6]} intensity={1.2} color="#ff088a" />
      <ambientLight intensity={0.65} />
    </group>
  );
};

export const Visualizer3D: React.FC<Visualizer3DProps> = ({
  frequencyData,
  isCapturing,
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
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050713']} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2.5}
          maxDistance={8}
          rotateSpeed={0.6}
          dampingFactor={0.05}
        />
        <SphereWithBars
          freqData={frequencyData}
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
};

export default Visualizer3D;

