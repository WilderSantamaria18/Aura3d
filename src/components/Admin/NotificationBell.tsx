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
    <div className="relative font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        title="Notificaciones del Sistema"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,8,138,0.5)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Card */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0b0f1e]/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-white tracking-widest uppercase">NOTIFICACIONES</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                  {unreadCount} nuevas
                </span>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="p-1.5 rounded-lg text-[10px] text-white/50 hover:text-emerald-300 hover:bg-white/5 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="p-1.5 rounded-lg text-[10px] text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors"
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
                  <Bell className="w-6 h-6 opacity-20" />
                  <span>No hay notificaciones recientes</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onMarkAsRead(notif.id)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      notif.read ? 'bg-transparent opacity-50' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                        <span className="text-[9px] text-white/40 flex-shrink-0">
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
