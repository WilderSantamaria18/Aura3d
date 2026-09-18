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
      className={`relative flex items-center gap-1 p-1 mx-4 mt-3 rounded-full bg-white/[0.04] border border-white/[0.09] backdrop-blur-xl shadow-inner select-none ${className}`}
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
            className="relative flex-1 py-1.5 px-2 rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
          >
            {isActive && (
              <motion.div
                layoutId="activeLibraryTab"
                className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/25 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.35),0_2px_8px_rgba(0,0,0,0.3)]"
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-1 transition-colors ${
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[9px] font-mono px-1 rounded-full ${
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
