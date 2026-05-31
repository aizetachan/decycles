import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useT } from "../contexts/LanguageContext";
import { Header } from "../components/layout/Header";
import { EventsTab } from "./EditProfile";
import { db } from "../firebase";
import { stripUndefined, isEphemeralUrl } from "../lib/upload";

// True while any event cover/gallery image is still an optimistic blob: preview
// (upload in flight). Auto-save defers until uploads resolve to real URLs.
function eventsHaveEphemeralImages(events: any[]): boolean {
  return (events || []).some((e: any) => {
    if (isEphemeralUrl(e?.coverImage)) return true;
    return (e?.gallery || []).some((g: any) => isEphemeralUrl(typeof g === "string" ? g : g?.url));
  });
}

/**
 * Dedicated page for managing the user's events. Events used to live inside
 * the profile editor's EVENTS tab; pulling them out makes attendee management
 * a first-class flow.
 *
 * Loads the creator doc for the signed-in user, lets them edit events using
 * the shared `EventsTab` component, then writes the updated `events` array
 * back to `creators/{uid}`. The page also surfaces RSVPs per event via the
 * `showAttendees` flag on EventsTab.
 */
export function MyEvents() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { isDarkMode, openCreatorProfile } = useUI();
  const { t } = useT();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<any>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Auto-save status, mirrors the profile editor.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Hydrate from creators/{uid}. Plain users may not have a creator doc yet;
  // in that case we start with an empty events array but still keep their
  // role + name from the user profile so the publish-from selector behaves.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "creators", currentUser.uid));
        if (cancelled) return;
        const baseRole = (userProfile as any)?.role || "user";
        const c: any = snap.exists() ? snap.data() : {};
        const next = {
          // Role + publication state drive the EventEditorItem's "Publish from"
          // selector; we surface them as-is so behaviour matches EditProfile.
          role: baseRole,
          isPublished: !!c.isPublished,
          shopName: c.name || "",
          shopDescription: c.description || "",
          shopProfileImage: c.profileImage || "",
          coverImage: c.coverImage || "",
          website: c.website || "",
          instagram: c.socials?.instagram || "",
          facebook: c.socials?.facebook || "",
          twitter: c.socials?.twitter || "",
          // Shop location — lets EventEditorItem's "Use shop location" button
          // copy the shop's pin onto an event.
          address: c.address || "",
          coordinates: c.coordinates || null,
          location: c.location || "",
          country: c.country || "",
          events: Array.isArray(c.events) ? c.events : [],
        };
        setProfileData(next);
        setLoadedSnapshot(JSON.stringify(next.events));
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser, userProfile]);

  const isDirty = useMemo(() => {
    if (!profileData || loadedSnapshot === null) return false;
    return JSON.stringify(profileData.events) !== loadedSnapshot;
  }, [profileData, loadedSnapshot]);

  // Warn before tab close while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Pure write to Firestore. Used by both the debounced auto-save and the
  // unmount flush.
  const persist = async () => {
    if (!currentUser || !profileData) return;
    const isCreatorOrAdmin = profileData.role === "creator" || profileData.role === "admin";
    const payload: any = { events: profileData.events || [] };
    if (!isCreatorOrAdmin) {
      // Plain users get a minimal but well-formed doc — never a bare `{events}`
      // doc (which would slip into the directory grid with no categories and
      // crash it). Kept unpublished + auto-tagged as "Events" so it's
      // categorized but stays out of the shop grid.
      const up: any = userProfile || {};
      const fullName = `${up.firstName || ""} ${up.lastName || ""}`.trim() || up.name || up.email || "User";
      payload.id = currentUser.uid;
      payload.name = fullName;
      payload.creatorId = currentUser.uid;
      payload.creatorName = fullName;
      payload.creatorImage = up.profileImage || "";
      payload.profileImage = up.profileImage || "";
      payload.isPublished = false;
      payload.categories = ["Events"];
      payload.subCategories = [];
      payload.gallery = [];
    }
    await setDoc(doc(db, "creators", currentUser.uid), stripUndefined(payload), { merge: true });
    setLoadedSnapshot(JSON.stringify(profileData.events));
  };

  // ── Auto-save ── persist events ~1s after the last edit, no manual button.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  useEffect(() => {
    if (loadedSnapshot === null || !currentUser || !profileData) return;
    if (!isDirty || savingRef.current) return;
    // Defer while an event image upload is mid-flight (blob: previews present).
    if (eventsHaveEphemeralImages(profileData.events)) {
      setSaveStatus("saving");
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      savingRef.current = true;
      setSaveError(null);
      setSaveStatus("saving");
      try {
        await persist();
        setSaveStatus("saved");
      } catch (err: any) {
        console.error("Auto-save failed:", err);
        setSaveError(err?.message || "Auto-save failed");
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    }, 1000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [profileData, isDirty, currentUser, loadedSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush a pending save on unmount (navigating away before the debounce fires).
  const persistRef = useRef<() => Promise<void>>();
  persistRef.current = persist;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const ephemeralRef = useRef(false);
  ephemeralRef.current = !!profileData && eventsHaveEphemeralImages(profileData.events);
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (isDirtyRef.current && !savingRef.current && !ephemeralRef.current && persistRef.current) {
        persistRef.current().catch((e) => console.error("Flush save failed", e));
      }
    };
  }, []);

  if (!authLoading && !currentUser) {
    return <Navigate to="/welcome" replace />;
  }

  const isLoading = authLoading || loading || !profileData;

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header profileData={userProfile || {}} setSelectedCreator={(c) => openCreatorProfile(c.id)} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              {t("events.subtitle")}
            </div>
            <h1 className="font-display tracking-wider text-4xl md:text-6xl leading-[0.95]">
              {t("events.title")}
              {profileData?.events?.length > 0 && (
                <span className={`ml-3 text-2xl md:text-3xl ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  {profileData.events.length}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Auto-save status — kept at the top so it stays visible while
                editing instead of being buried below the events list. */}
            {saveStatus === "saving" || (isDirty && saveStatus !== "error") ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Saving…</span>
              </span>
            ) : saveStatus === "error" ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500" title={saveError || "Save failed"}>Save failed</span>
            ) : saveStatus === "saved" ? (
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-green-400" : "text-green-600"}`}>✓ Saved</span>
            ) : null}
            <Link
              to="/"
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                isDarkMode ? "border-white/30 hover:bg-white/10" : "border-black/30 hover:bg-black/5"
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> {t("favorites.backToExplore")}
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <EventsTab
              isDarkMode={isDarkMode}
              profileData={profileData}
              setProfileData={setProfileData}
              uid={currentUser?.uid}
              showAttendees={true}
            />

          </>
        )}
      </main>
    </div>
  );
}
