import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Menu, X, ChevronDown, Globe, ExternalLink, Moon, Sun, Map, Grid, Upload, ChevronLeft, ChevronRight, Eye, User, Briefcase, Maximize2, Package, Wrench, Calendar, Users, Palette, Plus, Tag, Bike } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useT } from "../contexts/LanguageContext";
import { AuthSidebar } from "../components/layout/AuthSidebar";
import { ContactModal } from "../components/modals/ContactModal";
import { AboutModal } from "../components/modals/AboutModal";
import { SupportModal } from "../components/modals/SupportModal";
import { JoinModal } from "../components/modals/JoinModal";
import { GalleryImageModal } from "../components/modals/GalleryImageModal";
import { Header } from "../components/layout/Header";
import { Banner } from "../components/home/Banner";
import { FilterBar, EVENT_CATEGORIES } from "../components/home/FilterBar";
import { SubcategoryFilter } from "../components/home/SubcategoryFilter";
import { FiltersBottomSheet } from "../components/home/FiltersBottomSheet";
import { useCategories } from "../contexts/CategoriesContext";
import { CreatorGrid } from "../components/home/CreatorGrid";
import { CreatorMap } from "../components/home/CreatorMap";
import { EventCalendar } from "../components/home/EventCalendar";
import { Category, SubCategory, Creator } from "../types";
import { useCreators } from "../hooks/useCreators";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type FilterGroup = { groupName: string; options: SubCategory[] };
type FilterItem = SubCategory | FilterGroup;

const getViews = (creator: Creator) => {
  if (creator.views !== undefined) return creator.views;
  let hash = 0;
  for (let i = 0; i < creator.id.length; i++) {
    hash = creator.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 100000 + 1000;
};

export function Home() {
  const { t } = useT();
  const { creators, loading: creatorsLoading } = useCreators();
  // Cover-image preload: keep the loading state on until every creator's
  // cover image has finished decoding so the grid pops in fully rendered —
  // no progressive image flash as cards mount. Errors count as "done" so a
  // single broken image doesn't hang the whole gate. An 8s safety timeout
  // releases the gate unconditionally as a fallback.
  const [imagesReady, setImagesReady] = useState(false);
  useEffect(() => {
    if (creatorsLoading) {
      setImagesReady(false);
      return;
    }
    const urls = (creators || [])
      .map((c) => c.coverImage)
      .filter((u): u is string => !!u);
    if (urls.length === 0) {
      setImagesReady(true);
      return;
    }
    setImagesReady(false);
    let loaded = 0;
    let cancelled = false;
    const onDone = () => {
      loaded += 1;
      if (!cancelled && loaded >= urls.length) setImagesReady(true);
    };
    urls.forEach((u) => {
      const img = new Image();
      img.onload = onDone;
      img.onerror = onDone;
      try {
        img.referrerPolicy = "no-referrer";
      } catch (e) {
        // Fallback for older browsers where referrerPolicy might be read-only or unsupported
        try {
          img.setAttribute("referrerpolicy", "no-referrer");
        } catch (err) {}
      }
      img.src = u;
    });
    const safety = window.setTimeout(() => {
      if (!cancelled) setImagesReady(true);
    }, 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [creators, creatorsLoading]);

  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeProductCategory, setActiveProductCategory] = useState<Category | null>(null);
  const [activeServiceCategory, setActiveServiceCategory] = useState<Category | null>(null);
  const [activeEventCategory, setActiveEventCategory] = useState<Category | null>(null);
  const [activeCollectiveCategory, setActiveCollectiveCategory] = useState<Category | null>(null);
  const [activeArtsCategory, setActiveArtsCategory] = useState<Category | null>(null);
  const [activeSubCategories, setActiveSubCategories] = useState<SubCategory[]>([]);
  // Mobile filters bottom sheet — opened from the FilterBar's Filters button.
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  // Live taxonomy from Firestore (admin can edit at /admin/categories).
  const { selectableCategories, subcategories, getFlattenedSubcategories } = useCategories();
  // Computed lists used across filter logic. Memoized so referential equality
  // is preserved while taxonomy is unchanged.
  const CATEGORIES = useMemo<Category[]>(() => ["All", ...selectableCategories], [selectableCategories]);
  const PRODUCT_CATEGORIES = useMemo(() => getFlattenedSubcategories("Products"), [getFlattenedSubcategories]);
  const SERVICE_CATEGORIES = useMemo(() => getFlattenedSubcategories("SERVICES"), [getFlattenedSubcategories]);
  const COLLECTIVE_CATEGORIES = useMemo(() => getFlattenedSubcategories("Community"), [getFlattenedSubcategories]);
  const ARTS_CATEGORIES = useMemo(() => getFlattenedSubcategories("Creative & Media"), [getFlattenedSubcategories]);
  // Note: SUBCATEGORIES is the full record straight from the hook.
  const SUBCATEGORIES = subcategories;
  // Icon map used by the mobile filter drawer. Falls back to Tag for any new
  // main category created from /admin/categories that doesn't have a curated
  // icon yet — keeps the UI working without code changes when admin adds one.
  const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Products: Package,
    SERVICES: Wrench,
    Events: Calendar,
    Community: Users,
    "Creative & Media": Palette,
  };
  // Mobile drawer entries — derived from the live selectableCategories so a
  // new main category created from the admin appears here too.
  const mobileCategoryEntries = useMemo(
    () =>
      selectableCategories.map((name) => ({
        name,
        icon: CATEGORY_ICONS[name] || Tag,
        subCategories: getFlattenedSubcategories(name),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectableCategories, getFlattenedSubcategories],
  );
  const {
    isDarkMode, setIsDarkMode,
    isJoinModalOpen, setIsJoinModalOpen,
    isAboutModalOpen, setIsAboutModalOpen,
    isContactModalOpen, setIsContactModalOpen,
    isSupportModalOpen, setIsSupportModalOpen,
    isAuthSidebarOpen, setIsAuthSidebarOpen,
    openCreatorProfile,
  } = useUI();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const [activeProfileTab, setActiveProfileTab] = useState<"PROFILE" | "CATEGORIES" | "GALLERY" | "MY EVENTS">("PROFILE");
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const { currentUser: loggedInUser, userProfile: profileDataRemote, signup, loginWithGoogle, updateUserProfile } = useAuth();
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [profileData, setProfileData] = useState<{
    role: string;
    name: string;
    email: string;
    bio: string;
    location: string;
    country: string;
    address: string;
    website: string;
    instagram: string;
    facebook: string;
    twitter: string;
    profileImage: string;
    coverImage: string;
    gallery: any[];
    events: any[];
    isPublished: boolean;
    categories: Category[];
    subCategories: SubCategory[];
    filters: string[];
  }>({
    role: "user",
    name: "",
    email: "",
    bio: "",
    location: "",
    country: "",
    address: "",
    website: "",
    instagram: "",
    facebook: "",
    twitter: "",
    profileImage: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=400&q=80",
    coverImage: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1600&q=80",
    gallery: [],
    events: [],
    isPublished: false,
    categories: [],
    subCategories: [],
    filters: []
  });

  useEffect(() => {
    if (profileDataRemote) {
      setProfileData(prev => ({ ...prev, ...profileDataRemote }));
    }
  }, [profileDataRemote]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const [expandedMobileSubCategory, setExpandedMobileSubCategory] = useState<string | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{creator: Creator, img: string} | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  // Allow deep links / "close event page" buttons to land on the correct tab
  // by accepting `?tab=calendar|gallery|explore`. Default is EXPLORE.
  const [searchParams] = useSearchParams();
  const initialTab = (() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    if (t === "calendar") return "CALENDAR" as const;
    if (t === "gallery") return "GALLERY" as const;
    return "EXPLORE" as const;
  })();
  const [featuredTab, setFeaturedTab] = useState<"EXPLORE" | "GALLERY" | "CALENDAR">(initialTab);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const allCreators = useMemo(() => {
    const list = [...creators].filter(c => c.isPublished !== false);
    if (profileData.isPublished) {
      list.unshift({
        id: "current-user",
        name: profileData.name || "My Profile",
        description: profileData.bio,
        website: profileData.website,
        socials: {
          instagram: profileData.instagram,
          facebook: profileData.facebook,
          twitter: profileData.twitter,
        },
        coverImage: profileData.coverImage || "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&q=80",
        gallery: profileData.gallery,
        categories: profileData.categories,
        subCategories: profileData.subCategories,
        location: profileData.location,
        country: profileData.country,
        address: profileData.address,
      });
    }
    return list;
  }, [profileData, creators]);

  // Extract unique countries from creators
  const countries = useMemo(() => {
    const uniqueCountries = new Set(allCreators.map((c) => c.country).filter(Boolean));
    return ["All", ...Array.from(uniqueCountries).sort()];
  }, [allCreators]);

  // Extract unique cities from creators
  const cities = useMemo(() => {
    const uniqueCities = new Set(allCreators.map((c) => c.location).filter(Boolean));
    return Array.from(uniqueCities).sort();
  }, [allCreators]);

  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    setActiveProductCategory(null);
    setActiveServiceCategory(null);
    setActiveSubCategories([]);
  };

  // Search wraps setSearchQuery: typing into search jumps the category filter
  // back to "All" so the query runs across every creator, not just within the
  // currently-selected category. Clearing the search leaves whatever category
  // the user is now on (which is "All" after their first keystroke).
  const handleSearchQueryChange = (q: string) => {
    setSearchQuery(q);
    if (q && activeCategory !== "All") {
      setActiveCategory("All");
      setActiveProductCategory(null);
      setActiveServiceCategory(null);
      setActiveEventCategory(null);
      setActiveCollectiveCategory(null);
      setActiveArtsCategory(null);
      setActiveSubCategories([]);
    }
  };

  const handleProductCategoryChange = (category: Category) => {
    setActiveProductCategory(category);
    setActiveSubCategories([]);
  };

  const handleServiceCategoryChange = (category: Category) => {
    setActiveServiceCategory(category);
    setActiveSubCategories([]);
  };

  const handleEventCategoryChange = (category: Category) => {
    setActiveEventCategory(category);
    setActiveSubCategories([]);
  };

  const handleCollectiveCategoryChange = (category: Category) => {
    setActiveCollectiveCategory(category);
    setActiveSubCategories([]);
  };

  const handleArtsCategoryChange = (category: Category) => {
    setActiveArtsCategory(category);
    setActiveSubCategories([]);
  };

  const currentCombinedValue = 
    activeCategory === "Products" && activeProductCategory && activeProductCategory !== "All" ? activeProductCategory :
    activeCategory === "SERVICES" && activeServiceCategory && activeServiceCategory !== "All" ? activeServiceCategory :
    activeCategory === "Events" && activeEventCategory && activeEventCategory !== "All" ? activeEventCategory :
    activeCategory === "Community" && activeCollectiveCategory && activeCollectiveCategory !== "All" ? activeCollectiveCategory :
    activeCategory === "Creative & Media" && activeArtsCategory && activeArtsCategory !== "All" ? activeArtsCategory :
    activeCategory;

  const currentSidebarCategory = 
    activeCategory === "Products" ? (activeProductCategory === "All" || !activeProductCategory ? null : activeProductCategory) : 
    activeCategory === "SERVICES" ? (activeServiceCategory === "All" || !activeServiceCategory ? null : activeServiceCategory) : 
    activeCategory === "Events" ? (activeEventCategory === "All" || !activeEventCategory ? null : activeEventCategory) : 
    activeCategory === "Community" ? (activeCollectiveCategory === "All" || !activeCollectiveCategory ? null : activeCollectiveCategory) : 
    activeCategory === "Creative & Media" ? (activeArtsCategory === "All" || !activeArtsCategory ? null : activeArtsCategory) : 
    activeCategory;

  const handleCombinedCategoryChange = (value: string) => {
    if (value === "All") {
      handleCategoryChange("All");
    } else if (CATEGORIES.includes(value as Category)) {
      handleCategoryChange(value as Category);
    } else if (PRODUCT_CATEGORIES.includes(value as Category)) {
      handleCategoryChange("Products");
      handleProductCategoryChange(value as Category);
    } else if (SERVICE_CATEGORIES.includes(value as Category)) {
      handleCategoryChange("SERVICES");
      handleServiceCategoryChange(value as Category);
    } else if (EVENT_CATEGORIES.includes(value as Category)) {
      handleCategoryChange("Events");
      handleEventCategoryChange(value as Category);
    } else if (COLLECTIVE_CATEGORIES.includes(value as Category)) {
      handleCategoryChange("Community");
      handleCollectiveCategoryChange(value as Category);
    } else if (ARTS_CATEGORIES.includes(value as Category)) {
      handleCategoryChange("Creative & Media");
      handleArtsCategoryChange(value as Category);
    }
  };

  const filteredCreators = allCreators.filter((creator) => {
    // Tolerant of two persistence shapes coexisting in production:
    //   (A) new — main in `categories`, children/filters in `subCategories`
    //   (B) legacy — main + children mixed inside `categories`
    // Matching against the union covers both without a data migration.
    const allCats = [
      ...((creator.categories as string[]) || []),
      ...((creator.subCategories as string[]) || []),
    ];
    const includes = (v: string) => allCats.includes(v);

    const PRODUCT_SUBS = ["Bikes & Frames", "Components", "Accessories", "Clothing", "Tools"];
    const SERVICE_SUBS = ["Custom Builds & Repairs", "frame building", "Restorations", "Paint & Finishing"];
    const EVENT_SUBS = ["Competitions", "Social Rides", "Touring", "Workshops", "Festivals"];
    const COLLECTIVE_SUBS = ["Cycling Culture", "Riding Groups", "Performance Groups", "Bikepacking & Adventure", "Learning & Education"];
    const ARTS_SUBS = ["Visual Artists & Illustrators", "Photographers & Videomakers", "Editorial & Publishing"];

    let matchesCategory = false;
    if (activeCategory === "All") {
      matchesCategory = true;
    } else if (activeCategory === "Products") {
      matchesCategory =
        activeProductCategory && activeProductCategory !== "All"
          ? includes(activeProductCategory as string)
          : includes("Products") || PRODUCT_SUBS.some(includes);
    } else if (activeCategory === "SERVICES") {
      matchesCategory =
        activeServiceCategory && activeServiceCategory !== "All"
          ? includes(activeServiceCategory as string)
          : includes("SERVICES") || SERVICE_SUBS.some(includes);
    } else if (activeCategory === "Events") {
      matchesCategory =
        activeEventCategory && activeEventCategory !== "All"
          ? includes(activeEventCategory as string)
          : includes("Events") || EVENT_SUBS.some(includes);
    } else if (activeCategory === "Community") {
      matchesCategory =
        activeCollectiveCategory && activeCollectiveCategory !== "All"
          ? includes(activeCollectiveCategory as string)
          : includes("Community") || COLLECTIVE_SUBS.some(includes);
    } else if (activeCategory === "Creative & Media") {
      matchesCategory =
        activeArtsCategory && activeArtsCategory !== "All"
          ? includes(activeArtsCategory as string)
          : includes("Creative & Media") || ARTS_SUBS.some(includes);
    } else {
      matchesCategory = includes(activeCategory as string);
    }

    // Sidebar filters: chips clicked in the SubcategoryFilter or mobile drawer.
    // Match against the union too — same legacy/new shape tolerance.
    const matchesSubCategory =
      activeSubCategories.length === 0 ||
      activeSubCategories.some((sub) => allCats.includes(sub as string));
    const matchesCountry =
      selectedCountry === "All" || creator.country === selectedCountry;
    // Match the query across the most useful text fields. When the query is
    // empty we short-circuit to true so we don't scan strings unnecessarily.
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      creator.name.toLowerCase().includes(q) ||
      (creator.description || "").toLowerCase().includes(q) ||
      (creator.location || "").toLowerCase().includes(q) ||
      (creator.country || "").toLowerCase().includes(q) ||
      (creator.categories || []).some((c) => String(c).toLowerCase().includes(q)) ||
      (creator.subCategories || []).some((s) => String(s).toLowerCase().includes(q));
    return (
      matchesCategory && matchesSubCategory && matchesCountry && matchesSearch
    );
  });

  const galleryImagesList = useMemo(() => {
    return creators
      .filter(c => c.isPublished !== false)
      .flatMap((creator) => (creator.gallery || []).map((img) => ({ 
        creator, 
        img: typeof img === 'string' ? img : img.url
      })))
      .sort(() => Math.random() - 0.5)
      .slice(0, 24);
  }, [creators]);

  const calendarEvents = useMemo(() => {
    const passesFilters = (country: string | undefined, category: string | undefined) => {
      if (selectedCountry !== "All" && country !== selectedCountry) return false;
      if (activeEventCategory && activeEventCategory !== "All" && category !== activeEventCategory) return false;
      return true;
    };

    // Legacy shape: the creator doc itself is the event (top-level eventDate /
    // recurringEvent set on the creator).
    const topLevel = creators
      .filter((c) => c.isPublished !== false)
      .filter((c) => {
        if (!c.categories?.includes("Events") || (!c.eventDate && !c.recurringEvent)) return false;
        if (selectedCountry !== "All" && c.country !== selectedCountry) return false;
        if (activeEventCategory && activeEventCategory !== "All") {
          return c.subCategories?.includes(activeEventCategory as any) || false;
        }
        return true;
      });

    // New shape: events nested inside each creator's `events[]` array.
    // Visibility gates:
    //   - The event itself must have `isPublished: true`.
    //   - If the event was published "as shop" (the default), the parent shop
    //     must ALSO be published. This keeps draft shops from leaking via events.
    //   - If the event was published "as user" (the modal-confirmed fallback
    //     when the shop is in draft), it bypasses the shop's publish state.
    //     Events with no `publishedFrom` field are treated as "shop" for
    //     backwards compatibility.
    const nested = creators
      .filter((c) => Array.isArray((c as any).events) && (c as any).events.length > 0)
      .flatMap((c) =>
        (((c as any).events as any[]) || [])
          .filter((e) => {
            if (!e || !e.isPublished) return false;
            if (!(e.startDate || e.endDate)) return false;
            if (e.publishedFrom === "user") return true;
            return c.isPublished !== false;
          })
          .filter((e) => passesFilters(c.country, e.category))
          .map((e, idx) => ({
            // The Firestore doc ID — clicking the chip in the calendar opens
            // `creators/{id}` in the profile modal. Multiple events per creator
            // would collide on React keys, but EventCalendar composes its own
            // unique key from id + index + dates, so this is safe.
            id: c.id,
            _calendarKey: `${c.id}-event-${idx}`,
            _eventIdx: idx,
            name: e.title || "Untitled Event",
            description: e.description || c.description,
            website: c.website,
            socials: c.socials,
            profileImage: c.profileImage,
            coverImage: e.coverImage || c.coverImage,
            gallery: e.gallery || c.gallery || [],
            categories: ["Events"],
            subCategories: e.category ? [e.category] : [],
            location: e.location || c.location,
            country: c.country,
            eventDate: e.startDate,
            endDate: e.endDate,
            startTime: e.startTime,
            endTime: e.endTime,
            recurrence: e.recurrence,
            publishedFrom: e.publishedFrom,
            creatorName: c.name,
            creatorImage: c.profileImage,
            creatorId: c.id,
          } as any))
      );

    return [...topLevel, ...nested];
  }, [selectedCountry, activeEventCategory, creators]);



  const navigate = useNavigate();
  const setSelectedCreator = (creator: Creator) => openCreatorProfile(creator.id);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header
        profileData={profileData}
        setSelectedCreator={(creator) => openCreatorProfile(creator.id)}
      />

      <Banner isDarkMode={isDarkMode} featuredTab={featuredTab} setFeaturedTab={setFeaturedTab} />

      {/* Featured Sections */}
      <div className={`w-full ${featuredTab === "EXPLORE" ? "" : "py-12 border-b"} ${isDarkMode ? "bg-black border-white/10" : "bg-gray-50 border-black/10"}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
          {/* Content */}
          {featuredTab !== "EXPLORE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatePresence mode="wait">
                {featuredTab === "GALLERY" ? (
                  galleryImagesList.map((item, i) => (
                    <motion.div
                      key={`gallery-${item.creator.id}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex flex-col gap-2 cursor-pointer group"
                      onClick={() => setSelectedGalleryImage(item)}
                    >
                      <div className={`aspect-square overflow-hidden relative`}>
                        <img 
                          src={item.img} 
                          alt={item.creator.name} 
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-widest text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {item.creator.name}
                      </span>
                    </motion.div>
                  ))
                ) : featuredTab === "CALENDAR" ? (
                  <EventCalendar
                    isDarkMode={isDarkMode}
                    calendarDate={calendarDate}
                    setCalendarDate={setCalendarDate}
                    calendarEvents={calendarEvents}
                    selectedCountry={selectedCountry}
                    setIsCountryDropdownOpen={setIsCountryDropdownOpen}
                    activeEventCategory={activeEventCategory}
                    handleEventCategoryChange={handleEventCategoryChange}
                    setSelectedCreator={setSelectedCreator}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {featuredTab === "EXPLORE" && (
        <>
          <FilterBar 
            isDarkMode={isDarkMode}
            viewMode={viewMode} setViewMode={setViewMode}
            searchQuery={searchQuery} setSearchQuery={handleSearchQueryChange}
            selectedCountry={selectedCountry} setIsCountryDropdownOpen={setIsCountryDropdownOpen}
            setIsMobileFiltersOpen={setIsMobileFiltersOpen}
            activeCategory={activeCategory} handleCategoryChange={handleCategoryChange}
            activeProductCategory={activeProductCategory} handleProductCategoryChange={handleProductCategoryChange}
            activeServiceCategory={activeServiceCategory} handleServiceCategoryChange={handleServiceCategoryChange}
            activeEventCategory={activeEventCategory} handleEventCategoryChange={handleEventCategoryChange}
            activeCollectiveCategory={activeCollectiveCategory} handleCollectiveCategoryChange={handleCollectiveCategoryChange}
            activeArtsCategory={activeArtsCategory} handleArtsCategoryChange={handleArtsCategoryChange}
            currentCombinedValue={currentCombinedValue}
            activeSubCategories={activeSubCategories}
            currentSidebarCategory={currentSidebarCategory}
            setIsFiltersDrawerOpen={setIsFiltersDrawerOpen}
          />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-8 items-start">
        {/* Subcategories Sidebar */}
        <SubcategoryFilter 
          isDarkMode={isDarkMode}
          currentSidebarCategory={currentSidebarCategory}
          activeSubCategories={activeSubCategories}
          setActiveSubCategories={setActiveSubCategories}
        />

        {/* Creators List */}
        <div className="flex-1 w-full min-w-0">
          {/* Active filter chips — mobile only (desktop has the sidebar).
              Lets the visitor see what's applied at a glance and remove
              filters one by one without re-opening the drawer. */}
          {activeSubCategories.length > 0 && (
            <div className="md:hidden mb-4 flex flex-wrap gap-2">
              {activeSubCategories.map((sub) => (
                <button
                  key={String(sub)}
                  type="button"
                  onClick={() =>
                    setActiveSubCategories((prev) => prev.filter((s) => s !== sub))
                  }
                  title="Remove filter"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest border-2 transition-colors ${
                    isDarkMode
                      ? "bg-white text-black border-white hover:bg-gray-200"
                      : "bg-black text-white border-black hover:bg-gray-800"
                  }`}
                >
                  {String(sub)}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveSubCategories([])}
                className={`text-[11px] font-bold uppercase tracking-widest underline ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
              >
                Clear all
              </button>
            </div>
          )}
          {(creatorsLoading || !imagesReady) ? (
            // Loading state — gray bike pulsing to foreground colour. Renders
            // INSTEAD of the grid/empty-state so the "No results found" copy
            // never flashes during the initial Firestore fetch, AND held until
            // every cover image is decoded so the grid pops in fully ready.
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-4"
            >
              <motion.div
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className={isDarkMode ? "text-white" : "text-black"}
              >
                <Bike className="w-16 h-16" />
              </motion.div>
              <div className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                {t("home.loading")}
              </div>
            </motion.div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <CreatorGrid
                  isDarkMode={isDarkMode}
                  filteredCreators={filteredCreators}
                  setSelectedCreator={setSelectedCreator}
                />
              ) : (
                <CreatorMap
                  isDarkMode={isDarkMode}
                  filteredCreators={filteredCreators}
                />
              )}

              {filteredCreators.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-gray-500"
                >
                  <Search className={`w-16 h-16 mb-6 ${isDarkMode ? "text-white/20" : "text-black/20"}`} />
                  <h2 className={`text-xl font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>
                    {t("home.noResults.title")}
                  </h2>
                  <p className="text-gray-500 text-center max-w-md font-bold uppercase tracking-wider">
                    {t("home.noResults.body")}
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
      </>
      )}

      {/* Footer */}
      <footer className={`w-full py-12 brutalist-border border-b-0 border-l-0 border-r-0 mt-12 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center space-y-6">
          <div className="text-4xl font-display uppercase tracking-widest">
            DECYCLES.CC
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-sm font-bold uppercase tracking-widest">
            <button onClick={() => setIsAboutModalOpen(true)} className={`px-6 py-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}>
              ABOUT
            </button>
            <button onClick={() => setIsContactModalOpen(true)} className={`px-6 py-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}>
              CONTACTS
            </button>
            <a href="https://www.instagram.com/decycles.cc/" target="_blank" rel="noopener noreferrer" className={`px-6 py-2 brutalist-border brutalist-shadow transition-colors flex items-center gap-2 ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}>
              FOLLOW US <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={() => setIsSupportModalOpen(true)} className={`px-6 py-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}>
              SUPPORT
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Filters Overlay */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-[200] flex flex-col md:hidden ${isDarkMode ? "bg-black" : "bg-white"}`}
          >
            <div className={`flex items-center justify-between p-6 ${isDarkMode ? "bg-black" : "bg-white"}`}>
              {expandedMobileSubCategory ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setExpandedMobileSubCategory(null)}
                    className={`p-2 brutalist-border transition-colors ${isDarkMode ? "hover:bg-white hover:text-black" : "hover:bg-black hover:text-white"}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className={`text-xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>{expandedMobileSubCategory}</h2>
                </div>
              ) : expandedMobileCategory ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setExpandedMobileCategory(null)}
                    className={`p-2 brutalist-border transition-colors ${isDarkMode ? "hover:bg-white hover:text-black" : "hover:bg-black hover:text-white"}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className={`text-xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>{expandedMobileCategory}</h2>
                </div>
              ) : (
                <h2 className={`text-xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>Categories</h2>
              )}
              <button 
                onClick={() => setIsMobileFiltersOpen(false)} 
                className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? "bg-black" : "bg-gray-50"}`}>
              <AnimatePresence mode="wait">
                {expandedMobileSubCategory ? (
                  <motion.div
                    key="filters"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4"
                  >
                    <button
                      onClick={() => {
                        setActiveSubCategories([]);
                      }}
                      className={`py-2 px-3 text-sm text-center font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                        activeSubCategories.length === 0
                          ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                          : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                      }`}
                    >
                      ALL {expandedMobileSubCategory}
                    </button>
                    
                    <div className="flex flex-col gap-5">
                      {(() => {
                        const filters = SUBCATEGORIES[expandedMobileSubCategory || ""];
                        if (!filters) return null;
                        
                        return filters.map((item, idx) => {
                          if (typeof item === 'string') {
                            const filterOpt = item;
                            const isFilterActive = activeSubCategories.includes(filterOpt);
                            return (
                              <button
                                key={filterOpt}
                                onClick={() => {
                                  setActiveSubCategories(prev => 
                                    prev.includes(filterOpt) 
                                      ? prev.filter(s => s !== filterOpt)
                                      : [...prev, filterOpt]
                                  );
                                }}
                                className={`py-1.5 px-3 text-xs text-left font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                                  isFilterActive
                                    ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                                    : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                                }`}
                              >
                                {filterOpt}
                              </button>
                            );
                          } else {
                            return (
                              <div key={item.groupName} className="flex flex-col gap-2 w-full">
                                <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  {item.groupName}
                                </h4>
                                <div className="flex flex-col gap-1.5">
                                  {item.options.map((filterOpt) => {
                                    const isFilterActive = activeSubCategories.includes(filterOpt);
                                    return (
                                      <button
                                        key={filterOpt}
                                        onClick={() => {
                                          setActiveSubCategories(prev => 
                                            prev.includes(filterOpt) 
                                              ? prev.filter(s => s !== filterOpt)
                                              : [...prev, filterOpt]
                                          );
                                        }}
                                        className={`py-1.5 px-3 text-xs text-left font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                                          isFilterActive
                                            ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                                            : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                                        }`}
                                      >
                                        {filterOpt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                        });
                      })()}
                    </div>
                  </motion.div>
                ) : expandedMobileCategory ? (
                  <motion.div
                    key="subcategories"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-2"
                  >
                    <button
                      onClick={() => {
                        handleCombinedCategoryChange(expandedMobileCategory);
                        setIsMobileFiltersOpen(false);
                      }}
                      className={`py-2 px-3 text-sm text-left font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                        activeCategory === expandedMobileCategory && currentCombinedValue === expandedMobileCategory
                          ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                          : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                      }`}
                    >
                      All {expandedMobileCategory}
                    </button>
                    
                    {(() => {
                      const catData = mobileCategoryEntries.find(c => c.name === expandedMobileCategory);
                      
                      if (!catData) return null;
                      
                      return catData.subCategories.map(subCat => {
                        const isSubActive = currentCombinedValue === subCat;
                        const hasFilters = SUBCATEGORIES[subCat] && SUBCATEGORIES[subCat].length > 0;
                        
                        return (
                          <button
                            key={subCat}
                            onClick={() => {
                              if (hasFilters) {
                                setExpandedMobileSubCategory(subCat);
                                handleCombinedCategoryChange(subCat);
                              } else {
                                handleCombinedCategoryChange(subCat);
                                setIsMobileFiltersOpen(false);
                              }
                            }}
                            className={`flex items-center justify-between py-2 px-3 text-sm text-left font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                              isSubActive
                                ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                                : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                            }`}
                          >
                            {subCat}
                            {hasFilters && <ChevronRight className="w-4 h-4" />}
                          </button>
                        );
                      });
                    })()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="categories"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-2"
                  >
                    <button
                      onClick={() => {
                        handleCombinedCategoryChange("All");
                        setIsMobileFiltersOpen(false);
                      }}
                      className={`flex items-center gap-2 py-2 px-3 text-sm text-left font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                        activeCategory === "All"
                          ? isDarkMode ? "bg-white text-black brutalist-shadow translate-x-[-2px] translate-y-[-2px]" : "bg-black text-white brutalist-shadow translate-x-[-2px] translate-y-[-2px]"
                          : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                      ALL CATEGORIES
                    </button>
                    
                    {mobileCategoryEntries.map((cat) => {
                      const Icon = cat.icon;
                      const isActive = activeCategory === cat.name;
                      // No mobile category is disabled today (Events was unblocked).
                      // Kept the variable so the existing JSX branches still type-check.
                      const isDisabled = false;

                      return (
                        <button
                          key={cat.name}
                          onClick={() => {
                            if (isDisabled) {
                              // Same flash-tooltip pattern as the desktop FilterBar.
                              // No tooltip in this mobile sheet — the row already has a "Soon" badge.
                              return;
                            }
                            setExpandedMobileCategory(cat.name);
                            handleCategoryChange(cat.name as Category);
                          }}
                          aria-disabled={isDisabled}
                          className={`flex items-center justify-between py-2 px-3 text-sm text-left font-bold uppercase tracking-wider brutalist-border transition-all duration-300 ${
                            isDisabled
                              ? isDarkMode ? "bg-black text-white" : "bg-white text-black"
                              : isActive
                              ? isDarkMode ? "bg-white text-black brutalist-shadow translate-x-[-2px] translate-y-[-2px]" : "bg-black text-white brutalist-shadow translate-x-[-2px] translate-y-[-2px]"
                              : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                          }`}
                        >
                          <div className={`flex items-center gap-2 ${isDisabled ? "opacity-50" : ""}`}>
                            <Icon className="w-4 h-4" />
                            {cat.name}
                          </div>
                          {isDisabled ? (
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest brutalist-border ${
                              isDarkMode ? "bg-white text-black" : "bg-black text-white"
                            }`}>
                              Soon
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Apply Button at the bottom */}
            <div className={`p-4 border-t ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className={`w-full py-3 font-bold uppercase tracking-widest brutalist-border brutalist-shadow transition-colors ${
                  isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                Show Results
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCountryDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-[200] flex flex-col ${isDarkMode ? "bg-black" : "bg-white"}`}
          >
            <div className={`flex items-center justify-between p-6 ${isDarkMode ? "bg-black" : "bg-white"}`}>
              <h2 className={`text-xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>Select Nationality</h2>
              <button 
                onClick={() => setIsCountryDropdownOpen(false)} 
                className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? "bg-black" : "bg-gray-50"}`}>
              <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => {
                      setSelectedCountry(country);
                      setIsCountryDropdownOpen(false);
                    }}
                    className={`p-6 text-left brutalist-border transition-all duration-300 ${
                      selectedCountry === country
                        ? isDarkMode ? "bg-white text-black brutalist-shadow translate-x-[-4px] translate-y-[-4px]" : "bg-black text-white brutalist-shadow translate-x-[-4px] translate-y-[-4px]"
                        : isDarkMode ? "bg-black text-white hover:bg-white/10" : "bg-white text-black hover:bg-black/10"
                    } flex flex-col items-center justify-center gap-3`}
                  >
                    <Globe className={`w-8 h-8 ${
                      selectedCountry === country 
                        ? isDarkMode ? "text-black" : "text-white" 
                        : isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`} />
                    <span className="font-bold uppercase tracking-widest text-sm text-center">
                      {country === "All" ? "WORLDWIDE" : country}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* JoinModal is rendered globally in App.tsx so it works on every page. */}

      <GalleryImageModal
        selectedImage={selectedGalleryImage} 
        onClose={() => setSelectedGalleryImage(null)} 
      />

      {/* About Sheet */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <AboutModal 
            isOpen={isAboutModalOpen} 
            onClose={() => setIsAboutModalOpen(false)} 
            isDarkMode={isDarkMode} 
          />
        )}
      </AnimatePresence>
      {/* Support Sheet */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <SupportModal 
            isOpen={isSupportModalOpen} 
            onClose={() => setIsSupportModalOpen(false)} 
            isDarkMode={isDarkMode} 
          />
        )}
      </AnimatePresence>
      {/* Contact Sheet */}
      <AnimatePresence>
        {isContactModalOpen && (
          <ContactModal 
            isOpen={isContactModalOpen} 
            onClose={() => setIsContactModalOpen(false)} 
            isDarkMode={isDarkMode} 
          />
        )}
      </AnimatePresence>
      <AuthSidebar isOpen={isAuthSidebarOpen} onClose={() => setIsAuthSidebarOpen(false)} isDarkMode={isDarkMode} />

      {/* Mobile-only filters bottom sheet. Desktop has the SubcategoryFilter
          sidebar instead, so this drawer hides itself at md+. */}
      <FiltersBottomSheet
        isOpen={isFiltersDrawerOpen}
        onClose={() => setIsFiltersDrawerOpen(false)}
        isDarkMode={isDarkMode}
        parent={currentSidebarCategory}
        activeSubCategories={activeSubCategories}
        setActiveSubCategories={setActiveSubCategories}
      />
    </div>
  );
}
