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
        <div className="flex items-center gap-1 p-1 rounded-control bg-surface-subtle border border-border-subtle">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mi Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-medium transition-colors ${
              activeTab === 'performance'
                ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Rendimiento & Calidad</span>
          </button>

          {userProfile?.isGuest && (
            <button
              onClick={() => setActiveTab('auth')}
              className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-medium transition-colors ${
                activeTab === 'auth'
                  ? 'bg-ios-teal/20 text-ios-teal border border-ios-teal/40'
                  : 'text-ios-teal/70 hover:text-ios-teal'
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
            className={`p-3 rounded-control text-caption font-mono flex items-center gap-2 border ${
              feedbackMessage.type === 'success'
                ? 'bg-status-success/10 text-status-success border-status-success/20'
                : 'bg-status-error/10 text-status-error border-status-error/20'
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
            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-card bg-ios-teal/15 border border-ios-teal/30 flex items-center justify-center text-ios-teal text-lg font-mono font-bold">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'I'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-semibold text-text-primary">
                      {userProfile?.username || 'Invitado'}
                    </h3>
                    <span
                      className={`text-caption font-mono px-2 py-0.5 rounded-badge border uppercase tracking-wider ${
                        userProfile?.isGuest
                          ? 'bg-surface-subtle text-text-tertiary border-border-subtle'
                          : 'bg-status-success/15 text-status-success border-status-success/30'
                      }`}
                    >
                      {userProfile?.role === 'superadmin' ? 'SUPERADMIN' : userProfile?.isGuest ? 'INVITADO' : 'USUARIO PRO'}
                    </span>
                  </div>
                  <p className="text-caption text-text-tertiary font-mono mt-0.5">
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
                      className="min-h-11 min-w-11 rounded-control flex items-center justify-center text-text-tertiary hover:text-status-error hover:bg-status-error/10 transition-colors"
                      title="Cerrar sesión"
                      aria-label="Cerrar sesión"
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
              <div className="p-4 rounded-card bg-ios-teal/5 border border-ios-teal/20 space-y-3">
                <div className="text-caption font-mono text-ios-teal font-medium uppercase tracking-wider">
                  Editar Datos de Cuenta
                </div>
                <div>
                  <label className="text-caption font-mono text-text-tertiary block mb-1">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 rounded-control bg-surface-subtle border border-border-subtle text-text-primary text-caption font-mono focus:outline-none focus:border-ios-teal"
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
            <div className="space-y-2 p-3.5 rounded-card bg-surface-subtle border border-border-subtle">
              <div className="flex items-center justify-between text-caption font-mono">
                <span className="text-text-secondary font-medium">Géneros Musicales de Interés</span>
                <span className="text-caption text-text-tertiary">Guía para el detector de ritmos DSP</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {AVAILABLE_GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`min-h-11 px-3 py-1 rounded-control text-caption font-mono transition-all border ${
                        isSelected
                          ? 'bg-ios-teal/20 text-ios-teal border-ios-teal/40'
                          : 'bg-surface-subtle text-text-secondary border-border-subtle hover:text-text-primary'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Settings Shortcut */}
            <div className="p-3.5 rounded-card bg-surface-subtle border border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2 text-caption">
                <Sliders className="w-4 h-4 text-ios-teal" />
                <span className="text-text-secondary">Configuración Rápida de Shaders & Ecualizador</span>
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
              <div className="pt-2 border-t border-border-subtle flex justify-between items-center">
                <span className="text-caption font-mono text-text-tertiary">Zona de peligro</span>
                <button
                  onClick={handleDeleteAccount}
                  className="min-h-11 px-3 text-caption font-mono text-status-error/80 hover:text-status-error flex items-center gap-1.5 hover:underline"
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
            <div className="text-caption text-text-secondary leading-relaxed">
              Selecciona el perfil de renderizado WebGL2 adaptado a la potencia de tu equipo para garantizar 60 FPS estables sin sobrecalentamiento.
            </div>

            {/* Mode Selectors - 3 Tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Rendimiento Alto (Eco) */}
              <button
                type="button"
                onClick={() => setPerformanceTier('eco')}
                className={`min-h-11 p-3.5 rounded-card border text-left flex flex-col justify-between transition-all ${
                  performanceTier === 'eco'
                    ? 'bg-ios-teal/15 border-ios-teal shadow-sm'
                    : 'bg-surface-subtle border-border-subtle hover:bg-surface-active'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-4 h-4 ${performanceTier === 'eco' ? 'text-ios-teal' : 'text-text-tertiary'}`} />
                      <span className="text-caption font-mono font-bold text-text-primary">RENDIMIENTO ALTO</span>
                    </div>
                    {performanceTier === 'eco' && (
                      <span className="text-caption font-mono bg-ios-teal/20 text-ios-teal px-1.5 py-0.5 rounded-badge font-semibold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-caption font-mono text-text-secondary">
                    <p className="text-text-primary font-medium">Batería & Fluidez Total</p>
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
                className={`min-h-11 p-3.5 rounded-card border text-left flex flex-col justify-between transition-all ${
                  performanceTier === 'medium'
                    ? 'bg-status-warning/15 border-status-warning shadow-sm'
                    : 'bg-surface-subtle border-border-subtle hover:bg-surface-active'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Gauge className={`w-4 h-4 ${performanceTier === 'medium' ? 'text-status-warning' : 'text-text-tertiary'}`} />
                      <span className="text-caption font-mono font-bold text-text-primary">GRÁFICOS MEDIOS</span>
                    </div>
                    {performanceTier === 'medium' && (
                      <span className="text-caption font-mono bg-status-warning/20 text-status-warning px-1.5 py-0.5 rounded-badge font-semibold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-caption font-mono text-text-secondary">
                    <p className="text-text-primary font-medium">Equilibrio Óptimo</p>
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
                className={`min-h-11 p-3.5 rounded-card border text-left flex flex-col justify-between transition-all ${
                  performanceTier === 'high'
                    ? 'bg-ios-purple/15 border-ios-purple shadow-sm'
                    : 'bg-surface-subtle border-border-subtle hover:bg-surface-active'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className={`w-4 h-4 ${performanceTier === 'high' ? 'text-ios-purple' : 'text-text-tertiary'}`} />
                      <span className="text-caption font-mono font-bold text-text-primary">GRÁFICOS ALTOS</span>
                    </div>
                    {performanceTier === 'high' && (
                      <span className="text-caption font-mono bg-ios-purple/20 text-ios-purple px-1.5 py-0.5 rounded-badge font-semibold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-caption font-mono text-text-secondary">
                    <p className="text-text-primary font-medium">Ultra Fidelidad 3D</p>
                    <p>• 2,400 partículas Fibonacci (DPR 1.5)</p>
                    <p>• Bloom, sombras y ondas multicapa</p>
                    <p>• Para GPUs dedicadas NVIDIA / AMD</p>
                  </div>
                </div>
              </button>
            </div>

            {/* System Requirements Recommendation Button */}
            <div className="p-3.5 rounded-card bg-surface-subtle border border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-ios-teal" />
                <div>
                  <div className="text-caption font-medium text-text-primary">¿Tu equipo cumple los requisitos?</div>
                  <div className="text-caption font-mono text-text-tertiary">
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
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <div className="flex items-center gap-2 text-caption font-mono">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`min-h-11 px-3 pb-1 transition-colors flex items-center ${
                    authMode === 'login'
                      ? 'text-ios-teal border-b-2 border-ios-teal font-semibold'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <span className="text-text-tertiary">•</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`min-h-11 px-3 pb-1 transition-colors flex items-center ${
                    authMode === 'register'
                      ? 'text-ios-teal border-b-2 border-ios-teal font-semibold'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Crear Cuenta Nueva
                </button>
              </div>

              <span className="text-caption font-mono text-text-tertiary">
                Opcional para invitados
              </span>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="text-caption font-mono text-text-secondary block mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  placeholder="ej. WilderSantamaria26"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-control bg-surface-subtle border border-border-subtle text-text-primary text-caption font-mono focus:outline-none focus:border-ios-teal"
                />
              </div>
            )}

            <div>
              <label className="text-caption font-mono text-text-secondary block mb-1">
                {authMode === 'register' ? 'Correo Electrónico' : 'Correo o Usuario'}
              </label>
              <input
                type={authMode === 'register' ? 'email' : 'text'}
                required
                placeholder={authMode === 'register' ? 'tu@email.com' : 'usuario o email'}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full min-h-11 px-3 py-2 rounded-control bg-surface-subtle border border-border-subtle text-text-primary text-caption font-mono focus:outline-none focus:border-ios-teal"
              />
            </div>

            <div>
              <label className="text-caption font-mono text-text-secondary block mb-1">Contraseña (Mín. 8 caracteres)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full min-h-11 px-3 py-2 rounded-control bg-surface-subtle border border-border-subtle text-text-primary text-caption font-mono focus:outline-none focus:border-ios-teal"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="min-h-11 px-3 text-caption font-mono text-text-tertiary hover:text-text-secondary flex items-center"
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

export default UserProfileModal;
