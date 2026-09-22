import { useState, useRef, useEffect, useCallback } from 'react';
import { useRecorderStore } from '../store/recorderStore';

export interface UseVideoPreviewReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isMuted: boolean;
  volume: number;
  trimStart: number;
  trimEnd: number;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setTrimRange: (start: number, end: number) => void;
  resetTrim: () => void;
}

export const useVideoPreview = (): UseVideoPreviewReturn => {
  const recordedBlob = useRecorderStore((state) => state.recordedBlob);
  const recordedBlobUrl = useRecorderStore((state) => state.recordedBlobUrl);
  const trimRange = useRecorderStore((state) => state.trimRange);
  const setTrimRangeStore = useRecorderStore((state) => state.setTrimRange);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(1);

  // Sync loaded metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration || 0;
      setDuration(dur);
      if (trimRange.end === 0 || trimRange.end > dur) {
        setTrimRangeStore(trimRange.start, dur);
      }
    };

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      setCurrentTime(cur);

      // Enforce trim end loop/pause
      if (trimRange.end > 0 && cur >= trimRange.end) {
        video.currentTime = trimRange.start;
        video.pause();
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (trimRange.start > 0) {
        video.currentTime = trimRange.start;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [trimRange.start, trimRange.end, setTrimRangeStore]);

  // Handle URL change
  useEffect(() => {
    if (videoRef.current && recordedBlobUrl) {
      videoRef.current.src = recordedBlobUrl;
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [recordedBlobUrl]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (currentTime >= (trimRange.end || duration)) {
        video.currentTime = trimRange.start;
      }
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [currentTime, trimRange.start, trimRange.end, duration]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(video.duration || 0, time));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback((val: number) => {
    const video = videoRef.current;
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (video) {
      video.volume = clamped;
      video.muted = clamped === 0;
      setIsMuted(clamped === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    setPlaybackRateState(rate);
    if (video) {
      video.playbackRate = rate;
    }
  }, []);

  const setTrimRange = useCallback((start: number, end: number) => {
    setTrimRangeStore(start, end);
    const video = videoRef.current;
    if (video && (video.currentTime < start || video.currentTime > end)) {
      video.currentTime = start;
      setCurrentTime(start);
    }
  }, [setTrimRangeStore]);

  const resetTrim = useCallback(() => {
    setTrimRangeStore(0, duration);
  }, [duration, setTrimRangeStore]);

  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isMuted,
    volume,
    trimStart: trimRange.start,
    trimEnd: trimRange.end || duration,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setTrimRange,
    resetTrim,
  };
};
