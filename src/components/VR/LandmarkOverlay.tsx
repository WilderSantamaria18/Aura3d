import React, { useRef, useEffect } from 'react';
import {
  SpatialVisionService,
  type HandTrackingResult,
  type SpatialLandmark,
} from '../../services/spatialVisionService';

// Conexiones esqueléticas de la mano (21 puntos MediaPipe)
const HAND_BONES: [number, number][] = [
  // Pulgar
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Índice
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Medio
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Anular
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Meñique
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Base de la palma
  [5, 9], [9, 13], [13, 17],
];

// Conexiones básicas del torso y brazos para Pose (MediaPipe)
const POSE_BONES: [number, number][] = [
  [11, 12], // Hombros
  [11, 13], [13, 15], // Brazo izq
  [12, 14], [14, 16], // Brazo der
  [11, 23], [12, 24], [23, 24], // Torso / caderas
];

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface LandmarkOverlayProps {
  width: number;
  height: number;
  accentColor?: string;
  showTrails?: boolean;
}

export const LandmarkOverlay: React.FC<LandmarkOverlayProps> = ({
  width,
  height,
  accentColor = '#00e5ff',
  showTrails = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailsRef = useRef<TrailPoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vision = SpatialVisionService.getInstance();
    let currentHands: HandTrackingResult[] = [];
    let currentPose: SpatialLandmark[] | null = null;
    let animId: number;

    const unsubHands = vision.subscribeHands((hands) => {
      currentHands = hands;
      // Registrar puntos para trails en la punta de los dedos índice (landmark 8)
      if (showTrails && hands.length > 0) {
        hands.forEach((h) => {
          const tip = h.landmarks[8];
          if (tip) {
            // Coordenada horizontal invertida para modo espejo
            const mirrorX = (1.0 - tip.x) * width;
            const mirrorY = tip.y * height;
            trailsRef.current.push({ x: mirrorX, y: mirrorY, alpha: 1.0 });
          }
        });
      }
    });

    const unsubPose = vision.subscribePose((pose) => {
      currentPose = pose;
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // ── 1. Renderizar Trails de Puntas de Dedos ─────────────────────────────
      if (showTrails && trailsRef.current.length > 0) {
        ctx.save();
        for (let i = trailsRef.current.length - 1; i >= 0; i--) {
          const pt = trailsRef.current[i];
          pt.alpha -= 0.05; // 200ms desvanecimiento (~10 frames)
          if (pt.alpha <= 0) {
            trailsRef.current.splice(i, 1);
            continue;
          }

          // Glow exterior ligero sin shadowBlur
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6 * pt.alpha, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = pt.alpha * 0.2;
          ctx.fill();

          // Núcleo brillante
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3 * pt.alpha, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = pt.alpha * 0.7;
          ctx.fill();
        }
        ctx.restore();
      }

      // ── 2. Renderizar Esqueleto de Pose (Brazos y Torso) ────────────────────
      if (currentPose && currentPose.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;

        POSE_BONES.forEach(([i, j]) => {
          const p1 = currentPose![i];
          const p2 = currentPose![j];
          if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
            ctx.beginPath();
            ctx.moveTo((1.0 - p1.x) * width, p1.y * height);
            ctx.lineTo((1.0 - p2.x) * width, p2.y * height);
            ctx.stroke();
          }
        });

        // Nodos de hombros y codos
        [11, 12, 13, 14, 15, 16].forEach((idx) => {
          const p = currentPose![idx];
          if (p && (p.visibility ?? 1) > 0.4) {
            const px = (1.0 - p.x) * width;
            const py = p.y * height;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // ── 3. Renderizar Esqueleto de Manos (21 Landmarks de Cristal) ──────────
      if (currentHands.length > 0) {
        currentHands.forEach((hand) => {
          const points = hand.landmarks;
          if (points.length < 21) return;

          ctx.save();

          // A. Conexiones (Bisel de cristal ultrafino 0.75px)
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
          ctx.lineWidth = 0.75;
          HAND_BONES.forEach(([i, j]) => {
            const p1 = points[i];
            const p2 = points[j];
            ctx.beginPath();
            ctx.moveTo((1.0 - p1.x) * width, p1.y * height);
            ctx.lineTo((1.0 - p2.x) * width, p2.y * height);
            ctx.stroke();
          });

          // B. Puntos de landmarks (Círculos sin shadowBlur para 60 FPS fijos)
          points.forEach((pt, idx) => {
            const px = (1.0 - pt.x) * width;
            const py = pt.y * height;
            const isFingertip = [4, 8, 12, 16, 20].includes(idx);
            const isIndexTip = idx === 8;

            const pointColor = isIndexTip
              ? (hand.gesture === 'pinch' ? '#ff088a' : accentColor)
              : isFingertip
              ? '#ffffff'
              : 'rgba(0, 229, 255, 0.85)';

            // Halo suave para yemas
            if (isIndexTip || isFingertip) {
              ctx.beginPath();
              ctx.arc(px, py, isIndexTip ? 8 : 5, 0, Math.PI * 2);
              ctx.fillStyle = pointColor;
              ctx.globalAlpha = 0.25;
              ctx.fill();
            }

            // Núcleo sólido
            ctx.beginPath();
            ctx.arc(px, py, isIndexTip ? 4 : isFingertip ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            ctx.globalAlpha = 1.0;
            ctx.fill();
          });

          ctx.restore();
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      unsubHands();
      unsubPose();
      cancelAnimationFrame(animId);
    };
  }, [width, height, accentColor, showTrails]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 block"
    />
  );
};
