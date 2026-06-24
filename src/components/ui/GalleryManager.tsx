import React, { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, Loader2, Upload, GripVertical } from "lucide-react";
import { uploadImage } from "../../lib/upload";

export interface GalleryItem {
  url: string;
  description?: string;
}

interface GalleryManagerProps {
  /** Current items — tolerates legacy plain-string entries. */
  items: (string | GalleryItem)[];
  /** Called with the normalized `{ url, description }[]` on every change. */
  onChange: (items: GalleryItem[]) => void;
  /** Storage folder prefix passed to uploadImage. */
  folder: string;
  isDarkMode: boolean;
  /** Optional cap on total images. Omit for unlimited. */
  maxItems?: number;
  /** Disable uploads (e.g. no uid yet). Reorder/delete still work. */
  disabled?: boolean;
}

// Normalize the mixed string | {url,description} array down to objects and
// drop any empty/blank entries so reordering keys (the url) are always valid.
function normalize(items: (string | GalleryItem)[]): GalleryItem[] {
  return (items || [])
    .map((it) => (typeof it === "string" ? { url: it, description: "" } : { url: it?.url, description: it?.description || "" }))
    .filter((it) => !!it.url) as GalleryItem[];
}

// One draggable thumbnail. The whole tile is the drag handle (via dnd-kit
// listeners); the delete button stops pointer propagation so tapping it never
// starts a drag.
const SortableTile: React.FC<{
  item: GalleryItem;
  index: number;
  onRemove: () => void;
  isDarkMode: boolean;
}> = ({ item, index, onRemove, isDarkMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.url });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square border-2 overflow-hidden group touch-none ${
        isDragging ? "ring-2 ring-current" : ""
      } ${isDarkMode ? "border-white/20 bg-zinc-900" : "border-black/20 bg-gray-100"}`}
    >
      <img src={item.url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" loading="lazy" decoding="async" />

      {/* Full-cover drag handle. */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      />

      {/* Reorder affordance — visible on hover. */}
      <div className="absolute bottom-1 left-1 p-1 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Delete — above the drag layer; stops pointer so it doesn't drag. */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove image"
        className="absolute top-1 right-1 z-10 p-1.5 border-2 bg-black/70 text-white border-white hover:bg-red-500 hover:border-red-500 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * Unified gallery editor used everywhere (shop + event galleries, creator side
 * and admin). Supports:
 *   - multi-file upload at once (drag-drop or multi-select), with progress
 *   - drag-and-drop reordering (mouse, touch, keyboard) via @dnd-kit
 *   - per-image delete
 *
 * Uploads only enter `items` once they have a real download URL — in-flight
 * uploads render as separate placeholder tiles, so a blob: URL is never
 * persisted.
 */
export function GalleryManager({ items, onChange, folder, isDarkMode, maxItems, disabled }: GalleryManagerProps) {
  // Latest items via ref so async upload completions and drag handlers always
  // compose against current state, never a stale closure.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [uploads, setUploads] = useState<{ id: string; progress: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalize(items);
  const total = normalized.length + uploads.length;
  const atCap = maxItems != null && total >= maxItems;

  const sensors = useSensors(
    // Mouse: start dragging after an 8px move (so clicks still register).
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch: long-press 200ms to start dragging, so normal scrolling/taps work.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDrop = async (accepted: File[]) => {
    if (disabled || !accepted.length) return;
    setError(null);
    const current = normalize(itemsRef.current);
    const room = maxItems != null ? Math.max(0, maxItems - current.length - uploads.length) : Infinity;
    const files = room === Infinity ? accepted : accepted.slice(0, room);
    if (!files.length) return;

    const entries = files.map((file, i) => ({ id: `up-${Date.now()}-${i}-${file.name}-${file.size}`, file }));
    setUploads((prev) => [...prev, ...entries.map((e) => ({ id: e.id, progress: 0 }))]);

    try {
      const uploaded = await Promise.all(
        entries.map((e) =>
          uploadImage(e.file, folder, (pct) =>
            setUploads((prev) => prev.map((u) => (u.id === e.id ? { ...u, progress: pct } : u))),
          ).then((url) => ({ url, description: "" } as GalleryItem)),
        ),
      );
      // Compose against the latest items (could have changed during upload).
      onChange([...normalize(itemsRef.current), ...uploaded]);
    } catch (err: any) {
      console.error("Gallery upload failed", err);
      setError(err?.message || "Upload failed");
    } finally {
      setUploads((prev) => prev.filter((u) => !entries.some((e) => e.id === u.id)));
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    noClick: true, // we trigger the picker from the explicit add-tile only
    disabled: disabled || atCap,
  } as any);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = normalize(itemsRef.current);
    const oldIndex = list.findIndex((i) => i.url === active.id);
    const newIndex = list.findIndex((i) => i.url === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(list, oldIndex, newIndex));
  };

  const removeAt = (url: string) => {
    onChange(normalize(itemsRef.current).filter((i) => i.url !== url));
  };

  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div {...getRootProps()} className="space-y-3 relative">
      <input {...getInputProps()} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={normalized.map((i) => i.url)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {normalized.map((item, idx) => (
              <SortableTile key={item.url} item={item} index={idx} onRemove={() => removeAt(item.url)} isDarkMode={isDarkMode} />
            ))}

            {/* In-flight upload placeholders. */}
            {uploads.map((u) => (
              <div
                key={u.id}
                className={`relative aspect-square border-2 border-dashed flex flex-col items-center justify-center gap-2 ${
                  isDarkMode ? "border-white/20 bg-zinc-900" : "border-black/20 bg-gray-100"
                }`}
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>{Math.round(u.progress)}%</span>
                <div className="absolute bottom-2 left-2 right-2 h-1 bg-current/20 overflow-hidden">
                  <div className={`h-full ${isDarkMode ? "bg-white" : "bg-black"}`} style={{ width: `${u.progress}%` }} />
                </div>
              </div>
            ))}

            {/* Add tile — opens the multi-select picker. Hidden at cap. */}
            {!atCap && (
              <button
                type="button"
                onClick={open}
                disabled={disabled}
                className={`aspect-square border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDragActive
                    ? isDarkMode
                      ? "border-white bg-white/10 text-white"
                      : "border-black bg-black/10 text-black"
                    : isDarkMode
                    ? "border-white/30 text-gray-400 hover:border-white hover:text-white"
                    : "border-black/30 text-gray-500 hover:border-black hover:text-black"
                }`}
              >
                <Plus className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Add images</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Drop-anywhere overlay hint while dragging files over the whole area. */}
      {isDragActive && (
        <div className={`pointer-events-none absolute inset-0 border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest ${
          isDarkMode ? "border-white bg-black/70 text-white" : "border-black bg-white/70 text-black"
        }`}>
          <Upload className="w-4 h-4" /> Drop to upload
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className={`text-[10px] ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
          Drop multiple images to upload · drag tiles to reorder{maxItems != null ? ` · ${normalized.length}/${maxItems}` : ""}
        </p>
        {error && <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">{error}</span>}
      </div>
    </div>
  );
}
