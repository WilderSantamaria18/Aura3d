/**
 * Image Texture Optimizer for Three.js
 * Downscales custom user uploaded textures to max 512x512 using an offscreen canvas
 * to prevent VRAM exhaustion and GPU memory stalls.
 */

export class ImageOptimizer {
  public static async resizeImage(
    fileOrUrl: File | string,
    maxDimension: number = 512
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen para optimización'));
      };

      if (typeof fileOrUrl === 'string') {
        img.src = fileOrUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileOrUrl);
      }
    });
  }
}

export const optimizeImageTexture = (
  fileOrUrl: File | string,
  maxDimension: number = 512
): Promise<string> => ImageOptimizer.resizeImage(fileOrUrl, maxDimension);

