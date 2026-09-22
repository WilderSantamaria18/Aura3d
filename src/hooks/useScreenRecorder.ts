import { useCallback, useEffect } from 'react';
import { screenRecorder } from '../services/screenRecorder';
import { useRecorderStore, RESOLUTION_PRESETS } from '../store/recorderStore';
import { usePlayerStore } from '../stores/playerStore';

export const useScreenRecorder = () => {
  const {
    captureSource,
    resolutionPreset,
    customWidth,
    customHeight,
    fps,
    videoBitrate,
    durationMode,
    durationLimitSec,
    includeAudio,
    includeMic,
    isRecording,
    setIsRecording,
    elapsedSeconds,
    setElapsedSeconds,
    setRecordedVideo,
    setActiveTab,
  } = useRecorderStore();

  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Auto-stop when song ends if in 'song_end' mode
  useEffect(() => {
    if (isRecording && durationMode === 'song_end' && !isPlaying && elapsedSeconds > 2) {
      stopRecording();
    }
  }, [isPlaying, isRecording, durationMode, elapsedSeconds]);

  const startRecording = useCallback(async () => {
    try {
      const preset = RESOLUTION_PRESETS[resolutionPreset];
      const targetW = resolutionPreset === 'custom' ? customWidth : preset.width;
      const targetH = resolutionPreset === 'custom' ? customHeight : preset.height;

      setElapsedSeconds(0);
      setIsRecording(true);

      await screenRecorder.start({
        source: captureSource,
        resolution: { width: targetW, height: targetH },
        fps,
        videoBitsPerSecond: videoBitrate,
        durationMode,
        durationLimitSec: durationMode === 'manual' ? durationLimitSec : undefined,
        includeAudio,
        includeMic,
        onProgress: (sec) => {
          setElapsedSeconds(sec);
        },
        onAutoStop: async () => {
          const blob = await screenRecorder.stop();
          setIsRecording(false);
          const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
          setRecordedVideo(blob, `aura3d-${resolutionPreset}-${Date.now()}.${ext}`);
          setActiveTab('preview');
        },
      });
    } catch (err) {
      console.error('[useScreenRecorder] Start error:', err);
      setIsRecording(false);
      throw err;
    }
  }, [
    captureSource,
    resolutionPreset,
    customWidth,
    customHeight,
    fps,
    videoBitrate,
    durationMode,
    durationLimitSec,
    includeAudio,
    includeMic,
    setElapsedSeconds,
    setIsRecording,
    setRecordedVideo,
    setActiveTab,
  ]);

  const stopRecording = useCallback(async () => {
    try {
      const blob = await screenRecorder.stop();
      setIsRecording(false);
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      setRecordedVideo(blob, `aura3d-${resolutionPreset}-${Date.now()}.${ext}`);
      setActiveTab('preview');
    } catch (err) {
      console.error('[useScreenRecorder] Stop error:', err);
      setIsRecording(false);
    }
  }, [resolutionPreset, setIsRecording, setRecordedVideo, setActiveTab]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  return {
    isRecording,
    elapsedSeconds,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
