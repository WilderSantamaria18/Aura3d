import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { socketService } from '../../services/socketService';
import { AdminDashboard } from './AdminDashboard';
import { X, Lock, Shield, User, Key, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const AdminModal: React.FC = () => {
  const { isAdminModalOpen, setAdminModalOpen, isLucid } = usePlayerStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing token on modal open
  useEffect(() => {
    if (isAdminModalOpen) {
      setIsCheckingToken(true);
      socketService
        .verifyAdminToken()
        .then((valid) => {
          setIsAuthenticated(valid);
        })
        .finally(() => {
          setIsCheckingToken(false);
        });
    }
  }, [isAdminModalOpen]);

  if (!isAdminModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Por favor ingresa usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await socketService.loginAdmin(username.trim(), password);
      setIsAuthenticated(true);
      setPassword('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    socketService.logoutAdmin();
    setIsAuthenticated(false);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)] transition-all border ${
          isLucid
            ? 'bg-[#060a17]/90 border-emerald-400/40'
            : 'bg-[#0b0f1e]/90 border-white/10 backdrop-blur-2xl'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setAdminModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all z-10 focus-visible:ring-1 focus-visible:ring-cyan-400"
          title="Cerrar panel administrativo"
        >
          <X className="w-4 h-4" />
        </button>

        {isCheckingToken ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 font-mono text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs text-white/50 tracking-widest uppercase">
              Verificando credenciales de sesión...
            </span>
          </div>
        ) : isAuthenticated ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          /* ── Admin Login Card ── */
          <div className="max-w-md mx-auto py-8 sm:py-12 flex flex-col items-center text-center font-mono">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
              <Lock className="w-6 h-6" />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-widest uppercase mb-1">
              ACCESO ADMINISTRATIVO
            </h2>
            <p className="text-xs text-white/40 mb-6">
              Autenticación requerida para telemetría, seguridad y métricas en vivo
            </p>

            {errorMessage && (
              <div className="w-full mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full space-y-3.5 text-left text-xs">
              <div>
                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block font-bold">
                  Usuario o Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin@auralis.app"
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block font-bold">
                  Contraseña
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-full font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
                  isLucid
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,242,254,0.25)]'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar al Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[10px] text-white/40">
                <span className="flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  Acceso protegido con cifrado y tokens JWT seguros
                </span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
