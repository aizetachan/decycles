import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useT } from "../contexts/LanguageContext";
import { Header } from "../components/layout/Header";
import { EventsTab } from "./EditProfile";
import { db } from "../firebase";
import { stripUndefined } from "../lib/upload";

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

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

  const handleSave = async () => {
    if (!currentUser || !profileData) return;
    setSaveError(null);
    setSaving(true);
    try {
      const cleaned = stripUndefined({ events: profileData.events || [] });
      await setDoc(doc(db, "creators", currentUser.uid), cleaned, { merge: true });
      setLoadedSnapshot(JSON.stringify(profileData.events));
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (err: any) {
      console.error("Save failed:", err);
      setSaveError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
          <Link
            to="/"
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors self-start sm:self-auto ${
              isDarkMode ? "border-white/30 hover:bg-white/10" : "border-black/30 hover:bg-black/5"
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> {t("favorites.backToExplore")}
          </Link>
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

            <div className={`mt-8 pt-6 border-t-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
              <div className="flex-1 min-w-0">
                {saveError && (
                  <p className="text-xs font-bold uppercase tracking-widest text-red-500">{saveError}</p>
                )}
                {showSaved && (
                  <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                    Changes saved
                  </p>
                )}
                {!saveError && !showSaved && isDirty && (
                  <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
                    Unsaved changes
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? "bg-white text-black border-white hover:bg-zinc-200" : "bg-black text-white border-black hover:bg-zinc-800"
                }`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
