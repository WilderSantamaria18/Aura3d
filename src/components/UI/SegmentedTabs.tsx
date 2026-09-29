import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="Secciones de la biblioteca"
      className={`relative flex items-center gap-1 p-1 mx-4 mt-3 rounded-full glass-input !p-1 !shadow-[var(--glass-shadow)] focus-within:!shadow-[var(--glass-shadow)] focus-within:!border-white/[0.14] focus-within:!border-t-white/40 select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className="relative flex-1 py-2 px-1.5 rounded-full text-[12.5px] min-h-[38px] whitespace-nowrap font-semibold tracking-tight transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
          >
            {isActive && (
              <motion.div
                layoutId="activeLibraryTab"
                className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-white/10 border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-4px_rgba(0,0,0,0.5)]"
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] font-mono px-1.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/40'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
