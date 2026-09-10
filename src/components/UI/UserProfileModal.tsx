import React, { useState, useEffect } from 'react';
import {
  User,
  Gauge,
  Zap,
  CheckCircle,
  LogOut,
  Trash2,
  Lock,
  Sliders,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import { StudioModal } from './studio/StudioModal';
import { StudioButton } from './studio/StudioButton';
import { usePlayerStore } from '../../stores/playerStore';
import { StorageService } from '../../services/storageService';

const AVAILABLE_GENRES = [
  'Electrónica / EDM',
  'Synthwave',
  'Hip-Hop / Trap',
  'Pop / Moderno',
  'Rock / Metal',
  'Reggaeton / Urbano',
  'Clásica / Acústica',
  'Ambient / Chill',
];

export const UserProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    setProfileModalOpen,
    userProfile,
    setUserProfile,
    performanceTier,
    setPerformanceTier,
    setSysReqModalOpen,
    toggleVisualizerSettings,
    setEqualizerOpen,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'performance' | 'auth'>('profile');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form states for login/register
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');

  // Check saved token on mount to restore user session if available
  useEffect(() => {
    const token = StorageService.getUserToken();
    if (token && userProfile?.isGuest) {
      fetch('http://localhost:4000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.id) {
            setUserProfile({
              id: data.id,
              username: data.username,
              email: data.email,
              role: data.role || 'user',
              isGuest: false,
              genres: data.genres || [],
            });
          }
        })
        .catch(() => {
          // Keep guest session fallback
        });
    }
  }, [userProfile?.isGuest, setUserProfile]);

  useEffect(() => {
    if (userProfile && !userProfile.isGuest) {
      setEditUsername(userProfile.username);
      setSelectedGenres(userProfile.genres || []);
    }
  }, [userProfile]);

  if (!isProfileModalOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);
    setIsSubmitting(true);

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload =
      authMode === 'register'
        ? { username: usernameInput.trim(), email: emailInput.trim(), password: passwordInput, genres: selectedGenres }
        : { email: emailInput.trim(), username: emailInput.trim(), password: passwordInput };

    try {
      const res = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al autenticar');
      }

      if (data.token) {
        StorageService.saveUserToken(data.token);
      }

      const verifiedUser = {
        id: data.userId || data.user?.id || 'usr_registered',
        username: data.username || data.user?.username || usernameInput || 'Usuario Aura',
        email: data.email || data.user?.email || emailInput,
        role: data.user?.role || 'user',
        isGuest: false,
        genres: data.user?.genres || selectedGenres,
      };

      setUserProfile(verifiedUser);
      setFeedbackMessage({
        type: 'success',
        text: authMode === 'register' ? '¡Cuenta creada con éxito! Bienvenido a Aura3D.' : 'Sesión iniciada correctamente.',
      });
      setPasswordInput('');
      setTimeout(() => {
        setActiveTab('profile');
        setFeedbackMessage(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error en la conexión con el servidor',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async () => {
    const token = StorageService.getUserToken();
    if (!token) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('http://localhost:4000/api/auth/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editUsername.trim(),
          genres: selectedGenres,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');

      if (userProfile) {
        setUserProfile({
          ...userProfile,
          username: editUsername.trim(),
          genres: selectedGenres,
        });
      }
      setIsEditingProfile(false);
      setFeedbackMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar cambios',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu cuenta permanentemente?')) return;

    const token = StorageService.getUserToken();
    if (!token) return;

    try {
      const res = await fetch('http://localhost:4000/api/auth/profile', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        StorageService.removeUserToken();
        setUserProfile({
          id: 'usr_guest',
          username: 'Invitado',
          role: 'guest',
          isGuest: true,
          genres: ['Electrónica / EDM'],
        });
        setFeedbackMessage({ type: 'success', text: 'Cuenta eliminada. Modo invitado activado.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'No se pudo eliminar la cuenta' });
    }
  };

  const handleLogout = () => {
    StorageService.removeUserToken();
    setUserProfile({
      id: 'usr_guest',
      username: 'Invitado',
      role: 'guest',
      isGuest: true,
      genres: ['Electrónica / EDM'],
    });
    setActiveTab('profile');
    setFeedbackMessage({ type: 'success', text: 'Sesión cerrada. Has vuelto al modo Invitado.' });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  return (
    <StudioModal
      isOpen={isProfileModalOpen}
      onClose={() => setProfileModalOpen(false)}
      title="Perfil & Configuración de Estudio"
      subtitle="Gestión de cuenta, preferencias sonoras y optimización gráfica"
      badge={userProfile?.isGuest ? 'MODO INVITADO' : 'CUENTA REGISTRADA'}
      maxWidth="2xl"
    >
      <div className="space-y-4 select-none">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mi Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'performance'
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Rendimiento & Calidad</span>
          </button>

          {userProfile?.isGuest && (
            <button
              onClick={() => setActiveTab('auth')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'auth'
                  ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30'
                  : 'text-cyan-400/70 hover:text-cyan-300'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Crear Cuenta / Login</span>
            </button>
          )}
        </div>

        {/* Feedback Alert Message */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 border ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* ── TAB 1: PERFIL & DATOS ── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Header User Card */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 text-lg font-mono font-bold">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'I'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {userProfile?.username || 'Invitado'}
                    </h3>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                        userProfile?.isGuest
                          ? 'bg-white/5 text-white/50 border-white/10'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {userProfile?.role === 'superadmin' ? 'SUPERADMIN' : userProfile?.isGuest ? 'INVITADO' : 'USUARIO PRO'}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 font-mono mt-0.5">
                    {userProfile?.email || 'Sesión local sin registro (acceso total a funciones)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {!userProfile?.isGuest ? (
                  <>
                    <StudioButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                    >
                      {isEditingProfile ? 'Cancelar' : 'Editar'}
                    </StudioButton>
                    <button
                      onClick={handleLogout}
                      className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Cerrar sesión"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <StudioButton
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('auth')}
                  >
                    Vincular Cuenta
                  </StudioButton>
                )}
              </div>
            </div>

            {/* Profile Edit Form */}
            {isEditingProfile && !userProfile?.isGuest && (
              <div className="p-4 rounded-xl bg-cyan-400/[0.02] border border-cyan-400/20 space-y-3">
                <div className="text-xs font-mono text-cyan-300 font-medium uppercase tracking-wider">
                  Editar Datos de Cuenta
                </div>
                <div>
                  <label className="text-[11px] font-mono text-white/50 block mb-1">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <StudioButton
                    variant="primary"
                    size="sm"
                    loading={isSubmitting}
                    onClick={handleUpdateProfile}
                  >
                    Guardar Cambios
                  </StudioButton>
                </div>
              </div>
            )}

            {/* Preferred Musical Genres */}
            <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70 font-medium">Géneros Musicales de Interés</span>
                <span className="text-[10px] text-white/40">Guía para el detector de ritmos DSP</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {AVAILABLE_GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                        isSelected
                          ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/40'
                          : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Settings Shortcut */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-white/80">Configuración Rápida de Shaders & Ecualizador</span>
              </div>
              <div className="flex items-center gap-2">
                <StudioButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setProfileModalOpen(false);
                    setEqualizerOpen(true);
                  }}
                >
                  Ecualizador
                </StudioButton>
                <StudioButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setProfileModalOpen(false);
                    toggleVisualizerSettings();
                  }}
                >
                  Shaders
                </StudioButton>
              </div>
            </div>

            {/* Account Deletion (Registered users only) */}
            {!userProfile?.isGuest && userProfile?.role !== 'superadmin' && (
              <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center">
                <span className="text-[11px] font-mono text-white/40">Zona de peligro</span>
                <button
                  onClick={handleDeleteAccount}
                  className="text-xs font-mono text-rose-400/80 hover:text-rose-400 flex items-center gap-1.5 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar mi cuenta
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: RENDIMIENTO & CALIDAD GRÁFICA ── */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="text-xs text-white/70 leading-relaxed">
              Selecciona el perfil de renderizado WebGL2 adaptado a la potencia de tu equipo para garantizar 60 FPS estables sin sobrecalentamiento.
            </div>

            {/* Mode Selectors - 3 Tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Rendimiento Alto (Eco) */}
              <button
                type="button"
                onClick={() => setPerformanceTier('eco')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  performanceTier === 'eco'
                    ? 'bg-cyan-400/[0.08] border-cyan-400 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-4 h-4 ${performanceTier === 'eco' ? 'text-cyan-400' : 'text-white/40'}`} />
                      <span className="text-xs font-mono font-bold text-white">RENDIMIENTO ALTO</span>
                    </div>
                    {performanceTier === 'eco' && (
                      <span className="text-[9px] font-mono bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded font-semibold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-white/60">
                    <p className="text-white/85 font-medium">Batería & Fluidez Total</p>
                    <p>• 900 partículas reactivas (DPR 0.85)</p>
                    <p>• Mínimo consumo térmico y de CPU</p>
                    <p>• Para laptops en batería y móviles</p>
                  </div>
                </div>
              </button>

              {/* Option 2: Gráficos Medios (Balanced) */}
              <button
                type="button"
                onClick={() => setPerformanceTier('medium')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  performanceTier === 'medium'
                    ? 'bg-amber-400/[0.08] border-amber-400 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Gauge className={`w-4 h-4 ${performanceTier === 'medium' ? 'text-amber-400' : 'text-white/40'}`} />
                      <span className="text-xs font-mono font-bold text-white">GRÁFICOS MEDIOS</span>
                    </div>
                    {performanceTier === 'medium' && (
                      <span className="text-[9px] font-mono bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-white/60">
                    <p className="text-white/85 font-medium">Equilibrio Óptimo</p>
                    <p>• 1,600 partículas en WebGL2 (DPR 1.0)</p>
                    <p>• Shaders dinámicos balanceados</p>
                    <p>• Para GPUs integradas modernas</p>
                  </div>
                </div>
              </button>

              {/* Option 3: Gráficos Altos (High Fidelity) */}
              <button
                type="button"
                onClick={() => setPerformanceTier('high')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  performanceTier === 'high'
                    ? 'bg-purple-500/[0.08] border-purple-400 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className={`w-4 h-4 ${performanceTier === 'high' ? 'text-purple-400' : 'text-white/40'}`} />
                      <span className="text-xs font-mono font-bold text-white">GRÁFICOS ALTOS</span>
                    </div>
                    {performanceTier === 'high' && (
                      <span className="text-[9px] font-mono bg-purple-400/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-white/60">
                    <p className="text-white/85 font-medium">Ultra Fidelidad 3D</p>
                    <p>• 2,400 partículas Fibonacci (DPR 1.5)</p>
                    <p>• Bloom, sombras y ondas multicapa</p>
                    <p>• Para GPUs dedicadas NVIDIA / AMD</p>
                  </div>
                </div>
              </button>
            </div>

            {/* System Requirements Recommendation Button */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-medium text-white">¿Tu equipo cumple los requisitos?</div>
                  <div className="text-[11px] font-mono text-white/50">
                    Verifica si cuentas con el hardware recomendado para una experiencia 3D óptima.
                  </div>
                </div>
              </div>
              <StudioButton
                variant="secondary"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => setSysReqModalOpen(true)}
              >
                Ver Requisitos
              </StudioButton>
            </div>
          </div>
        )}

        {/* ── TAB 3: AUTH (REGISTRO & LOGIN) ── */}
        {activeTab === 'auth' && (
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`pb-1 transition-colors ${
                    authMode === 'login'
                      ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`pb-1 transition-colors ${
                    authMode === 'register'
                      ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Crear Cuenta Nueva
                </button>
              </div>

              <span className="text-[10px] font-mono text-white/40">
                Opcional para invitados
              </span>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  placeholder="ej. WilderSantamaria26"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1">
                {authMode === 'register' ? 'Correo Electrónico' : 'Correo o Usuario'}
              </label>
              <input
                type={authMode === 'register' ? 'email' : 'text'}
                required
                placeholder={authMode === 'register' ? 'tu@email.com' : 'usuario o email'}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1">Contraseña (Mín. 8 caracteres)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-xs font-mono text-white/40 hover:text-white/70"
              >
                Continuar como Invitado
              </button>
              <StudioButton
                variant="primary"
                size="sm"
                loading={isSubmitting}
              >
                {authMode === 'register' ? 'Registrarme' : 'Entrar'}
              </StudioButton>
            </div>
          </form>
        )}
      </div>
    </StudioModal>
  );
};
