import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { socketService } from '../../services/socketService';
import { AdminDashboard } from './AdminDashboard';
import { X, Lock, ShieldCheck, User, Key, AlertCircle, ArrowRight } from 'lucide-react';

export const AdminModal: React.FC = () => {
  const { isAdminModalOpen, setAdminModalOpen, isLucid } = usePlayerStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing token on modal open
  useEffect(() => {
    if (isAdminModalOpen) {
      socketService.verifyAdminToken().then((valid) => {
        setIsAuthenticated(valid);
      });
    }
  }, [isAdminModalOpen]);

  if (!isAdminModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await socketService.loginAdmin(username.trim(), password.trim());
      setIsAuthenticated(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6 shadow-2xl transition-all border ${
          isLucid
            ? 'bg-[#060a17]/95 border-emerald-400/50 shadow-[0_0_50px_rgba(57,255,20,0.25)]'
            : 'bg-[#090e1c]/95 border-cyan-400/40 shadow-[0_0_50px_rgba(0,242,254,0.25)]'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setAdminModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all z-10"
          title="Cerrar panel administrativo"
        >
          <X className="w-4 h-4" />
        </button>

        {isAuthenticated ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          /* ── Admin Login Card ── */
          <div className="max-w-md mx-auto py-8 sm:py-12 flex flex-col items-center text-center font-mono">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_25px_rgba(0,242,254,0.3)]">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-widest uppercase mb-1">
              ACCESO ADMINISTRATIVO
            </h2>
            <p className="text-xs text-white/50 mb-6">
              Ingresa tus credenciales para ver telemetría y métricas en tiempo real
            </p>

            {errorMessage && (
              <div className="w-full mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full space-y-3.5 text-left text-xs">
              <div>
                <label className="text-[10px] text-white/60 uppercase tracking-wider mb-1 block">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/60 uppercase tracking-wider mb-1 block">
                  Contraseña
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin123"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
                  isLucid
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_#39FF14]'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_25px_rgba(0,242,254,0.4)]'
                }`}
              >
                <span>{isLoading ? 'Verificando...' : 'Entrar al Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-[10px] text-white/40">
                <span className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Credenciales por defecto: <strong className="text-white">admin</strong> / <strong className="text-white">admin123</strong>
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
