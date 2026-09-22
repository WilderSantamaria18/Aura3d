import React, { useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { exporter } from '../../services/exporter';
import { 
  Download, 
  Share2, 
  Copy, 
  ExternalLink, 
  Check, 
  FileVideo, 
  Clock, 
  HardDrive, 
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const ExportPanel: React.FC = () => {
  const recordedBlob = useRecorderStore((state) => state.recordedBlob);
  const recordingDuration = useRecorderStore((state) => state.recordingDuration);
  const aspectRatio = useRecorderStore((state) => state.aspectRatio);
  const format = useRecorderStore((state) => state.format);
  const fps = useRecorderStore((state) => state.fps);
  const trimRange = useRecorderStore((state) => state.trimRange);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const getFileSizeMB = () => {
    if (!recordedBlob) return '0.0 MB';
    return (recordedBlob.size / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDownload = () => {
    if (!recordedBlob) return;
    const filename = `Aura3D_${aspectRatio.replace(':', '_')}_${Date.now()}.${format}`;
    exporter.downloadBlob(recordedBlob, filename);
    showFeedback(`Downloaded ${filename} successfully!`);
  };

  const handleShare = async () => {
    if (!recordedBlob) return;
    setIsProcessing(true);
    const filename = `Aura3D_Share.${format}`;
    const file = exporter.createFileFromBlob(recordedBlob, filename);
    const success = await exporter.shareContent({
      title: 'Aura3D Spatial Recording',
      text: 'Check out this spatial audio visualizer recorded with Aura3D!',
      files: [file],
    });
    setIsProcessing(false);

    if (success) {
      showFeedback('Shared successfully!');
    } else {
      // If Web Share cancelled or not supported, fallback to download
      exporter.downloadBlob(recordedBlob, filename);
      showFeedback('Native sharing not available. File downloaded instead.');
    }
  };

  const handleCopy = async () => {
    if (!recordedBlob) return;
    const success = await exporter.copyBlobToClipboard(recordedBlob);
    if (success) {
      showFeedback('Copied media to clipboard!');
    } else {
      showFeedback('Direct media copy not supported on this browser.', true);
    }
  };

  const handleInstagram = () => {
    exporter.openInstagramDirect();
  };

  if (!recordedBlob) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-white/50 gap-3">
        <FileVideo className="w-12 h-12 stroke-[1.2] text-white/30" />
        <p className="text-sm font-medium">No recorded media ready to export.</p>
        <p className="text-xs text-white/40">Record a clip or create a story card first.</p>
      </div>
    );
  }

  const effectiveDuration = trimRange.end > 0 ? (trimRange.end - trimRange.start).toFixed(1) : recordingDuration.toFixed(1);

  return (
    <div className="flex flex-col gap-5 text-white">
      {/* File & Quality Telemetry Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
            <FileVideo className="w-3.5 h-3.5 text-purple-400" />
            <span>Master File Information</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
            {format}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-white/50 font-medium">Resolution</div>
            <div className="text-xs font-mono font-bold mt-0.5">
              {aspectRatio === '9:16' ? '1080×1920' : aspectRatio === '1:1' ? '1080×1080' : aspectRatio === '4:5' ? '1080×1350' : '1920×1080'}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-white/50 font-medium">Duration</div>
            <div className="text-xs font-mono font-bold mt-0.5">{effectiveDuration}s</div>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] text-white/50 font-medium">File Size</div>
            <div className="text-xs font-mono font-bold mt-0.5">{getFileSizeMB()}</div>
          </div>
        </div>
      </div>

      {/* Primary Export Actions */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={handleDownload}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white shadow-lg shadow-purple-500/25 transition-all active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>Download Video ({format.toUpperCase()})</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            disabled={isProcessing}
            className="py-3 px-3 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Share Sheet</span>
          </button>

          <button
            onClick={handleInstagram}
            className="py-3 px-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-500/30 hover:border-pink-500/50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
            <span>Open Instagram</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy Media to Clipboard</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
