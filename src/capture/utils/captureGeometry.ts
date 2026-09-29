import type { CaptureAspectRatio, CaptureResolution } from '../types';

export interface Dimensions {
  width: number;
  height: number;
}

export function getCaptureDimensions(
  aspectRatio: CaptureAspectRatio,
  resolution: CaptureResolution
): Dimensions {
  const is4k = resolution === '4k';

  switch (aspectRatio) {
    case '9:16':
      return is4k ? { width: 2160, height: 3840 } : { width: 1080, height: 1920 };
    case '1:1':
      return is4k ? { width: 2160, height: 2160 } : { width: 1080, height: 1080 };
    case '4:5':
      return is4k ? { width: 1728, height: 2160 } : { width: 1080, height: 1350 };
    case '16:9':
    default:
      return is4k ? { width: 3840, height: 2160 } : { width: 1920, height: 1080 };
  }
}

export interface CropRect {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

export function calculateCenterCrop(
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number
): CropRect {
  const srcAspect = sourceW / sourceH;
  const targetAspect = targetW / targetH;

  let cropW = sourceW;
  let cropH = sourceH;
  let sx = 0;
  let sy = 0;

  if (srcAspect > targetAspect) {
    cropW = sourceH * targetAspect;
    sx = (sourceW - cropW) / 2;
  } else {
    cropH = sourceW / targetAspect;
    sy = (sourceH - cropH) / 2;
  }

  return { sx, sy, sWidth: cropW, sHeight: cropH };
}
