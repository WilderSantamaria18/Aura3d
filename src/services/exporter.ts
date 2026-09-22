/**
 * Social Media & File Exporter Service for Aura3D
 * Handles local downloads, Web Share API, clipboard copying, and Instagram deep links.
 */

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }

    // Clipboard API requires image/png
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      pngBlob = await convertBlobToPng(blob);
    }

    const item = new ClipboardItem({ 'image/png': pngBlob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('[exporter] Clipboard write failed:', err);
    return false;
  }
}

async function convertBlobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

export async function shareToSocial(
  fileOrBlob: File | Blob,
  title = 'Aura3D Spatial Studio',
  text = 'Hecho con Aura3D ✨'
): Promise<boolean> {
  try {
    const file =
      fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], `aura3d-${Date.now()}.${fileOrBlob.type.includes('video') ? 'mp4' : 'png'}`, {
            type: fileOrBlob.type || (fileOrBlob.type.includes('video') ? 'video/mp4' : 'image/png'),
          });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return true;
    } else {
      // Fallback: direct download
      await downloadBlob(file, file.name);
      return false;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return false;
    }
    console.warn('[exporter] Share failed, falling back to download:', err);
    await downloadBlob(fileOrBlob, `aura3d-${Date.now()}.${fileOrBlob.type.includes('video') ? 'webm' : 'png'}`);
    return false;
  }
}

export function openInstagram(): void {
  // Mobile app deep link or web fallback
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = 'instagram://app';
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank');
    }, 1500);
  } else {
    window.open('https://www.instagram.com/', '_blank');
  }
}

export const exporter = {
  downloadBlob,
  copyBlobToClipboard: copyImageToClipboard,
  shareContent: async ({ title, text, files }: { title?: string; text?: string; files?: File[] }) => {
    if (files && files.length > 0) {
      return await shareToSocial(files[0], title, text);
    }
    return false;
  },
  createFileFromBlob: (blob: Blob, filename: string) => new File([blob], filename, { type: blob.type }),
  openInstagramDirect: openInstagram,
};

