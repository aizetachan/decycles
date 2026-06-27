import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImageFile } from "../../lib/getCroppedImg";

export interface CropOptions {
  /** Target aspect ratio (width / height). e.g. 1 for square, 16/9 for cover. */
  aspect: number;
  /** "round" shows a circular crop mask (avatars/logos). Default "rect". */
  cropShape?: "rect" | "round";
  /**
   * Width (%) of a centered "safe zone" guide drawn over the crop area — used
   * for covers, whose center is what shows on home cards. Omit for none.
   */
  safeZoneWidthPct?: number;
  title?: string;
  hint?: string;
  safeZoneLabel?: string;
  /** Soft warning if the cropped result would be narrower than this many px. */
  minWidth?: number;
}

interface Props extends CropOptions {
  file: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  file,
  aspect,
  cropShape = "rect",
  safeZoneWidthPct,
  title,
  hint,
  safeZoneLabel,
  minWidth,
  onConfirm,
  onCancel,
}: Props) {
  const [sourceFile, setSourceFile] = useState(file);
  const [imageUrl, setImageUrl] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setAreaPixels(pixels), []);

  // Focus the dialog and wire Escape-to-cancel.
  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Revoke the current object URL when it changes (replace) or on unmount.
  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const swapSource = (f: File) => {
    setSourceFile(f);
    setImageUrl(URL.createObjectURL(f)); // previous URL revoked by the effect above
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
  };

  const onReplacePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f && f.type.startsWith("image/")) swapSource(f);
  };

  const confirm = async () => {
    if (!areaPixels) return;
    setBusy(true);
    try {
      const out = await getCroppedImageFile(sourceFile, areaPixels);
      onConfirm(out);
    } catch {
      setBusy(false);
    }
  };

  const lowRes = !!(minWidth && areaPixels && areaPixels.width < minWidth);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Crop image"}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl outline-none dark:bg-neutral-900"
      >
        <div className="px-5 pb-2 pt-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {title || "Crop image"}
          </h3>
          {hint && <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>}
        </div>

        <div className="relative w-full bg-neutral-950" style={{ height: "min(55vh, 340px)" }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={!safeZoneWidthPct}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
          {safeZoneWidthPct && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative h-full border-2 border-dashed border-white/80"
                style={{ width: `${safeZoneWidthPct}%` }}
              >
                <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                  {safeZoneLabel || "Visible area"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-neutral-900 dark:accent-white"
          />
          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            className="whitespace-nowrap rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Replace image
          </button>
        </div>

        {lowRes && (
          <p className="px-5 pb-1 text-xs text-amber-600 dark:text-amber-500">
            Low resolution — the result may look blurry. Zoom out or use a larger image.
          </p>
        )}

        <div className="flex justify-end gap-2 px-5 pb-4 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !areaPixels}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {busy ? "Processing…" : "Apply"}
          </button>
        </div>

        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onReplacePick}
        />
      </div>
    </div>
  );
}
