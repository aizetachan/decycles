import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { compressImage, type CompressOptions } from "./imageCompression";

/**
 * Upload a single image to Firebase Storage and return its public download URL.
 *
 * The file is optimized (downscaled + re-encoded to WebP) in the browser before
 * upload — see compressImage. This applies to every image entry point: user &
 * shop avatars, shop & event covers, and shop & event galleries.
 *
 * @param file - The file to upload.
 * @param folder - Path prefix in the bucket (e.g. "creators/miau", "users/abc123").
 *                 We append a timestamp + sanitized filename to keep names unique.
 * @param onProgress - Optional progress callback (0..100). Called as bytes upload.
 * @param compress - Optional override of the compression settings (max edge /
 *                   quality). Pass `false` to upload the original untouched.
 */
export async function uploadImage(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
  compress: CompressOptions | false = {},
): Promise<string> {
  const toUpload = compress === false ? file : await compressImage(file, compress);
  const safeName = toUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, toUpload, { contentType: toUpload.type });
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        if (!onProgress || !snapshot.totalBytes) return;
        onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/**
 * Returns true for blob:/data: URLs that won't survive a page reload —
 * useful for detecting "uploaded but not persisted" images at save time.
 */
export function isEphemeralUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("data:");
}

/**
 * Normalize a user-typed URL so we always store something openable in a browser.
 * Accepts bare domains (`www.foo.com`, `foo.com/path`) and prepends `https://`
 * if no scheme is present. Empty input stays empty.
 */
export function normalizeUrl(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  // Already has a scheme like https://, http://, mailto:, ftp://, tel:, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Recursively strip keys whose value is `undefined`. Firestore's setDoc/updateDoc
 * rejects any `undefined` field with "Unsupported field value: undefined" and
 * fails the entire write — call this on the payload right before persisting.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as any;
  }
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}
