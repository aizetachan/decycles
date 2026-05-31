import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, ChevronDown, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { EVENT_CATEGORIES } from "./FilterBar";
import { EVENT_CATEGORY_COLORS } from "../../constants/categories";
import { Category, Creator } from "../../types";
import { useUI } from "../../contexts/UIContext";

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface EventCalendarProps {
  isDarkMode: boolean;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;
  calendarEvents: any[]; // Or properly typed if possible
  selectedCountry: string;
  setIsCountryDropdownOpen: (open: boolean) => void;
  activeEventCategory: Category | null;
  handleEventCategoryChange: (category: Category) => void;
  /** @deprecated kept for compat with existing call sites; clicks now go
   * through UIContext's `openEvent` instead. */
  setSelectedCreator?: (creator: Creator) => void;
}

export function EventCalendar({
  isDarkMode,
  calendarDate,
  setCalendarDate,
  calendarEvents,
  selectedCountry,
  setIsCountryDropdownOpen,
  activeEventCategory,
  handleEventCategoryChange,
}: EventCalendarProps) {
  // Click on a day-cell chip → open the dedicated EventModal (not the creator
  // profile). The modal pulls the full event payload from context so we don't
  // have to refetch.
  const { openEvent } = useUI();
  // Mobile-only day modal: a day cell with events doesn't render the chips
  // inline (too tight); instead a single white dot, and tapping the cell
  // opens a list of that day's events in a modal. Desktop is unchanged.
  const [dayModalDateStr, setDayModalDateStr] = useState<string | null>(null);
  const [dayModalEvents, setDayModalEvents] = useState<any[]>([]);
  const openDayModal = (dateStr: string, events: any[]) => {
    setDayModalDateStr(dateStr);
    setDayModalEvents(events);
  };
  const closeDayModal = () => {
    setDayModalDateStr(null);
    setDayModalEvents([]);
  };
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  // Cell border palette — kept identical for empty (offset) and day cells so
  // the grid lines stay continuous across the whole month, only the fill /
  // content differs.
  const cellBorder = isDarkMode ? "border-white/15" : "border-black/15";

  for (let i = 0; i < firstDay; i++) {
    days.push(
      <div key={`empty-${i}`} className={`aspect-square border-r-2 border-b-2 ${cellBorder}`}></div>
    );
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const currentDate = new Date(year, month, d);
    const isFirstFriday = currentDate.getDay() === 5 && d <= 7;

      const dayEvents = calendarEvents.filter(e => {
        // Direct hit or inside an explicit range.
        if (e.eventDate === dateStr) return true;
        if (e.endDate && dateStr >= e.eventDate && dateStr <= e.endDate) return true;
        // Legacy rule kept for the 3 hand-curated event-shops.
        if (e.recurringEvent === 'first_friday_of_month' && isFirstFriday) return true;
        // New recurrence rules — only kick in on/after the original startDate.
        if (e.eventDate && dateStr >= e.eventDate) {
          let start: Date | null = null;
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.eventDate);
          if (m) {
            start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
          } else {
            start = new Date(e.eventDate);
          }
          if (start && !isNaN(start.getTime())) {
            if (e.recurrence === 'weekly' && start.getDay() === currentDate.getDay()) return true;
            if (e.recurrence === 'monthly' && start.getDate() === currentDate.getDate()) return true;
          }
        }
        return false;
      });
    
    const hasEvents = dayEvents.length > 0;
    days.push(
      <div
        key={`day-${d}`}
        // Mobile-only: tapping a day with events opens the day-modal. Desktop
        // ignores the cell click — the chips inside are the real targets.
        onClick={() => {
          if (!hasEvents) return;
          const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
          if (isMobile) openDayModal(dateStr, dayEvents);
        }}
        className={`aspect-square p-1.5 md:p-2 flex flex-col gap-1 overflow-hidden transition-colors border-r-2 border-b-2 ${cellBorder} ${
          isDarkMode ? "bg-zinc-900 hover:bg-zinc-800" : "bg-gray-50 hover:bg-gray-100"
        } ${hasEvents ? "md:cursor-default cursor-pointer" : ""} relative`}
      >
        <span className={`text-[10px] md:text-sm font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{d}</span>

        {/* MOBILE — indicator in the cell center. Single event = small dot;
            multiple events = a larger circle with the count inside. Tapping
            anywhere on the cell opens the day-events modal. */}
        {hasEvents && (
          <span className="md:hidden absolute inset-0 flex items-center justify-center pointer-events-none">
            {dayEvents.length > 1 ? (
              <span
                className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center leading-none ${
                  isDarkMode ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                {dayEvents.length}
              </span>
            ) : (
              <span className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-white" : "bg-black"}`} />
            )}
          </span>
        )}

        {/* DESKTOP — event chips listed inline. */}
        <div className="hidden md:flex flex-1 overflow-y-auto no-scrollbar flex-col gap-1">
          {dayEvents.map((event, evIdx) => {
            const cat = (event.subCategories && event.subCategories[0]) || "";
            const dot = EVENT_CATEGORY_COLORS[cat];
            return (
              <div
                key={(event as any)._calendarKey || `${event.id}-${evIdx}-${event.eventDate}`}
                onClick={(ev) => { ev.stopPropagation(); openEvent(event); }}
                className={`flex items-center gap-1.5 text-xs p-1 cursor-pointer font-bold uppercase tracking-wider rounded ${isDarkMode ? "bg-white text-black" : "bg-black text-white"}`}
              >
                <span className="flex-1 min-w-0 truncate">{event.name}</span>
                {dot && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: dot }}
                    title={cat}
                    aria-label={`Category: ${cat}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  return (
    <div className="col-span-full flex flex-col gap-6">
      {/* Single-row header: Worldwide + categories on the left, month nav on
          the right. On mobile, the same structure stays in one horizontal
          row with categories collapsed into a select so everything fits.
          Sticky under the global header (same offsets as the FilterBar) so
          filters and month-nav stay accessible while scrolling the grid. */}
      <div className={`sticky top-[66px] md:top-[82px] z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 md:gap-4 brutalist-border border-t-0 border-l-0 border-r-0 ${isDarkMode ? "bg-black" : "bg-white"}`}>
        {/* LEFT — country + categories. */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setIsCountryDropdownOpen(true)}
            className={`flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm font-bold uppercase tracking-wider px-3 md:px-4 py-2 brutalist-border brutalist-shadow transition-colors shrink-0 ${
              isDarkMode
                ? "bg-black text-white hover:bg-zinc-900"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            <span className="truncate hidden md:inline">{selectedCountry === "All" ? "WORLDWIDE" : selectedCountry}</span>
            <span className="md:hidden flex items-center justify-center truncate">
              {selectedCountry === "All" ? <Globe className="w-4 h-4" /> : <span className="truncate">{selectedCountry}</span>}
            </span>
            <ChevronDown className="hidden md:block w-4 h-4 shrink-0" />
          </button>

          {/* Mobile categories — collapsed into a single select so the whole
              row fits without horizontal scrolling. Tight padding + small
              chevron so even "CATEGORIES" fits in the narrow space alongside
              the country pill and month-nav. */}
          <div className="md:hidden relative flex-1 min-w-0">
            <select
              value={activeEventCategory || "All"}
              onChange={(e) => handleEventCategoryChange(e.target.value as Category)}
              className={`appearance-none w-full text-[11px] font-bold uppercase tracking-wider px-2.5 py-2 pr-6 brutalist-border brutalist-shadow transition-colors outline-none cursor-pointer truncate ${
                isDarkMode ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {["All", ...EVENT_CATEGORIES].map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "CATEGORIES" : category}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? "text-white" : "text-black"}`} />
          </div>

          {/* Desktop categories — chip row, overflow-x-auto for long lists. */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
            {["All", ...EVENT_CATEGORIES].map((category) => (
              <button
                key={category}
                onClick={() => handleEventCategoryChange(category as Category)}
                className={`shrink-0 text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                  activeEventCategory === category || (category === "All" && activeEventCategory === null)
                    ? isDarkMode ? "bg-white text-black brutalist-border brutalist-shadow" : "bg-black text-white brutalist-border brutalist-shadow"
                    : `text-gray-500 brutalist-border ${isDarkMode ? "hover:text-white" : "hover:text-black"}`
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — month navigation (prev / month label / next). */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <span className={`text-sm md:text-base font-bold uppercase tracking-widest whitespace-nowrap px-1 ${isDarkMode ? "text-white" : "text-black"}`}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
      
      {/* Day-name header — sits above the grid, no fill. */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map(day => (
          <div key={day} className={`p-2 text-center text-sm font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid — left + top edges live on the container, each cell
          contributes its own right + bottom borders so internal lines are
          drawn exactly once (no doubling at adjacencies). */}
      <div className={`grid grid-cols-7 border-l-2 border-t-2 ${cellBorder}`}>
        {days}
      </div>

      {/* Mobile-only modal listing the events of a specific day. Opens when
          a day cell with events is tapped on a coarse-pointer device; on
          desktop the inline chips are clicked directly. */}
      <AnimatePresence>
        {dayModalDateStr && (
          <motion.div
            key="day-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closeDayModal}
          >
            <motion.div
              key="day-modal-body"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full sm:max-w-md max-h-[80vh] overflow-y-auto brutalist-border ${isDarkMode ? "bg-black border-white text-white" : "bg-white border-black text-black"}`}
            >
              <div className="flex items-center justify-between p-4 border-b-2 border-current/20">
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {dayModalEvents.length} event{dayModalEvents.length === 1 ? "" : "s"}
                  </div>
                  <h3 className="font-display tracking-wider text-2xl leading-none mt-1">
                    {(() => {
                      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayModalDateStr || "");
                      if (!m) return dayModalDateStr;
                      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
                    })()}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeDayModal}
                  aria-label="Close"
                  className={`p-2 border-2 transition-colors ${isDarkMode ? "border-white/20 hover:bg-white/10" : "border-black/20 hover:bg-black/5"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="divide-y-2 divide-current/10">
                {dayModalEvents.map((event, idx) => {
                  const cat = (event.subCategories && event.subCategories[0]) || "";
                  const dot = EVENT_CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={(event as any)._calendarKey || `${event.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        closeDayModal();
                        openEvent(event);
                      }}
                      className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isDarkMode ? "hover:bg-white/5" : "hover:bg-black/5"}`}
                    >
                      <div className={`w-12 h-12 shrink-0 border-2 overflow-hidden ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                        {event.coverImage ? (
                          <img src={event.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CalendarIcon className="w-4 h-4 opacity-50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{event.name}</div>
                        <div className={`text-[11px] truncate flex items-center gap-2 mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {event.startTime && <span>{event.startTime}</span>}
                          {event.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 opacity-70" /> {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {dot && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: dot }}
                          aria-label={`Category: ${cat}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
