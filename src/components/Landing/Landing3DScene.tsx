import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';

interface Landing3DSceneProps {
  scrollProgress?: number; // fallback value 0..100
  scrollProgressRef?: React.RefObject<number> | React.MutableRefObject<number>;
  isTransitioningOut?: boolean;
}

/**
 * Landing3DScene
 * Escenario 3D interactivo con Three.js para la pantalla de inicio.
 * La cámara, la esfera cuántica y los anillos orbitales se mueven, rotan
 * y se transforman en sincronía directa con el scroll de la página sin forzar re-renders.
 */
export const Landing3DScene: React.FC<Landing3DSceneProps> = ({
  scrollProgress = 0,
  scrollProgressRef,
  isTransitioningOut = false,
}) => {
  const performanceTier = usePlayerStore((s) => s.performanceTier);
  const mountRef = useRef<HTMLDivElement>(null);
  const internalScrollRef = useRef(scrollProgress);
  const transitionRef = useRef(isTransitioningOut);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    internalScrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    transitionRef.current = isTransitioningOut;
  }, [isTransitioningOut]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const isEco = performanceTier === 'eco';

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03050c, 0.08);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    // 2. WebGL Renderer (Optimized based on performance tier)
    const renderer = new THREE.WebGLRenderer({
      antialias: !isEco,
      alpha: true,
      powerPreference: isEco ? 'default' : 'high-performance',
      precision: isEco ? 'mediump' : 'highp',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isEco ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Central 3D Group
    const centralGroup = new THREE.Group();
    scene.add(centralGroup);

    // ── Geodesic Icosahedron Wireframe Core ──
    const icoGeo = new THREE.IcosahedronGeometry(1.2, 2);
    const wireGeo = new THREE.WireframeGeometry(icoGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    centralGroup.add(wireMesh);

    // ── Quantum Core Particles on Vertices ──
    const posAttr = icoGeo.attributes.position;
    const vertexCount = posAttr.count;
    const coreParticleGeo = new THREE.BufferGeometry();
    const corePositions = new Float32Array(vertexCount * 3);
    const coreColors = new Float32Array(vertexCount * 3);

    const c1 = new THREE.Color(0x00f2fe);
    const c2 = new THREE.Color(0x7928ca);
    const c3 = new THREE.Color(0xff0080);

    for (let i = 0; i < vertexCount; i++) {
      corePositions[i * 3] = posAttr.getX(i);
      corePositions[i * 3 + 1] = posAttr.getY(i);
      corePositions[i * 3 + 2] = posAttr.getZ(i);

      const mixC = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
      coreColors[i * 3] = mixC.r;
      coreColors[i * 3 + 1] = mixC.g;
      coreColors[i * 3 + 2] = mixC.b;
    }
    coreParticleGeo.setAttribute('position', new THREE.BufferAttribute(corePositions, 3));
    coreParticleGeo.setAttribute('color', new THREE.BufferAttribute(coreColors, 3));

    const coreParticleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const corePoints = new THREE.Points(coreParticleGeo, coreParticleMat);
    centralGroup.add(corePoints);

    // ── 3 Concentric Tilted Orbital Rings ──
    const ringsGroup = new THREE.Group();
    centralGroup.add(ringsGroup);
    const ringRadii = [1.65, 2.05, 2.45];
    const ringMeshes: THREE.Line[] = [];

    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.BufferGeometry();
      const segments = isEco ? 64 : 128;
      const ringPositions = new Float32Array((segments + 1) * 3);
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        ringPositions[s * 3] = Math.cos(theta) * r;
        ringPositions[s * 3 + 1] = 0;
        ringPositions[s * 3 + 2] = Math.sin(theta) * r;
      }
      ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
      const ringMat = new THREE.LineBasicMaterial({
        color: idx === 0 ? 0x00f2fe : idx === 1 ? 0x7928ca : 0x00dfd8,
        transparent: true,
        opacity: 0.45 - idx * 0.1,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Line(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 4 + idx * 0.2;
      ring.rotation.z = idx * 0.35;
      ringsGroup.add(ring);
      ringMeshes.push(ring);
    });

    // ── Ambient Deep Star Field (Adjusted to performance tier) ──
    const starCount = isEco ? 280 : 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 16;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 16;

      const starC = Math.random() > 0.6 ? c1 : Math.random() > 0.3 ? c2 : c3;
      starColors[i * 3] = starC.r;
      starColors[i * 3 + 1] = starC.g;
      starColors[i * 3 + 2] = starC.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f2fe, 2, 8);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    // ── Resize Handler ──
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // ── Animation Loop ──
    let animId: number;
    let lastTime = performance.now();
    const startTime = performance.now();
    let warpZ = 0;

    const animate = (time: number = performance.now()) => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const elapsed = (time - startTime) / 1000;

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const rawProgress = scrollProgressRef?.current ?? internalScrollRef.current;
      const p = Math.min(1.0, Math.max(0.0, rawProgress / 100));

      // ── 3D Camera Choreography along the Scroll Journey ──
      // Stage 0 (Hero): camera [0.3, -0.1, 4.2] looking at center
      // Stage 1 (Architecture): camera [-1.6, 0.5, 3.4] orbiting oblique angle
      // Stage 2 (Launchpad): camera [0, 0, 2.7] centered plunge view

      let targetCamX = 0;
      let targetCamY = 0;
      let targetCamZ = 4.2;
      let targetObjX = 0;
      let targetObjY = 0;
      let targetObjZ = 0;

      if (p < 0.33) {
        // Stage 0 -> Stage 1 (Hero -> Mixer Deck)
        const t = p / 0.33;
        targetCamX = THREE.MathUtils.lerp(0.35, -1.8, t);
        targetCamY = THREE.MathUtils.lerp(-0.1, 0.45, t);
        targetCamZ = THREE.MathUtils.lerp(4.3, 3.1, t);
        targetObjX = THREE.MathUtils.lerp(0.4, 1.3, t);
        targetObjY = THREE.MathUtils.lerp(0, -0.2, t);
      } else if (p < 0.66) {
        // Stage 1 -> Stage 2 (Mixer Deck -> Turntable Deck)
        const t = (p - 0.33) / 0.33;
        targetCamX = THREE.MathUtils.lerp(-1.8, 1.2, t);
        targetCamY = THREE.MathUtils.lerp(0.45, 1.2, t);
        targetCamZ = THREE.MathUtils.lerp(3.1, 2.7, t);
        targetObjX = THREE.MathUtils.lerp(1.3, -0.2, t);
        targetObjY = THREE.MathUtils.lerp(-0.2, -0.5, t);
      } else {
        // Stage 2 -> Stage 3 (Turntable Deck -> Launch Deck)
        const t = (p - 0.66) / 0.34;
        targetCamX = THREE.MathUtils.lerp(1.2, 0.0, t);
        targetCamY = THREE.MathUtils.lerp(1.2, 0.0, t);
        targetCamZ = THREE.MathUtils.lerp(2.7, 2.3, t);
        targetObjX = THREE.MathUtils.lerp(-0.2, 0.0, t);
        targetObjY = THREE.MathUtils.lerp(-0.5, 0.0, t);
      }


      // Add interactive mouse tilt
      targetCamX += mouseRef.current.x * 0.35;
      targetCamY += -mouseRef.current.y * 0.25;

      // Handle Warp Exit Transition (when user clicks enter)
      if (transitionRef.current) {
        warpZ += delta * 12;
        camera.position.z -= warpZ;
        centralGroup.scale.multiplyScalar(1.02);
      } else {
        camera.position.x += (targetCamX - camera.position.x) * 0.06;
        camera.position.y += (targetCamY - camera.position.y) * 0.06;
        camera.position.z += (targetCamZ - camera.position.z) * 0.06;
      }

      // Position central object group based on scroll choreography
      centralGroup.position.x += (targetObjX - centralGroup.position.x) * 0.08;
      centralGroup.position.y += (targetObjY - centralGroup.position.y) * 0.08;
      centralGroup.position.z += (targetObjZ - centralGroup.position.z) * 0.08;

      camera.lookAt(centralGroup.position);

      // Continuous organic 3D rotations
      const rotSpeed = 0.4 + p * 0.6;
      centralGroup.rotation.y += delta * rotSpeed * 0.5;
      centralGroup.rotation.x += delta * 0.15;

      ringsGroup.rotation.z += delta * 0.25;
      ringsGroup.rotation.y -= delta * 0.3;

      // Pulse breathing
      const breathe = 1 + Math.sin(elapsed * 1.6) * 0.04;
      wireMesh.scale.set(breathe, breathe, breathe);
      corePoints.scale.set(breathe, breathe, breathe);

      // Ring orbital wave expansion on scroll
      const ringExpand = 1 + p * 0.35;
      ringsGroup.scale.set(ringExpand, ringExpand, ringExpand);

      // Star field slow drift
      starField.rotation.y = elapsed * 0.02;
      starField.rotation.x = elapsed * 0.01;

      // Point light orbit
      pointLight.position.x = Math.sin(elapsed * 1.2) * 2.5;
      pointLight.position.z = Math.cos(elapsed * 1.2) * 2.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      icoGeo.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      coreParticleGeo.dispose();
      coreParticleMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      ringMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [performanceTier]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      style={{
        opacity: 0.92,
      }}
    />
  );
};

export default Landing3DScene;
