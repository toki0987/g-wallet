/**
 * Client-side Canvas compressor that scales images and outputs WebP (or JPEG fallback)
 * guaranteed to stay strictly under 100KB (target <= 96KB) for KYC documents & Dokan products.
 */
export async function compressImageUnder100KB(
  file: File,
  maxDimension = 960
): Promise<{ dataUrl: string; sizeBytes: number; mimeType: string }> {
  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
  let width = Math.max(1, Math.round(imageBitmap.width * scale));
  let height = Math.max(1, Math.round(imageBitmap.height * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const maxBytes = 96 * 1024;
  let mimeType = 'image/webp';
  let quality = 0.82;
  let dataUrl = '';
  let byteLength = Infinity;

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    dataUrl = canvas.toDataURL(mimeType, quality);
    if (!dataUrl.startsWith('data:image/webp')) {
      mimeType = 'image/jpeg';
      dataUrl = canvas.toDataURL(mimeType, quality);
    }

    const base64Part = dataUrl.split(',')[1] || '';
    byteLength = Math.floor((base64Part.length * 3) / 4);

    if (byteLength <= maxBytes) {
      break;
    }

    if (quality > 0.35) {
      quality -= 0.14;
    } else {
      width = Math.max(240, Math.round(width * 0.78));
      height = Math.max(240, Math.round(height * 0.78));
      quality = 0.7;
    }
  }

  imageBitmap.close();

  if (byteLength > 100 * 1024) {
    throw new Error('Image could not be compressed under 100KB. Please choose a simpler photo.');
  }

  return { dataUrl, sizeBytes: byteLength, mimeType };
}
