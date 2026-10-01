import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, UserRound, Wand2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../stores/playerStore';
import { useRecorderStore } from '../../store/recorderStore';
import { fileToAvatarDataUrl } from '../../services/storyCard/assets';
import { MAX_HANDLE, sanitizeHandle, suggestHandle } from '../../services/storyCard/config';
import { FOCUS_RING, Section, Segmented, Switch, TextField } from './controls';

/**
 * Perfil del usuario en la tarjeta: foto y @usuario de Instagram, como insignia de cristal o como
 * firma discreta. Se guarda en este navegador junto al resto de preferencias del estudio.
 */
export const CardProfileSection: React.FC = () => {
  const profile = useRecorderStore((s) => s.cardConfig.profile);
  const updateCardProfile = useRecorderStore((s) => s.updateCardProfile);
  const { username, isGuest } = usePlayerStore(
    useShallow((s) => ({ username: s.userProfile?.username, isGuest: s.userProfile?.isGuest }))
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestion = suggestHandle(username, isGuest);
  const canUseSuggestion = suggestion !== '' && suggestion !== profile.handle;

  const toggle = (show: boolean) => {
    // Al activarlo por primera vez se propone el usuario de Aura (si no es un invitado)
    updateCardProfile({ show, ...(show && !profile.handle && suggestion ? { handle: suggestion } : {}) });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      updateCardProfile({ avatar: await fileToAvatarDataUrl(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = ''; // permite elegir de nuevo el mismo archivo
    }
  };

  const initial = (profile.handle[0] || 'A').toUpperCase();
  const btn = `inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${FOCUS_RING}`;

  return (
    <Section
      title="Tu perfil"
      icon={<UserRound className="h-3.5 w-3.5" />}
      hint="Firma la tarjeta con tu foto y tu usuario de Instagram para que te reconozcan al compartirla."
    >
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <Switch checked={profile.show} onChange={toggle} label="Mostrar mi perfil en la tarjeta" />

        {profile.show && (
          <div className="space-y-4 border-t border-white/8 pt-4">
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-gradient-to-br from-violet-500 to-sky-400 text-xl font-bold text-white"
                aria-hidden="true"
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                  className={`${btn} border-white/15 bg-white/[0.06] text-white/85 hover:bg-white/12 disabled:opacity-50`}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {profile.avatar ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {profile.avatar && (
                  <button
                    type="button"
                    onClick={() => updateCardProfile({ avatar: null })}
                    className={`${btn} border-white/10 bg-transparent text-white/55 hover:bg-white/8 hover:text-white`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                  aria-label="Subir foto de perfil"
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}

            <TextField
              label="Usuario de Instagram"
              prefix="@"
              value={profile.handle}
              maxLength={MAX_HANDLE + 1}
              placeholder="tuusuario"
              onChange={(v) => updateCardProfile({ handle: sanitizeHandle(v) })}
              hint="Solo letras, números, punto y guion bajo. Sin la arroba."
            />

            {canUseSuggestion && (
              <button
                type="button"
                onClick={() => updateCardProfile({ handle: suggestion })}
                className={`${btn} border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Usar mi usuario de Aura (@{suggestion})
              </button>
            )}

            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/65">Estilo</span>
              <Segmented
                label="Estilo del perfil"
                value={profile.style}
                onChange={(style) => updateCardProfile({ style })}
                options={[
                  { value: 'badge', label: 'Insignia', sub: 'Pastilla de cristal' },
                  { value: 'signature', label: 'Firma', sub: 'Discreta, sin fondo' },
                ]}
              />
            </div>

            {!profile.handle && !profile.avatar && (
              <p className="text-xs text-amber-200/80">Añade un usuario o una foto para que aparezca en la tarjeta.</p>
            )}
          </div>
        )}
      </div>
    </Section>
  );
};
