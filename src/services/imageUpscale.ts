/**
 * Reescalado de fondos a la resolución objetivo (Full HD / 4K).
 *
 * Los modelos de difusión gratuitos entregan como mucho ~2 K por lado. Para llegar a 4K sin
 * que se vea "blando" se reescala en pasos de ≤1.5× (mucho mejor que un solo salto 2×) con
 * suavizado de alta calidad y se recupera la nitidez con una máscara de enfoque suave.
 */

export interface UpscaleResult {
  blob: Blob;
  width: number;
  height: number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* cae al <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('La imagen recibida no es válida'));
      img.src = url;
    });
  } finally {
    // se revoca en la siguiente vuelta: el <img> ya está decodificado
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Máscara de enfoque: out = orig + amount·(orig − desenfocada) */
function unsharp(canvas: HTMLCanvasElement, amount: number, radiusPx: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const blurred = makeCanvas(w, h);
  const bctx = blurred.getContext('2d');
  if (!bctx) return;
  bctx.filter = `blur(${radiusPx}px)`;
  bctx.drawImage(canvas, 0, 0);
  bctx.filter = 'none';

  const src = ctx.getImageData(0, 0, w, h);
  const blr = bctx.getImageData(0, 0, w, h).data;
  const d = src.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] + amount * (d[i] - blr[i]);
    d[i + 1] = d[i + 1] + amount * (d[i + 1] - blr[i + 1]);
    d[i + 2] = d[i + 2] + amount * (d[i + 2] - blr[i + 2]);
  }
  ctx.putImageData(src, 0, 0);
}

export async function upscaleImage(
  input: Blob,
  targetW: number,
  targetH: number,
  quality = 0.93
): Promise<UpscaleResult> {
  const bmp = await decode(input);
  const srcW = 'naturalWidth' in bmp ? bmp.naturalWidth : bmp.width;
  const srcH = 'naturalHeight' in bmp ? bmp.naturalHeight : bmp.height;
  if (!srcW || !srcH) throw new Error('La imagen recibida está vacía');

  // Si ya tiene la resolución solicitada o mayor en ambos lados y la misma proporción
  const tw = Math.max(targetW, 128);
  const th = Math.max(targetH, 128);

  // Escalar de forma uniforme y proporcional para cubrir targetW y targetH sin deformar
  const scale = Math.max(tw / srcW, th / srcH, 1.0);
  const interW = Math.round(srcW * scale);
  const interH = Math.round(srcH * scale);

  let cw = srcW;
  let ch = srcH;
  let canvas = makeCanvas(cw, ch);
  let ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el lienzo');
  ctx.drawImage(bmp, 0, 0);
  const upscaled = interW > srcW || interH > srcH;

  // Pasos progresivos de ≤1.5× para máxima nitidez sin pixelado
  while (cw < interW || ch < interH) {
    const nw = Math.min(interW, Math.round(cw * 1.5));
    const nh = Math.min(interH, Math.round(ch * 1.5));
    const next = makeCanvas(nw, nh);
    const nctx = next.getContext('2d');
    if (!nctx) break;
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = 'high';
    nctx.drawImage(canvas, 0, 0, nw, nh);
    canvas = next;
    ctx = nctx;
    cw = nw;
    ch = nh;
  }

  // Si las dimensiones intermedias difieren de la meta, encuadrar al centro sin estirar
  if (cw !== tw || ch !== th) {
    const finalCanvas = makeCanvas(tw, th);
    const fctx = finalCanvas.getContext('2d');
    if (fctx) {
      fctx.imageSmoothingEnabled = true;
      fctx.imageSmoothingQuality = 'high';
      const offsetX = Math.max(0, Math.round((cw - tw) / 2));
      const offsetY = Math.max(0, Math.round((ch - th) / 2));
      fctx.drawImage(canvas, offsetX, offsetY, tw, th, 0, 0, tw, th);
      canvas = finalCanvas;
      cw = tw;
      ch = th;
    }
  }

  if (upscaled) unsharp(canvas, 0.55, Math.max(0.6, cw / 3200));

  if ('close' in bmp && typeof bmp.close === 'function') bmp.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo codificar la imagen'))), 'image/jpeg', quality)
  );
  return { blob, width: cw, height: ch };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
