import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import { ImageCropModal, type CropOptions } from "./ImageCropModal";

/**
 * Imperative image cropper available app-wide. Call `cropImage(source, options)`
 * with either a freshly-picked File (new upload) or the URL of an already-stored
 * image (click-to-edit). It opens the crop modal and resolves with the cropped
 * File once the user confirms, or `null` if they cancel. Pass the result to the
 * existing uploadImage() (which still compresses + uploads).
 *
 *   const cropImage = useCropper();
 *   const cropped = await cropImage(file, { aspect: 1, cropShape: "round" });
 *   if (!cropped) return;                 // user cancelled
 *   await uploadImage(cropped, folder);
 *
 * For an existing image: cropImage(currentUrl, { aspect: 16/9 }). Editing a
 * stored image requires the bucket to allow cross-origin reads (CORS); if the
 * fetch fails, cropImage resolves to null (the modal's "Replace" path, which
 * uses a fresh local file, always works).
 */
type CropSource = File | string;
type CropFn = (source: CropSource, options: CropOptions) => Promise<File | null>;

const CropperContext = createContext<CropFn | null>(null);

export function useCropper(): CropFn {
  const fn = useContext(CropperContext);
  if (!fn) throw new Error("useCropper must be used within <ImageCropperProvider>");
  return fn;
}

async function urlToFile(url: string): Promise<File> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const blob = await res.blob();
  return new File([blob], "image", { type: blob.type || "image/png" });
}

interface Request {
  file: File;
  options: CropOptions;
  resolve: (file: File | null) => void;
}

export function ImageCropperProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const cropImage = useCallback<CropFn>(async (source, options) => {
    let file: File;
    if (typeof source === "string") {
      try {
        file = await urlToFile(source);
      } catch (err) {
        console.warn("[cropper] could not load existing image for editing:", err);
        return null;
      }
    } else {
      file = source;
    }
    return new Promise<File | null>((resolve) => setRequest({ file, options, resolve }));
  }, []);

  const settle = (result: File | null) => {
    request?.resolve(result);
    setRequest(null);
  };

  return (
    <CropperContext.Provider value={cropImage}>
      {children}
      {request && (
        <ImageCropModal
          file={request.file}
          {...request.options}
          onConfirm={(f) => settle(f)}
          onCancel={() => settle(null)}
        />
      )}
    </CropperContext.Provider>
  );
}
