import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DatePickerProps {
  value: string;            // YYYY-MM-DD (matches Firestore + native input format)
  onChange: (val: string) => void;
  isDarkMode: boolean;
  min?: string;             // inclusive lower bound
  placeholder?: string;
  className?: string;       // extra classes for the trigger button
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const parseIso = (s: string): { y: number; m: number; d: number } | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
};

const formatDisplay = (s: string) => {
  const p = parseIso(s);
  if (!p) return "";
  const date = new Date(p.y, p.m, p.d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export function DatePicker({
  value,
  onChange,
  isDarkMode,
  min,
  placeholder = "Select date",
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseIso(value), [value]);
  const [viewYear, setViewYear] = useState<number>(parsed?.y ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed?.m ?? new Date().getMonth());

  // Only re-sync the view to the value when the popup re-opens — navigating
  // months while the popup is open must not snap back to the selected date.
  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position the portal-rendered popup right below the trigger button.
  // Re-measure on scroll/resize so it stays anchored even inside scrollable
  // parents (the events list is in a tall scrollable form).
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const updatePos = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPopupPos({ top: r.bottom + 8, left: r.left, width: r.width });
  };
  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Click-outside + Escape close the popup. Because the popup lives in a
  // portal it's no longer a DOM descendant of the trigger, so we have to
  // check both the trigger ref and the popup ref.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const todayIso = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cells: Array<{ empty: true } | { day: number; iso: string }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ empty: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, iso: toIso(viewYear, viewMonth, d) });

  const navMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const isDisabled = (iso: string) => !!(min && iso < min);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full p-3 text-sm border-2 bg-transparent flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isDarkMode
            ? "border-white/20 text-white hover:border-white focus:ring-white focus:ring-offset-black"
            : "border-black/20 text-black hover:border-black focus:ring-black focus:ring-offset-white"
        } ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "" : (isDarkMode ? "text-gray-600" : "text-gray-400")}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 opacity-70 shrink-0" />
      </button>

      {open && popupPos && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          style={{ position: "fixed", top: popupPos.top, left: popupPos.left, width: 300, maxWidth: "calc(100vw - 16px)" }}
          className={`z-[200] p-3 brutalist-border ${
            isDarkMode ? "bg-black border-white text-white" : "bg-white border-black text-black"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navMonth(-1); }}
              className={`p-1 transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-display tracking-wider text-base">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navMonth(1); }}
              className={`p-1 transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className={`text-[10px] font-bold uppercase tracking-widest text-center pb-1 ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if ("empty" in cell) return <div key={`e-${i}`} />;
              const selected = cell.iso === value;
              const disabled = isDisabled(cell.iso);
              const isToday = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  className={`aspect-square flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    selected
                      ? isDarkMode
                        ? "bg-white text-black border-white"
                        : "bg-black text-white border-black"
                      : disabled
                      ? "opacity-30 cursor-not-allowed border-transparent"
                      : isToday
                      ? isDarkMode
                        ? "border-white/40 hover:bg-white/10"
                        : "border-black/40 hover:bg-black/10"
                      : isDarkMode
                      ? "border-transparent hover:border-white/40 hover:bg-white/5"
                      : "border-transparent hover:border-black/40 hover:bg-black/5"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t-2 border-current/20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const t = new Date();
                onChange(toIso(t.getFullYear(), t.getMonth(), t.getDate()));
                setOpen(false);
              }}
              className="text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }}
                className="text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
