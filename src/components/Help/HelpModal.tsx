import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Keyboard, Sparkles, HelpCircle } from 'lucide-react';
import { KEYBOARD_SHORTCUTS, type ShortcutCategory } from '../../config/keyboardShortcuts';
import { usePlayerStore } from '../../stores/playerStore';

export const HelpModal: React.FC = () => {
  const isShortcutsModalOpen = usePlayerStore((state) => state.isShortcutsModalOpen);
  const setShortcutsModalOpen = usePlayerStore((state) => state.setShortcutsModalOpen);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ShortcutCategory | 'Todos'>('Todos');

  const CATEGORIES: (ShortcutCategory | 'Todos')[] = [
    'Todos',
    'Navegación',
    'Reproducción',
    'Visualizadores',
    'Edición',
    'Sistema',
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KEYBOARD_SHORTCUTS.filter((s) => {
      const matchesSearch =
        !q ||
        s.description.toLowerCase().includes(q) ||
        s.keys.join(' ').toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);

      const matchesCategory = activeCategory === 'Todos' || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  if (!isShortcutsModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShortcutsModalOpen(false)}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col liquid-glass liquid-glass--modal overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/25 to-blue-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-sm">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Ayuda & Atajos de Teclado</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {filtered.length} atajos
                  </span>
                </h2>
                <p className="text-[11px] text-white/50">
                  Control táctil de nivel de estudio y navegación rápida
                </p>
              </div>
            </div>

            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="pt-3 pb-2">
            <div className="relative flex items-center bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-2 text-white">
              <Search className="w-4 h-4 text-white/40 mr-2 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar atajo por acción o tecla (ej. 'reproducir', 'Cmd', 'v')..."
                className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-white/40 hover:text-white text-xs px-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20 font-bold'
                      : 'bg-white/[0.04] text-white/50 border border-white/10 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto liquid-glass-scrollbar pr-1 divide-y divide-white/[0.05]">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-xs">
                No se encontraron atajos que coincidan con "{search}".
              </div>
            ) : (
              filtered.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-white/[0.04] rounded-xl transition-colors group"
                >
                  <div className="flex flex-col pr-3">
                    <span className="text-xs font-medium text-white/90 group-hover:text-white transition-colors">
                      {shortcut.description}
                    </span>
                    <span className="text-[10px] font-mono text-white/40">
                      {shortcut.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {shortcut.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-1 rounded-lg bg-white/[0.07] border border-white/15 text-[11px] font-mono text-white/90 min-w-[26px] text-center shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40 font-mono">
            <span>Presiona ? en cualquier momento</span>
            <span>Aura3D Studio Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
