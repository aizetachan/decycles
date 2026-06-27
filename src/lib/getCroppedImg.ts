/**
 * Applies a pixel crop (from react-easy-crop's croppedAreaPixels) to an image
 * File and returns a new PNG File containing just the cropped region.
 *
 * - EXIF orientation is baked in (same as compressImage), so portrait phone
 *   photos crop with the same orientation the user saw in the cropper.
 * - Output is lossless PNG on purpose: the existing compressImage step
 *   downscales to 1600px and re-encodes to WebP, so we avoid double lossy
 *   compression by keeping this intermediate lossless.
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getCroppedImageFile(file: File, crop: PixelCrop): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as any);
  } catch {
    return file; // decode failed — fall back to the original, uncropped
  }

  try {
    const width = Math.max(1, Math.round(crop.width));
    const height = Math.max(1, Math.round(crop.height));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(
      bitmap,
      Math.round(crop.x),
      Math.round(crop.y),
      width,
      height,
      0,
      0,
      width,
      height,
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") + "-cropped.png";
    return new File([blob], name, { type: "image/png", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
