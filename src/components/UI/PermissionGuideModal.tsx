import React from 'react';
import { ShieldAlert, Mic, Camera, HelpCircle, ExternalLink } from 'lucide-react';
import { StudioModal } from './studio/StudioModal';
import { StudioButton } from './studio/StudioButton';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionType: 'mic' | 'camera' | 'both';
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  isOpen,
  onClose,
  permissionType,
}) => {
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title="Permisos del Sistema Requeridos"
      subtitle="Guía de diagnóstico para audio en vivo y seguimiento visual"
      badge="HARDWARE I/O"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            El navegador ha bloqueado el acceso a{' '}
            <strong className="text-amber-300">
              {permissionType === 'mic' ? 'tu micrófono' : permissionType === 'camera' ? 'tu cámara' : 'tu micrófono y cámara'}
            </strong>.
            Aura3D procesa la señal de audio y tracking de forma estrictamente local y privada en tu dispositivo (cero telemetría ni subida a servidores).
          </div>
        </div>

        {/* Diagnostic Steps */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-mono tracking-wider text-white/50 uppercase">
            Instrucciones para Desbloquear:
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-white/10 text-white/80 flex items-center justify-center text-[10px] font-mono shrink-0">1</span>
            <div className="text-xs text-white/80 leading-relaxed">
              Haz clic en el icono del <strong className="text-white">candado / sintonizador de permisos</strong> situado en la barra de direcciones del navegador (a la izquierda de la URL).
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-white/10 text-white/80 flex items-center justify-center text-[10px] font-mono shrink-0">2</span>
            <div className="text-xs text-white/80 leading-relaxed">
              Cambia el interruptor de{' '}
              {permissionType === 'mic' || permissionType === 'both' ? (
                <span className="inline-flex items-center gap-1 font-mono text-cyan-400">
                  <Mic className="w-3 h-3" /> Micrófono
                </span>
              ) : null}
              {permissionType === 'both' ? ' y ' : ''}
              {permissionType === 'camera' || permissionType === 'both' ? (
                <span className="inline-flex items-center gap-1 font-mono text-cyan-400">
                  <Camera className="w-3 h-3" /> Cámara
                </span>
              ) : null}{' '}
              a <strong className="text-emerald-400">Permitir</strong>.
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-white/10 text-white/80 flex items-center justify-center text-[10px] font-mono shrink-0">3</span>
            <div className="text-xs text-white/80 leading-relaxed">
              Recarga la página para que el motor de audio WebAudio / MediaPipe reconozca el hardware de captura.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Sin almacenamiento en la nube</span>
          </div>
          <div className="flex items-center gap-2">
            <StudioButton
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cerrar
            </StudioButton>
            <StudioButton
              variant="primary"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => window.location.reload()}
            >
              Recargar Ahora
            </StudioButton>
          </div>
        </div>
      </div>
    </StudioModal>
  );
};
