/**
 * Detects if the device has an integrated / low-power GPU or mobile chipset.
 * Pure WebGL vanilla detection with zero Three.js / R3F dependencies.
 */
export const detectLowPowerGpu = (): { isIntegrated: boolean; isMobile: boolean; gpuName: string } => {
  if (typeof window === 'undefined') {
    return { isIntegrated: false, isMobile: false, gpuName: 'Unknown' };
  }

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

  let isIntegrated = isMobile;
  let gpuName = 'Generic GPU';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gpuName = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        const lower = gpuName.toLowerCase();
        if (
          lower.includes('intel') ||
          lower.includes('uhd') ||
          lower.includes('hd graphics') ||
          lower.includes('iris') ||
          lower.includes('mali') ||
          lower.includes('adreno') ||
          lower.includes('powervr') ||
          lower.includes('software') ||
          lower.includes('llvmpipe')
        ) {
          isIntegrated = true;
        }
      }
    }
  } catch {
    // Ignore context creation errors
  }

  return { isIntegrated: !!isIntegrated, isMobile: !!isMobile, gpuName };
};
