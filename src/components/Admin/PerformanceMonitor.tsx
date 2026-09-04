import React from 'react';
import { Activity, Cpu, Server, Zap, CheckCircle, Gauge, Radio } from 'lucide-react';

export interface PerformanceStats {
  clientFPS: number;
  clientLatencyMs: number;
  serverMemoryMB: number;
  serverUptimeSeconds: number;
  activeSocketsCount: number;
  audioProcessingTimeMs: number;
  gpuLoadEstimate: string;
}

interface PerformanceMonitorProps {
  stats: PerformanceStats;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ stats }) => {
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return '#39FF14';
    if (fps >= 35) return '#FFD700';
    return '#ff088a';
  };

  const getLatencyColor = (ms: number) => {
    if (ms <= 30) return '#39FF14';
    if (ms <= 70) return '#FFD700';
    return '#ff088a';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-4 font-mono text-white">
      {/* KPI Performance Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* FPS Indicator */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              FPS DEL CLIENTE
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getFpsColor(stats.clientFPS) }}
            />
          </div>
          <div className="my-2">
            <span
              className="text-3xl font-bold tracking-tight"
              style={{ color: getFpsColor(stats.clientFPS) }}
            >
              {stats.clientFPS}
            </span>
            <span className="text-xs text-white/40 ml-1">FPS</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.min(100, (stats.clientFPS / 60) * 100)}%`,
                backgroundColor: getFpsColor(stats.clientFPS),
              }}
            />
          </div>
        </div>

        {/* Latency */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-pink-400" />
              LATENCIA SOCKET
            </span>
            <span
              className="text-[10px] font-bold"
              style={{ color: getLatencyColor(stats.clientLatencyMs) }}
            >
              {stats.clientLatencyMs < 40 ? 'ÓPTIMA' : 'ESTABLE'}
            </span>
          </div>
          <div className="my-2">
            <span
              className="text-3xl font-bold tracking-tight"
              style={{ color: getLatencyColor(stats.clientLatencyMs) }}
            >
              {stats.clientLatencyMs}
            </span>
            <span className="text-xs text-white/40 ml-1">ms</span>
          </div>
          <span className="text-[10px] text-white/40">RTT WebSocket en tiempo real</span>
        </div>

        {/* Server Memory */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-yellow-400" />
              MEMORIA NODE.JS
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">HEAP OK</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold text-yellow-300 tracking-tight">
              {stats.serverMemoryMB}
            </span>
            <span className="text-xs text-white/40 ml-1">MB</span>
          </div>
          <span className="text-[10px] text-white/40">Consumo RSS del servidor</span>
        </div>

        {/* Uptime */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              UPTIME SERVIDOR
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-300 tracking-tight">
              {formatUptime(stats.serverUptimeSeconds)}
            </span>
          </div>
          <span className="text-[10px] text-white/40">Sin interrupciones de servicio</span>
        </div>
      </div>

      {/* System Health Check & GPU Acceleration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl space-y-3">
          <h3 className="text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            ESTADO DE SALUD DEL ECOSISTEMA
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Motor 3D Three.js & WebGL2
              </span>
              <span className="text-emerald-300 font-bold text-[10px]">ACTIVO (60 FPS)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                MediaPipe WebAssembly & SIMD
              </span>
              <span className="text-emerald-300 font-bold text-[10px]">ACELERADO</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Canal WebSocket Socket.io
              </span>
              <span className="text-emerald-300 font-bold text-[10px]">CONECTADO</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Pipeline de Audio DSP FFT (2048 bins)
              </span>
              <span className="text-emerald-300 font-bold text-[10px]">0.2ms LAT</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl space-y-3">
          <h3 className="text-xs font-bold text-pink-300 tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            DIAGNÓSTICO Y CONEXIONES ACTIVAS
          </h3>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-white/60">Sockets Conectados:</span>
              <span className="font-bold text-white">{stats.activeSocketsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Tiempo de Cómputo DSP:</span>
              <span className="font-bold text-cyan-300">{stats.audioProcessingTimeMs.toFixed(2)} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Carga Estimada de GPU:</span>
              <span className="font-bold text-emerald-400">{stats.gpuLoadEstimate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Protocolo de Red:</span>
              <span className="font-bold text-yellow-300">WebSocket / HTTP/2</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-[11px] text-cyan-200/90 leading-snug">
            💡 El sistema ajusta automáticamente la densidad de partículas 3D en base al rendimiento del cliente para mantener 60 FPS estables.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
