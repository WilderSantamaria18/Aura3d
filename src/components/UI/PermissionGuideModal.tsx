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
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-status-warning/10 border border-status-warning/20">
          <ShieldAlert className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
          <div className="text-caption text-status-warning leading-relaxed">
            El navegador ha bloqueado el acceso a{' '}
            <strong className="text-status-warning font-bold">
              {permissionType === 'mic' ? 'tu micrófono' : permissionType === 'camera' ? 'tu cámara' : 'tu micrófono y cámara'}
            </strong>.
            Aura3D procesa la señal de audio y tracking de forma estrictamente local y privada en tu dispositivo (cero telemetría ni subida a servidores).
          </div>
        </div>

        {/* Diagnostic Steps */}
        <div className="space-y-2.5">
          <div className="text-caption font-mono tracking-wider text-text-tertiary uppercase">
            Instrucciones para Desbloquear:
          </div>

          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex items-start gap-3">
            <span className="w-6 h-6 rounded-pill bg-white/10 text-text-primary flex items-center justify-center text-caption font-mono shrink-0">1</span>
            <div className="text-caption text-text-secondary leading-relaxed">
              Haz clic en el icono del <strong className="text-text-primary">candado / sintonizador de permisos</strong> situado en la barra de direcciones del navegador (a la izquierda de la URL).
            </div>
          </div>

          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex items-start gap-3">
            <span className="w-6 h-6 rounded-pill bg-white/10 text-text-primary flex items-center justify-center text-caption font-mono shrink-0">2</span>
            <div className="text-caption text-text-secondary leading-relaxed">
              Cambia el interruptor de{' '}
              {permissionType === 'mic' || permissionType === 'both' ? (
                <span className="inline-flex items-center gap-1 font-mono text-accent-teal">
                  <Mic className="w-3.5 h-3.5" /> Micrófono
                </span>
              ) : null}
              {permissionType === 'both' ? ' y ' : ''}
              {permissionType === 'camera' || permissionType === 'both' ? (
                <span className="inline-flex items-center gap-1 font-mono text-accent-teal">
                  <Camera className="w-3.5 h-3.5" /> Cámara
                </span>
              ) : null}{' '}
              a <strong className="text-status-success font-bold">Permitir</strong>.
            </div>
          </div>

          <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle flex items-start gap-3">
            <span className="w-6 h-6 rounded-pill bg-white/10 text-text-primary flex items-center justify-center text-caption font-mono shrink-0">3</span>
            <div className="text-caption text-text-secondary leading-relaxed">
              Recarga la página para que el motor de audio WebAudio / MediaPipe reconozca el hardware de captura.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-caption font-mono text-text-tertiary">
            <HelpCircle className="w-4 h-4" />
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
              icon={<ExternalLink className="w-4 h-4" />}
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
