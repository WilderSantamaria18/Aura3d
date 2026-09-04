import React, { useState } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationBellProps {
  notifications: AdminNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'warning':
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all focus:outline-none"
        title="Notificaciones del Sistema"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_10px_#ff088a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Card */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#090e1c] border border-cyan-400/30 shadow-2xl shadow-cyan-950/80 z-50 overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white tracking-wider uppercase">Notificaciones</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {unreadCount} nuevas
                </span>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="p-1 rounded-lg text-[10px] text-white/60 hover:text-emerald-300 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="p-1 rounded-lg text-[10px] text-white/60 hover:text-red-400 transition-colors"
                    title="Limpiar todas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-xs flex flex-col items-center gap-2">
                  <Bell className="w-8 h-8 opacity-20" />
                  <span>No hay notificaciones recientes</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onMarkAsRead(notif.id)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      notif.read ? 'bg-black/20 opacity-60' : 'bg-cyan-500/5 hover:bg-cyan-500/10'
                    }`}
                  >
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                        <span className="text-[9px] text-white/40 flex-shrink-0 font-mono">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 mt-0.5 leading-snug">{notif.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;

