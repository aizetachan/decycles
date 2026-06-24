/**
 * Client-side image optimization, run on every upload before it touches
 * Firebase Storage (see uploadImage in ./upload.ts).
 *
 * Why client-side: the bytes are shrunk *before* they leave the browser, so we
 * save upload bandwidth, storage cost AND download bandwidth for every visitor
 * — and there's never a heavy "original" sitting in the bucket to clean up.
 *
 * Strategy: downscale to a max edge and re-encode to WebP via a canvas. No
 * dependencies. Anything we can't safely process (SVG, animated GIF, decode
 * failure, or a browser without WebP canvas export) falls back to the original
 * file untouched, so an upload never fails because of compression.
 */

export interface CompressOptions {
  /** Longest edge in px. The image is scaled down to fit; never upscaled. */
  maxDimension?: number;
  /** WebP quality 0..1. */
  quality?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.82,
};

// Formats we deliberately leave alone: vectors (already tiny / lossless) and
// GIFs (a canvas pass would flatten animation to a single frame).
const SKIP_TYPES = new Set(["image/svg+xml", "image/gif"]);

function canEncodeWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function swapExtension(name: string, ext: string): string {
  return name.replace(/\.[^./\\]+$/, "") + ext;
}

/**
 * Returns a (usually much smaller) WebP File, or the original file unchanged
 * when compression isn't applicable or wouldn't help.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxDimension, quality } = { ...DEFAULTS, ...options };

  if (!file.type.startsWith("image/") || SKIP_TYPES.has(file.type)) return file;
  if (typeof document === "undefined" || !canEncodeWebp()) return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` bakes in EXIF orientation so portrait phone photos aren't
    // re-uploaded sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as any);
  } catch {
    return file; // decode failed (corrupt / unsupported) — upload as-is
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    // Keep whichever is smaller — re-encoding an already-tiny image can grow it.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], swapExtension(file.name, ".webp"), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
