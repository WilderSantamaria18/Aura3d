import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecorderStore, type RecorderTab } from '../../store/recorderStore';
import { ScreenCaptureSelector } from './ScreenCaptureSelector';
import { ResolutionSelector } from './ResolutionSelector';
import { DurationControl } from './DurationControl';
import { PreviewPlayer } from './PreviewPlayer';
import { ExportPanel } from './ExportPanel';
import { CardPreview } from '../Cards/CardPreview';
import { CardEditor } from '../Cards/CardEditor';
import { 
  X, 
  Video, 
  PlaySquare, 
  Sparkles, 
  Share2, 
  Radio, 
  Disc3 
} from 'lucide-react';

export const RecorderPanel: React.FC = () => {
  const isModalOpen = useRecorderStore((state) => state.isModalOpen);
  const closeModal = useRecorderStore((state) => state.closeModal);
  const activeTab = useRecorderStore((state) => state.activeTab);
  const setActiveTab = useRecorderStore((state) => state.setActiveTab);
  const isRecording = useRecorderStore((state) => state.isRecording);
  const recordedBlob = useRecorderStore((state) => state.recordedBlob);

  if (!isModalOpen) return null;

  const TABS: { id: RecorderTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'record', label: 'Record', icon: <Video className="w-3.5 h-3.5" /> },
    { 
      id: 'preview', 
      label: 'Preview', 
      icon: <PlaySquare className="w-3.5 h-3.5" />,
      badge: recordedBlob ? 'Ready' : undefined
    },
    { id: 'cards', label: 'Story Cards', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'export', label: 'Export & Share', icon: <Share2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
        {/* Dark blurred backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isRecording && closeModal()}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden bg-zinc-950/85 backdrop-blur-2xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Disc3 className="w-4 h-4 text-white animate-[spin_8s_linear_infinite]" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Aura3D Social Content Studio</span>
                  {isRecording && (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      REC
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-white/50">
                  Spatial Visualizer Capture, Video Editor & Story Cards
                </p>
              </div>
            </div>

            <button
              onClick={() => !isRecording && closeModal()}
              disabled={isRecording}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab Navigation */}
          <div className="px-6 pt-3 pb-2">
            <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-inner">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-tight transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeRecorderTab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.18] to-white/[0.06] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.4)]"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      />
                    )}
                    <span
                      className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                        isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                          {tab.badge}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'record' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                  <ScreenCaptureSelector />
                </div>
                <div className="space-y-6">
                  <ResolutionSelector />
                  <DurationControl />
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="max-w-2xl mx-auto">
                <PreviewPlayer />
              </div>
            )}

            {activeTab === 'cards' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 flex items-center justify-center">
                  <CardPreview />
                </div>
                <div className="lg:col-span-7 bg-white/[0.02] border border-white/10 rounded-2xl">
                  <CardEditor />
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="max-w-xl mx-auto">
                <ExportPanel />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
