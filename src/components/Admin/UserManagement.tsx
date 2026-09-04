import React, { useState, useMemo } from 'react';
import { Search, Download, Shield, UserCheck, Filter, X } from 'lucide-react';

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
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onExportCSV }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'superadmin' | 'admin' | 'user'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleBadge = (role: AdminUserRecord['role']) => {
    switch (role) {
      case 'superadmin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1">
            <Shield className="w-3 h-3" /> SUPERADMIN
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
        );
      case 'user':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> USUARIO
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario o email..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#090e1c] text-white">Todos los roles</option>
              <option value="superadmin" className="bg-[#090e1c] text-white">Superadmin</option>
              <option value="admin" className="bg-[#090e1c] text-white">Admin</option>
              <option value="user" className="bg-[#090e1c] text-white">Usuario</option>
            </select>
          </div>
        </div>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,242,254,0.2)] w-full sm:w-auto justify-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Usuarios (CSV)</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/60 text-[10px] uppercase">
                <th className="p-3">Usuario</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Géneros Favoritos</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Fecha de Registro</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40 text-xs">
                    No se encontraron usuarios con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/30 to-pink-500/30 border border-white/15 flex items-center justify-center text-[10px] text-cyan-300">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{user.username}</span>
                    </td>
                    <td className="p-3 text-white/70">{user.email}</td>
                    <td className="p-3">{getRoleBadge(user.role)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {user.genres && user.genres.length > 0 ? (
                          user.genres.slice(0, 2).map((g, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 text-white/80 border border-white/10"
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
                    <td className="p-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ACTIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-red-500/20 text-red-300 border border-red-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> INACTIVO
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-white/50 text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-white hover:text-cyan-300 border border-white/10 hover:border-cyan-400/30 text-[11px] transition-all"
                      >
                        Ver Perfil
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#090e1c] border border-cyan-400/40 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                {selectedUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{selectedUser.username}</h3>
                <p className="text-xs text-white/50">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-white/40 block text-[10px]">Rol</span>
                <span className="font-bold text-cyan-300 uppercase">{selectedUser.role}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-white/40 block text-[10px]">Estado</span>
                <span className="font-bold text-emerald-400">{selectedUser.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
              <span className="text-white/40 block text-[10px]">Géneros Musicales Preferidos</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedUser.genres && selectedUser.genres.length > 0 ? (
                  selectedUser.genres.map((g, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px]">
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-white/40 text-[11px]">No especificado</span>
                )}
              </div>
            </div>

            <div className="pt-2 text-[10px] text-white/40 space-y-1">
              <p>ID de Usuario: {selectedUser.id}</p>
              <p>Fecha de Creación: {new Date(selectedUser.createdAt).toLocaleString()}</p>
              {selectedUser.lastLogin && <p>Último Acceso: {new Date(selectedUser.lastLogin).toLocaleString()}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
