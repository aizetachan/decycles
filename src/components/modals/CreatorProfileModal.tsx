import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Globe, MapPin, Maximize2, Heart, Share2, Check, Loader2 } from "lucide-react";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { creators as seedCreators } from "../../data";
import { useUI } from "../../contexts/UIContext";
import { useAuth } from "../../contexts/AuthContext";
import { useT } from "../../contexts/LanguageContext";
import { GalleryImageModal } from "./GalleryImageModal";
import { Creator } from "../../types";
import { db } from "../../firebase";
import { trackEvent } from "../../lib/analytics";

/**
 * Creator profile shown as a modal overlay (replaces the old `/creator/:id` page).
 *
 * Driven by `selectedCreatorId` in UIContext: clicking a creator card anywhere
 * in the app opens this modal. Direct visits to /creator/:id also populate
 * the state so deep links keep working — see App.tsx for the route handler.
 *
 * Closing the modal clears the state and (when navigated to via /creator/:id)
 * also navigates back to home.
 */
export function CreatorProfileModal() {
  const {
    isDarkMode,
    selectedCreatorId,
    closeCreatorProfile,
    openCreatorProfile,
  } = useUI();
  const { currentUser, userProfile: profileData, updateUserProfile } = useAuth();
  const { t } = useT();

  // Favourite toggle: stored on `users/{uid}.favorites` (array of creator ids).
  // Only shown for signed-in users. Optimistically updates so the heart flips
  // immediately; the Firestore write happens in the background.
  const isFavourited = !!profileData?.favorites?.includes(selectedCreatorId || "");
  const [favouriteSaving, setFavouriteSaving] = useState(false);

  // Share button — mirrors EventModal: touch devices get the native share
  // sheet, desktop copies the URL to clipboard with loading → copied UX.
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied">("idle");
  const handleShare = async () => {
    if (!selectedCreatorId) return;
    const url = `${window.location.origin}/creator/${selectedCreatorId}`;
    if (selectedCreator) {
      trackEvent("share", {
        content_type: "creator",
        item_id: selectedCreatorId,
        item_name: selectedCreator.name,
      });
    }
    const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;
    if (isTouch && typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: selectedCreator?.name || "Decycles", url });
      } catch {}
      return;
    }
    setShareState("loading");
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1800);
    } catch (err) {
      console.warn("Clipboard write failed:", err);
      setShareState("idle");
    }
  };
  const toggleFavourite = async () => {
    if (!currentUser || !selectedCreatorId || favouriteSaving) return;
    const current: string[] = profileData?.favorites || [];
    const next = isFavourited
      ? current.filter((id) => id !== selectedCreatorId)
      : [...current, selectedCreatorId];
    setFavouriteSaving(true);
    try {
      await updateUserProfile({ favorites: next });
      if (selectedCreator) {
        trackEvent(isFavourited ? "remove_favorite" : "add_favorite", {
          creator_name: selectedCreator.name,
          creator_category: selectedCreator.categories?.join(", ") || "",
        });
      }
    } catch (err) {
      console.error("Failed to update favorites", err);
    } finally {
      setFavouriteSaving(false);
    }
  };

  const [selectedCreator, setSelectedCreator] = useState<Creator | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<{ creator: Creator; img: string } | null>(null);
  // Which gallery image is the hero. Resets to 0 when the creator changes.
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => { setHeroIdx(0); }, [selectedCreatorId]);

  const trackSocialClick = (platform: string, url: string) => {
    if (selectedCreator) {
      trackEvent("click_creator_social", {
        creator_name: selectedCreator.name,
        social_platform: platform,
        link_url: url,
      });
    }
  };

  // Track profile view: Google Analytics + a Firestore counter (`views`) that
  // powers the admin dashboard's "most visited" metric. `viewedRef` dedupes so
  // a single open counts once even if the effect re-runs.
  const viewedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!selectedCreator || !selectedCreatorId) return;
    const realId = selectedCreator.id;
    if (viewedRef.current === selectedCreatorId) return;
    viewedRef.current = selectedCreatorId;

    trackEvent("view_creator_profile", {
      creator_id: realId === "current-user" ? currentUser?.uid : realId,
      creator_name: selectedCreator.name,
      creator_category: selectedCreator.categories?.join(", ") || "",
    });

    // Count the view on real creator docs only (skip the "current-user" self
    // preview). Best-effort — never block the UI on the counter.
    if (realId && realId !== "current-user") {
      updateDoc(doc(db, "creators", realId), { views: increment(1) }).catch(() => {});
    }
  }, [selectedCreator?.id, selectedCreatorId, currentUser?.uid]);

  // Fetch (or compose) the creator whenever selectedCreatorId changes.
  useEffect(() => {
    if (!selectedCreatorId) {
      setSelectedCreator(undefined);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Special case — logged-in user previewing their own profile.
      if (selectedCreatorId === "current-user") {
        if (cancelled) return;
        if (profileData) {
          setSelectedCreator({
            id: "current-user",
            name: profileData.name || "My Profile",
            description: profileData.bio || "",
            website: profileData.website || "",
            socials: {
              instagram: profileData.instagram || "",
              facebook: profileData.facebook || "",
              twitter: profileData.twitter || "",
            },
            profileImage: profileData.profileImage || "",
            coverImage: profileData.coverImage || "",
            gallery: profileData.gallery || [],
            categories: profileData.categories || [],
            subCategories: profileData.subCategories || [],
            location: profileData.location || "",
            country: profileData.country || "",
            address: profileData.address || "",
          });
        }
        setLoading(false);
        return;
      }

      // Try Firestore first — covers both admin-edited shops and creator self-edits.
      try {
        const snap = await getDoc(doc(db, "creators", selectedCreatorId));
        if (!cancelled && snap.exists()) {
          setSelectedCreator({ id: snap.id, ...snap.data() } as Creator);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error fetching creator from Firestore:", err);
      }

      if (cancelled) return;
      // Fallback to local seed data.
      const fromSeed = seedCreators.find((c) => c.id === selectedCreatorId);
      setSelectedCreator(fromSeed);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedCreatorId, profileData]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!selectedCreatorId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selectedCreatorId]);

  return (
    <>
      <AnimatePresence>
        {selectedCreatorId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center p-8 sm:p-12 lg:p-16 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={closeCreatorProfile}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-[1200px] my-auto shadow-2xl flex flex-col overflow-hidden brutalist-border border-[8px] relative ${
                isDarkMode ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {/* Close button — sits on top of the cover image. */}
              <button
                type="button"
                onClick={closeCreatorProfile}
                aria-label="Close"
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Favourite toggle (signed-in users only). Sits next to the
                  close button on top of the cover. */}
              {currentUser && selectedCreator && (
                <button
                  type="button"
                  onClick={toggleFavourite}
                  disabled={favouriteSaving}
                  aria-label={isFavourited ? "Remove from favourites" : "Save to favourites"}
                  className="absolute top-4 right-16 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors disabled:opacity-60"
                >
                  <Heart className={`w-6 h-6 ${isFavourited ? "fill-current text-red-500" : ""}`} />
                </button>
              )}

              {/* Share button — copies the public /creator/:id URL on desktop,
                  opens native share sheet on touch devices. Sits to the left
                  of the heart (or in the heart's position when not signed in). */}
              {selectedCreator && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={shareState !== "idle"}
                  aria-label="Share creator"
                  className={`absolute top-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors disabled:opacity-60 ${
                    currentUser ? "right-28" : "right-16"
                  }`}
                  title={shareState === "copied" ? "Link copied" : "Share"}
                >
                  {shareState === "loading" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : shareState === "copied" ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Share2 className="w-6 h-6" />
                  )}
                </button>
              )}

              {loading ? (
                <div className="flex items-center justify-center p-16">
                  <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full" />
                </div>
              ) : !selectedCreator ? (
                <div className="p-12 text-center">
                  <h2 className="text-2xl font-bold uppercase tracking-widest mb-4">
                    {t("creator.notFound")}
                  </h2>
                  <button
                    onClick={closeCreatorProfile}
                    className={`px-6 py-2 brutalist-border transition-colors text-sm font-bold uppercase tracking-widest ${
                      isDarkMode ? "hover:bg-white hover:text-black" : "hover:bg-black hover:text-white"
                    }`}
                  >
                    {t("creator.close")}
                  </button>
                </div>
              ) : (
                <>
                  {/* Cover */}
                  <div className="w-full h-48 md:h-64 lg:h-96 relative bg-gray-200">
                    {(selectedCreator.coverImage ||
                      (selectedCreator.gallery && selectedCreator.gallery[0])) && (
                      <img
                        src={
                          selectedCreator.coverImage ||
                          (typeof selectedCreator.gallery[0] === "string"
                            ? selectedCreator.gallery[0]
                            : selectedCreator.gallery[0]?.url)
                        }
                        alt={`${selectedCreator.name} cover`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row w-full">
                    {/* Left column — profile info */}
                    <div className="w-full md:w-1/3 p-6 md:p-8 flex flex-col -mt-16 md:-mt-20 relative z-10">
                      {selectedCreator.categories?.includes("Events") ? (
                        <div className="flex flex-col gap-3 mb-4">
                          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 ${isDarkMode ? "border-black bg-zinc-800" : "border-white bg-gray-200"} object-cover mb-2 shadow-lg flex items-center justify-center overflow-hidden`}>
                            <img
                              src={
                                selectedCreator.profileImage ||
                                selectedCreator.coverImage ||
                                (typeof selectedCreator.gallery[0] === "string"
                                  ? selectedCreator.gallery[0]
                                  : selectedCreator.gallery[0]?.url)
                              }
                              alt={`${selectedCreator.name} event`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <h2 className={`text-2xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>
                            {selectedCreator.name}
                          </h2>
                          {(selectedCreator.creatorName || selectedCreator.profileImage) && (
                            <div className="flex flex-col gap-2 mt-2">
                              <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                Created by
                              </span>
                              <div
                                className={`flex items-center gap-3 ${selectedCreator.creatorId ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                                onClick={() => {
                                  if (selectedCreator?.creatorId) {
                                    openCreatorProfile(selectedCreator.creatorId);
                                  }
                                }}
                              >
                                <img
                                  src={selectedCreator.creatorImage || selectedCreator.profileImage || selectedCreator.coverImage}
                                  alt={`${selectedCreator.creatorName || selectedCreator.name} profile`}
                                  className="w-8 h-8 rounded-full object-cover brutalist-border"
                                  referrerPolicy="no-referrer"
                                />
                                <span className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  {selectedCreator.creatorName || "Organizer"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col mb-4">
                          <img
                            src={selectedCreator.profileImage || selectedCreator.coverImage}
                            alt={`${selectedCreator.name} profile`}
                            className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 ${isDarkMode ? "border-black bg-zinc-800" : "border-white bg-gray-200"} object-cover mb-4 shadow-lg`}
                            referrerPolicy="no-referrer"
                          />
                          <h2 className={`text-2xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>
                            {selectedCreator.name}
                          </h2>
                        </div>
                      )}

                      <div className={`flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        <Globe className={`w-3.5 h-3.5 ${isDarkMode ? "text-white" : "text-black"}`} />
                        <span>{selectedCreator.country}</span>
                        {selectedCreator.location && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{selectedCreator.location}</span>
                          </>
                        )}
                        {selectedCreator.address && (
                          <>
                            <span className="text-gray-300">|</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedCreator.address}, ${selectedCreator.location || ""}, ${selectedCreator.country || ""}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackSocialClick("google_maps", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedCreator.address}, ${selectedCreator.location || ""}, ${selectedCreator.country || ""}`)}`)}
                              className={`flex items-center gap-1 hover:underline transition-colors ${isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600"}`}
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{selectedCreator.address}</span>
                            </a>
                          </>
                        )}
                      </div>

                      <div className={`prose prose-sm max-w-none mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{selectedCreator.description}</p>
                      </div>
                    </div>

                    {/* Right column — shop links + gallery (no fill, no left border) */}
                    <div className="w-full md:w-2/3 px-6 md:p-8 pb-6 md:pb-8">
                      {/* Shop links row — sits above the images */}
                      {(selectedCreator.website ||
                        selectedCreator.socials?.instagram ||
                        selectedCreator.socials?.facebook ||
                        selectedCreator.socials?.twitter) && (
                        <div className={`flex flex-wrap items-center justify-end gap-x-6 gap-y-3 mb-6 pb-4 border-b ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
                          {selectedCreator.website && (
                            <a
                              href={selectedCreator.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackSocialClick("website", selectedCreator.website || "")}
                              className={`flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
                              title={t("creator.visitWebsite")}
                            >
                              <Globe className="w-4 h-4" />
                              <span>Website</span>
                            </a>
                          )}
                          {selectedCreator.socials?.instagram && (
                            <a
                              href={selectedCreator.socials.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackSocialClick("instagram", selectedCreator.socials?.instagram || "")}
                              className={`flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
                              title="Instagram"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                              </svg>
                              <span>Instagram</span>
                            </a>
                          )}
                          {selectedCreator.socials?.facebook && (
                            <a
                              href={selectedCreator.socials.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackSocialClick("facebook", selectedCreator.socials?.facebook || "")}
                              className={`flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
                              title="Facebook"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                              </svg>
                              <span>Facebook</span>
                            </a>
                          )}
                          {selectedCreator.socials?.twitter && (
                            <a
                              href={selectedCreator.socials.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackSocialClick("twitter", selectedCreator.socials?.twitter || "")}
                              className={`flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
                              title="Twitter"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                              </svg>
                              <span>Twitter</span>
                            </a>
                          )}
                        </div>
                      )}

                      <h3 className={`text-lg font-bold uppercase tracking-widest mb-6 ${isDarkMode ? "text-white" : "text-black"}`}>
                        {selectedCreator.categories?.includes("Events") ? "Gallery" : "Work"}
                      </h3>

                      {selectedCreator.gallery && selectedCreator.gallery.length > 0 ? (
                        (() => {
                          const items = selectedCreator.gallery;
                          const safeIdx = Math.min(heroIdx, items.length - 1);
                          const heroEntry = items[safeIdx];
                          const heroUrl = typeof heroEntry === "string" ? heroEntry : heroEntry?.url;
                          return (
                            <div className="flex flex-col gap-4">
                              {/* Hero image — clicking opens the full-size preview/lightbox */}
                              <div
                                className="cursor-pointer group relative overflow-hidden brutalist-border"
                                onClick={() => {
                                  if (heroUrl) {
                                    setSelectedGalleryImage({ creator: selectedCreator!, img: heroUrl });
                                    trackEvent("view_gallery_image", {
                                      creator_name: selectedCreator?.name || "",
                                      image_url: heroUrl,
                                    });
                                  }
                                }}
                              >
                                <img
                                  src={heroUrl}
                                  alt={`${selectedCreator?.name} gallery ${safeIdx + 1}`}
                                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 drop-shadow-md" />
                                </div>
                              </div>

                              {/* Thumbnail strip — only shown when there's more than one image */}
                              {items.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                  {items.map((img, idx) => {
                                    const thumbUrl = typeof img === "string" ? img : img.url;
                                    const active = idx === safeIdx;
                                    return (
                                      <button
                                        type="button"
                                        key={idx}
                                        onClick={() => setHeroIdx(idx)}
                                        className={`shrink-0 w-20 h-20 md:w-24 md:h-24 overflow-hidden brutalist-border transition-all ${
                                          active
                                            ? isDarkMode ? "ring-2 ring-white opacity-100" : "ring-2 ring-black opacity-100"
                                            : "opacity-60 hover:opacity-100"
                                        }`}
                                        aria-label={`Show image ${idx + 1}`}
                                      >
                                        <img
                                          src={thumbUrl}
                                          alt={`${selectedCreator?.name} thumbnail ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className={`py-12 text-center text-sm font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                          No images available
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GalleryImageModal
        selectedImage={selectedGalleryImage}
        onClose={() => setSelectedGalleryImage(null)}
        gallery={
          selectedCreator?.gallery?.map((g) => (typeof g === "string" ? g : g.url)).filter(Boolean) as string[] | undefined
        }
        currentIndex={(() => {
          if (!selectedGalleryImage || !selectedCreator?.gallery) return 0;
          const urls = selectedCreator.gallery.map((g) => (typeof g === "string" ? g : g.url));
          const found = urls.indexOf(selectedGalleryImage.img);
          return found >= 0 ? found : 0;
        })()}
        onIndexChange={(i) => {
          if (!selectedCreator?.gallery) return;
          const entry = selectedCreator.gallery[i];
          const url = typeof entry === "string" ? entry : entry?.url;
          if (url) {
            setSelectedGalleryImage({ creator: selectedCreator, img: url });
            setHeroIdx(i);
            trackEvent("view_gallery_image", {
              creator_name: selectedCreator?.name || "",
              image_url: url,
            });
          }
        }}
      />
    </>
  );
}
