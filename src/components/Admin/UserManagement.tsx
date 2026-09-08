import React, { useState, useMemo } from 'react';
import { Search, Download, Shield, UserCheck, Filter, X, Ban, CheckCircle, Trash2, Eye, Loader2 } from 'lucide-react';
import { socketService } from '../../services/socketService';

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  genres: string[];
  isActive: boolean;
  totalSessions?: number;
  lastLogin?: string;
  createdAt: string;
}

interface UserManagementProps {
  users: AdminUserRecord[];
  onExportCSV: () => void;
  onRefresh?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onExportCSV, onRefresh }) => {
  const [localUsers, setLocalUsers] = useState<AdminUserRecord[]>(users);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'superadmin' | 'admin' | 'user'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Keep local copy synced when parent prop updates
  React.useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const filteredUsers = useMemo(() => {
    return localUsers.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [localUsers, searchTerm, roleFilter]);

  const handleToggleStatus = async (user: AdminUserRecord) => {
    setActionLoadingId(user.id);
    setActionMessage(null);
    try {
      await socketService.toggleUserStatus(user.id);
      setLocalUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
      }
      setActionMessage({
        type: 'success',
        text: `Usuario ${user.username} ${user.isActive ? 'bloqueado' : 'reactivado'} correctamente.`,
      });
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al modificar estado.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente al usuario "${user.username}"?`)) {
      return;
    }

    setActionLoadingId(user.id);
    setActionMessage(null);
    try {
      await socketService.deleteUser(user.id);
      setLocalUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }
      setActionMessage({
        type: 'success',
        text: `Usuario ${user.username} eliminado correctamente.`,
      });
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al eliminar usuario.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role: AdminUserRecord['role']) => {
    switch (role) {
      case 'superadmin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-pink-500/15 text-pink-300 border border-pink-500/30 flex items-center gap-1 w-fit">
            <Shield className="w-2.5 h-2.5" /> Superadmin
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 flex items-center gap-1 w-fit">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        );
      case 'user':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-medium tracking-wider uppercase bg-white/5 text-white/70 border border-white/10 flex items-center gap-1 w-fit">
            <UserCheck className="w-2.5 h-2.5 text-white/40" /> Usuario
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono text-white select-none">
      {/* Feedback Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border backdrop-blur-md animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-white/10 rounded text-white/60"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0b0f1e]/85 border border-white/10 backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario o email..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f1e] text-white">Todos los roles</option>
              <option value="superadmin" className="bg-[#0b0f1e] text-white">Superadmin</option>
              <option value="admin" className="bg-[#0b0f1e] text-white">Admin</option>
              <option value="user" className="bg-[#0b0f1e] text-white">Usuario</option>
            </select>
          </div>
        </div>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,242,254,0.15)] w-full sm:w-auto justify-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#0b0f1e]/85 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/50 text-[10px] uppercase tracking-widest">
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Rol</th>
                <th className="p-3.5">Géneros Favoritos</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Fecha de Registro</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40 text-xs">
                    No se encontraron usuarios registrados con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-[10px] text-cyan-300 font-bold">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="tracking-wide">{user.username}</span>
                    </td>
                    <td className="p-3.5 text-white/60">{user.email}</td>
                    <td className="p-3.5">{getRoleBadge(user.role)}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {user.genres && user.genres.length > 0 ? (
                          user.genres.slice(0, 2).map((g, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/70 border border-white/5"
                            >
                              {g}
                            </span>
                          ))
                        ) : (
                          <span className="text-white/30 text-[10px]">Sin preferencias</span>
                        )}
                        {user.genres && user.genres.length > 2 && (
                          <span className="text-white/40 text-[9px]">+{user.genres.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-red-500/15 text-red-300 border border-red-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-white/40 text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-all"
                          title="Ver perfil detallado"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {user.role !== 'superadmin' && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={actionLoadingId === user.id}
                              className={`p-1.5 rounded-lg border transition-all ${
                                user.isActive
                                  ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                              title={user.isActive ? 'Bloquear usuario' : 'Reactivar usuario'}
                            >
                              {actionLoadingId === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : user.isActive ? (
                                <Ban className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={actionLoadingId === user.id}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0b0f1e]/95 border border-white/10 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4 font-mono">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-base font-bold text-white shadow-lg">
                {selectedUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">{selectedUser.username}</h3>
                <p className="text-xs text-white/50">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-white/40 block text-[10px] uppercase tracking-widest font-bold">Rol</span>
                <span className="font-bold text-cyan-300 uppercase mt-0.5 block">{selectedUser.role}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-white/40 block text-[10px] uppercase tracking-widest font-bold">Estado</span>
                <span
                  className={`font-bold mt-0.5 block ${
                    selectedUser.isActive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {selectedUser.isActive ? 'Activo' : 'Bloqueado'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 text-xs">
              <span className="text-white/40 block text-[10px] uppercase tracking-widest font-bold">
                Géneros Preferidos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedUser.genres && selectedUser.genres.length > 0 ? (
                  selectedUser.genres.map((g, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-[10px]"
                    >
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-white/40 text-[11px]">No especificado</span>
                )}
              </div>
            </div>

            <div className="pt-2 text-[10px] text-white/40 space-y-1 border-t border-white/5">
              <p>ID de Usuario: {selectedUser.id}</p>
              <p>Fecha de Creación: {new Date(selectedUser.createdAt).toLocaleString()}</p>
              {selectedUser.lastLogin && <p>Último Acceso: {new Date(selectedUser.lastLogin).toLocaleString()}</p>}
            </div>

            {selectedUser.role !== 'superadmin' && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                    selectedUser.isActive
                      ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/25'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  }`}
                >
                  {selectedUser.isActive ? (
                    <>
                      <Ban className="w-3.5 h-3.5" /> Bloquear
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Reactivar
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser)}
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
