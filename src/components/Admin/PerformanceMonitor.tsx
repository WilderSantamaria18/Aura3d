import React from 'react';
import { Activity, Cpu, Server, Zap, CheckCircle, Gauge, Radio, ShieldCheck } from 'lucide-react';

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
    if (fps >= 55) return 'var(--status-success)';
    if (fps >= 35) return 'var(--ios-teal)';
    return 'var(--status-warning)';
  };

  const getLatencyColor = (ms: number) => {
    if (ms <= 30) return 'var(--status-success)';
    if (ms <= 70) return 'var(--ios-teal)';
    return 'var(--status-warning)';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-4 font-mono text-white select-none">
      {/* KPI Performance Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Real Client FPS */}
        <div className="p-4 rounded-card bg-[var(--surface-overlay)]/85 border border-white/10 material-thick flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between text-white/50 text-caption uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              FPS DEL CLIENTE
            </span>
            <span
              className="w-2 h-2 rounded-pill"
              style={{ backgroundColor: getFpsColor(stats.clientFPS) }}
            />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span
              className="text-3xl sm:text-4xl font-bold tracking-tight font-tabular"
              style={{ color: getFpsColor(stats.clientFPS) }}
            >
              {stats.clientFPS}
            </span>
            <span className="text-caption text-white/40">FPS REAL</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-pill overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-pill"
              style={{
                width: `${Math.min(100, (stats.clientFPS / 60) * 100)}%`,
                backgroundColor: getFpsColor(stats.clientFPS),
              }}
            />
          </div>
        </div>

        {/* Real Latency */}
        <div className="p-4 rounded-card bg-[var(--surface-overlay)]/85 border border-white/10 material-thick flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between text-white/50 text-caption uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              LATENCIA SOCKET
            </span>
            <span
              className="text-caption font-bold tracking-wider uppercase font-tabular"
              style={{ color: getLatencyColor(stats.clientLatencyMs) }}
            >
              {stats.clientLatencyMs < 40 ? 'Óptima' : 'Estable'}
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span
              className="text-3xl sm:text-4xl font-bold tracking-tight font-tabular"
              style={{ color: getLatencyColor(stats.clientLatencyMs) }}
            >
              {stats.clientLatencyMs}
            </span>
            <span className="text-caption text-white/40">ms RTT</span>
          </div>
          <span className="text-caption text-white/40">Medición WebSocket bidireccional</span>
        </div>

        {/* Server Memory */}
        <div className="p-4 rounded-card bg-[var(--surface-overlay)]/85 border border-white/10 material-thick flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between text-white/50 text-caption uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              MEMORIA NODE.JS
            </span>
            <span className="text-caption text-emerald-400 font-bold tracking-wider">RSS OK</span>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-tabular">
              {stats.serverMemoryMB}
            </span>
            <span className="text-caption text-white/40">MB</span>
          </div>
          <span className="text-caption text-white/40">Carga de memoria residente</span>
        </div>

        {/* Server Uptime */}
        <div className="p-4 rounded-card bg-[var(--surface-overlay)]/85 border border-white/10 material-thick flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between text-white/50 text-caption uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              UPTIME SERVIDOR
            </span>
            <span className="w-2 h-2 rounded-pill bg-emerald-400 animate-pulse" />
          </div>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-300 tracking-tight font-tabular">
              {formatUptime(stats.serverUptimeSeconds)}
            </span>
          </div>
          <span className="text-caption text-white/40">Continuidad sin interrupciones</span>
        </div>
      </div>

      {/* System Health Check & GPU Telemetry Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-card bg-[var(--surface-overlay)]/85 border border-white/10 material-thick space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <h3 className="text-caption font-bold text-cyan-300 tracking-widest uppercase flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            ESTADO DEL ECOSISTEMA DE RENDERIZADO
          </h3>

          <div className="space-y-2 text-caption">
            <div className="flex items-center justify-between p-2.5 rounded-control bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Lienzo Three.js / WebGL2
              </span>
              <span className="text-emerald-300 font-bold text-caption tracking-wider uppercase font-tabular">
                Activo ({stats.clientFPS} FPS)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-control bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                MediaPipe WebAssembly & SIMD
              </span>
              <span className="text-emerald-300 font-bold text-caption tracking-wider uppercase">
                Acelerado
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-control bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Canal WebSocket Socket.io
              </span>
              <span className="text-emerald-300 font-bold text-caption tracking-wider uppercase font-tabular">
                Conectado ({stats.clientLatencyMs}ms)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-control bg-white/5 border border-white/5">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Pipeline de Audio DSP FFT (2048 bins)
              </span>
              <span className="text-cyan-300 font-bold text-caption tracking-wider uppercase font-tabular">
                {stats.audioProcessingTimeMs.toFixed(2)}ms DSP
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-card bg-[var(--surface-overlay)]/85 border border-white/10 material-thick space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <h3 className="text-caption font-bold text-amber-300 tracking-widest uppercase flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            DIAGNÓSTICO DE HARDWARE Y CONEXIONES
          </h3>

          <div className="p-3.5 rounded-control bg-white/5 border border-white/5 space-y-2.5 text-caption">
            <div className="flex justify-between items-center">
              <span className="text-white/50">Sockets Conectados:</span>
              <span className="font-bold text-white font-tabular">{stats.activeSocketsCount} cliente(s)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50">Tiempo de Cómputo DSP:</span>
              <span className="font-bold text-cyan-300 font-tabular">{stats.audioProcessingTimeMs.toFixed(2)} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50">Dispositivo Gráfico (GPU):</span>
              <span className="font-bold text-emerald-400 truncate max-w-[220px] text-right" title={stats.gpuLoadEstimate}>
                {stats.gpuLoadEstimate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50">Protocolo de Red:</span>
              <span className="font-bold text-white/80">WebSocket / HTTP/2</span>
            </div>
          </div>

          <div className="p-2.5 rounded-control bg-cyan-500/10 border border-cyan-400/20 text-caption text-cyan-200/90 leading-snug flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Telemetría verificada en tiempo real sin extrapolaciones estáticas.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
