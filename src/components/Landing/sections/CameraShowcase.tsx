import React, { useEffect, useRef } from 'react';
import { Camera, Hand, Radio, Sparkles, Activity, ArrowRight } from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';

interface CameraShowcaseProps {
  onStartExperience: () => void;
}

export const CameraShowcase: React.FC<CameraShowcaseProps> = ({
  onStartExperience,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Kinetic MediaPipe 21 Hand Landmarks Simulator Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 10;

      // Simulated hand palm and 5 fingers with 21 joints
      const joints: { x: number; y: number }[] = [];
      const wrist = { x: cx, y: cy + 70 + Math.sin(t) * 4 };
      joints.push(wrist);

      // 5 fingers: thumb, index, middle, ring, pinky
      const fingerAngles = [-0.65, -0.3, 0, 0.3, 0.6];
      const fingerLengths = [50, 75, 85, 75, 60];

      fingerAngles.forEach((ang, fIdx) => {
        let prevX = wrist.x;
        let prevY = wrist.y;
        const totalLen = fingerLengths[fIdx];
        const segLen = totalLen / 4;

        for (let seg = 1; seg <= 4; seg++) {
          const wave = Math.sin(t * 2 + fIdx * 0.8 + seg) * 6;
          const curX = prevX + Math.sin(ang) * segLen + wave * 0.3;
          const curY = prevY - Math.cos(ang) * segLen + (seg === 4 ? wave : 0);
          joints.push({ x: curX, y: curY });
          prevX = curX;
          prevY = curY;
        }
      });

      // Connect skeleton bones
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Bones between segments
      for (let f = 0; f < 5; f++) {
        const baseIdx = 1 + f * 4;
        ctx.moveTo(wrist.x, wrist.y);
        ctx.lineTo(joints[baseIdx].x, joints[baseIdx].y);
        for (let s = 0; s < 3; s++) {
          ctx.moveTo(joints[baseIdx + s].x, joints[baseIdx + s].y);
          ctx.lineTo(joints[baseIdx + s + 1].x, joints[baseIdx + s + 1].y);
        }
      }
      ctx.stroke();

      // Render 21 Glowing Landmarks
      joints.forEach((pt, idx) => {
        ctx.beginPath();
        const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;
        const r = isTip ? 5.5 : 3.5;
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#00e5ff' : '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = isTip ? 16 : 8;
        ctx.fill();

        // Tip ripple effect
        if (isTip) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r + 4 + Math.sin(t * 3 + idx) * 2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Columna Izquierda: Canvas Landmark Preview */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="landing-v2-preview-card w-full max-w-[500px] aspect-[4/3] flex flex-col p-6 items-center justify-between group relative">
          <div className="w-full flex items-center justify-between z-10">
            <GlassBadge label="MEDIAPIPE HANDS • 21 LANDMARKS" ledColor="green" />
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <Camera className="w-3.5 h-3.5" />
              <span>30 FPS ML VISION</span>
            </div>
          </div>

          {/* Camera Frame Simulation */}
          <div className="relative w-full flex-1 flex items-center justify-center my-2">
            <canvas
              ref={canvasRef}
              width={380}
              height={280}
              className="w-full h-full max-h-[260px] pointer-events-none drop-shadow-[0_0_30px_rgba(0,229,255,0.4)]"
            />
            {/* Grid Scanlines */}
            <div className="absolute inset-0 bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
          </div>

          <div className="w-full flex items-center justify-between text-[10px] font-mono text-white/50 border-t border-white/[0.08] pt-3 z-10">
            <span>MODO AIR SYNTH</span>
            <span className="text-cyan-400">LATENCIA &lt; 15MS</span>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Explicación */}
      <div className="lg:col-span-5 flex flex-col items-start gap-4">
        <GlassBadge label="05 • COMPUTER VISION STUDIO" ledColor="cyan" />

        <h2 className="landing-v2-section-title">
          Toca en el aire
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400">
            Tu cámara es un sintetizador.
          </span>
        </h2>

        <p className="landing-v2-section-description">
          Mediante MediaPipe Hands y Pose Detection nativos, Aura3D rastrea
          tus dedos en 3 dimensiones sin necesidad de sensores externos.
          Controla filtros de frecuencia, activa baterías y modula efectos en el espacio.
        </p>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <div className="landing-v2-feature">
            <Hand className="landing-v2-feature-icon" />
            <span>Air Synth 3D: modulación de pitch y cutoff por altura de manos</span>
          </div>
          <div className="landing-v2-feature">
            <Radio className="landing-v2-feature-icon" />
            <span>Air Drums: pads de percusión virtuales por impacto gestual</span>
          </div>
          <div className="landing-v2-feature">
            <Activity className="landing-v2-feature-icon" />
            <span>Captura fotográfica y vídeo ProRes/WebM con encuadre de estudio</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartExperience}
          className="mt-4 landing-v2-cta-secondary group"
        >
          <span>Probar instrumentos gestuales</span>
          <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
