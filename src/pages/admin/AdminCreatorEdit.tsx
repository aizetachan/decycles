import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { Creator, Category, SubCategory } from '../../types';
import { Save, ArrowLeft, Plus, Trash2, Upload, MapPin, Loader2, ChevronDown, ChevronUp, Search, X, Calendar as CalIcon, Pencil } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { uploadImage, stripUndefined, normalizeUrl } from '../../lib/upload';
import { useCropper } from '../../components/ui/ImageCropperProvider';
import type { CropOptions } from '../../components/ui/ImageCropModal';
import { CREATOR_DEFAULT_AVATAR, CREATOR_DEFAULT_COVER } from '../../lib/defaultAvatars';
import { GalleryManager } from '../../components/ui/GalleryManager';
import { geocodeAddress } from '../../lib/geocode';
import { EVENT_CATEGORIES } from '../../constants/categories';
import { useCategories } from '../../contexts/CategoriesContext';

interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  isDarkMode: boolean;
  // 'progress' shows a 0..100 bar (cover/gallery). 'spinner' shows an indeterminate
  // loader (profile avatar — typically too small/fast for a meaningful bar).
  variant?: 'progress' | 'spinner';
  // When set, a crop modal (to this aspect ratio) opens before upload.
  crop?: CropOptions;
  // Optional hook fired after a successful upload (not after manual URL edits).
  // Used to e.g. open a preview modal after the cover is uploaded.
  onAfterUpload?: (url: string) => void;
  // Optional hook fired when the loaded image preview is clicked. When set,
  // the image gets cursor-pointer and the click handler. Used by Cover Image
  // to open the preview modal.
  onImageClick?: () => void;
}

// Imperative API exposed via ref so parents can trigger the file picker
// programmatically (e.g. from inside a separate modal). Only the picker is
// exposed — everything else is controlled via props.
export interface ImageFieldHandle {
  openPicker: () => void;
}

const ImageField = forwardRef<ImageFieldHandle, ImageFieldProps>(function ImageField(
  { label, value, onChange, folder, isDarkMode, variant = 'progress', crop, onAfterUpload, onImageClick },
  ref,
) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cropImage = useCropper();
  // Snapshot of the URL when the manual text input got focus. Used to detect
  // whether the user actually pasted/edited a NEW URL (vs. just clicking in
  // and out without changes), so we don't spam onAfterUpload.
  const urlOnFocusRef = useRef<string>('');

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    if (variant === 'progress') setProgress(0);
    try {
      const url = await uploadImage(
        file,
        folder,
        variant === 'progress' ? (pct) => setProgress(pct) : undefined,
      );
      onChange(url);
      onAfterUpload?.(url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    let file: File | null = files[0];
    if (crop) {
      file = await cropImage(files[0], crop);
      if (!file) return; // cancelled
    }
    await uploadFile(file);
  };

  // Click the existing image to re-crop it (or Replace inside the modal).
  const editExisting = async () => {
    if (!value || !crop) return;
    const cropped = await cropImage(value, crop);
    if (cropped) await uploadFile(cropped);
  };

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  } as any);

  useImperativeHandle(ref, () => ({ openPicker }), [openPicker]);

  const inputClass = `w-full p-4 border-2 outline-none font-medium ${
    isDarkMode ? 'bg-black border-zinc-700 focus:border-white' : 'bg-gray-50 border-gray-300 focus:border-black'
  }`;
  const labelClass = `text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      {value && (
        <div className="relative group">
          <img
            src={value}
            alt=""
            className={`w-full h-32 object-cover border-2 border-current/20 ${crop || onImageClick ? 'cursor-pointer' : ''}`}
            onClick={crop ? editExisting : onImageClick}
            referrerPolicy="no-referrer"
          />
          {crop && (
            <div
              onClick={editExisting}
              className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/30 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </span>
            </div>
          )}
          {uploading && variant === 'spinner' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {uploading && variant === 'progress' && progress !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white mb-2">
                Uploading {Math.round(progress)}%
              </span>
              <div className="w-full max-w-[200px] h-1.5 bg-white/20 overflow-hidden">
                <div className="h-full bg-white transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { urlOnFocusRef.current = value; }}
        onBlur={() => {
          // Fire the post-upload hook (e.g. open the cover preview modal) when
          // the user typed/pasted a new URL by hand, not on a no-op blur.
          if (value && value !== urlOnFocusRef.current) {
            onAfterUpload?.(value);
          }
        }}
        placeholder="https://..."
        className={inputClass}
      />
      <div
        {...getRootProps()}
        className={`relative w-full p-4 border-2 border-dashed cursor-pointer flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${
          isDragActive
            ? isDarkMode ? 'border-white bg-white/10 text-white' : 'border-black bg-black/10 text-black'
            : isDarkMode ? 'border-zinc-700 text-gray-400 hover:border-white hover:text-white' : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
        }`}
      >
        <input {...getInputProps()} />
        {uploading && variant === 'spinner' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : uploading && variant === 'progress' && progress !== null ? (
          <>
            <Upload className="w-4 h-4" />
            Uploading {Math.round(progress)}%
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Drag & drop or click to upload
          </>
        )}
      </div>
      {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
    </div>
  );
});


type AdminFormData = Partial<Creator> & {
  isPublished?: boolean;
  events?: any[];
};

// Per-event location editor: its own geocoded address (independent of the
// shop), a one-click "Use shop location", and a required-location warning.
// Mirrors the creator-side EditProfile so admin-managed events behave the same.
function AdminEventLocation({ event, idx, updateEvent, formData, isDarkMode, inputClass }: any) {
  const [geocoding, setGeocoding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const shopHasLocation = !!(
    (Array.isArray(formData.coordinates) && formData.coordinates.length === 2) ||
    (formData.address && String(formData.address).trim())
  );
  const eventHasOwnCoords = Array.isArray(event.coordinates) && event.coordinates.length === 2;
  const eventCanPin = eventHasOwnCoords || (Array.isArray(formData.coordinates) && formData.coordinates.length === 2);

  const onBlur = async () => {
    const address = (event.address || '').trim();
    if (!address) return;
    setGeocoding(true);
    setMsg(null);
    try {
      const result = await geocodeAddress(address);
      if (!result) {
        setMsg("Couldn't locate this address on the map.");
        return;
      }
      updateEvent(idx, {
        coordinates: result.coordinates,
        location: result.city || event.location || '',
        country: result.country || event.country || '',
      });
      setMsg(`Location found: ${result.formattedAddress}`);
    } catch (err) {
      console.error('Failed to geocode event address', err);
      setMsg('Geocoding failed. Try again later.');
    } finally {
      setGeocoding(false);
    }
  };

  const useShopLocation = () => {
    updateEvent(idx, {
      address: formData.address || event.address || '',
      coordinates: formData.coordinates || event.coordinates,
      location: formData.location || event.location || '',
      country: formData.country || event.country || '',
    });
    setMsg("Using the shop's location for this event.");
  };

  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>
          Event location <span className="text-red-500">*</span>
        </label>
        {shopHasLocation && (
          <button
            type="button"
            onClick={useShopLocation}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors ${
              isDarkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-black/30 text-black hover:bg-black/5'
            }`}
          >
            <MapPin className="w-3 h-3" /> Use shop location
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="e.g. Plaça de Catalunya, Barcelona, Spain"
          value={event.address || ''}
          onChange={(e) => updateEvent(idx, { address: e.target.value })}
          onBlur={onBlur}
          className={`pl-10 ${inputClass}`}
        />
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
        {geocoding && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest ${muted}`}>
            Locating...
          </span>
        )}
      </div>
      {msg && <p className={`text-[10px] font-medium ${muted}`}>{msg}</p>}
      {eventCanPin ? (
        <p className={`text-[10px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
          Enter the exact venue so the event pins precisely on the map. City fills in automatically.
        </p>
      ) : (
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
          ⚠ A location is required to publish — type the venue address{shopHasLocation ? ' or tap "Use shop location"' : ''}.
        </p>
      )}
      <input
        type="text"
        placeholder="City"
        value={event.location || ''}
        onChange={(e) => updateEvent(idx, { location: e.target.value })}
        className={inputClass}
      />
    </div>
  );
}

// Mirrors EditProfile so admin shop edit shows the same per-section
// descriptions in the CATEGORIES tab.
const SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {
  Products: "Frames, parts & accessories you make or sell.",
  SERVICES: "Workshops, repairs, paint & custom builds.",
  "Creative & Media": "Photo, film, illustration & publishing.",
  Community: "Clubs, collectives & grassroots groups.",
  Events: "Races, social rides, festivals & gatherings.",
};

export function AdminCreatorEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useUI();
  const { currentUser, userProfile } = useAuth();
  const { selectableCategories: SELECTABLE_CATEGORIES, subcategories: SUBCATEGORIES, getFlattenedSubcategories } = useCategories();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  // Auto-save (existing shops only — new shops still use the manual Create
  // button since their doc id is derived from the name as you type).
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadedSnapshot, setLoadedSnapshot] = useState<string | null>(null);
  // Events tab: search + which row is expanded.
  const [eventsSearch, setEventsSearch] = useState("");
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);

  // Linked user account for the USER sub-tab. Populated when the shop's id
  // matches a users/{uid} doc — admin can edit firstName, lastName, bio,
  // avatar from here. `null` when there's no linked user (legacy seeded
  // shops with slug ids, or a brand-new shop being created from scratch).
  type LinkedUser = {
    firstName?: string;
    lastName?: string;
    email?: string;
    bio?: string;
    profileImage?: string;
    role?: string;
  };
  const [userData, setUserData] = useState<LinkedUser | null>(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  // Ref to the cover ImageField so the preview modal can trigger its file
  // picker imperatively when the user clicks "Replace".
  const coverFieldRef = useRef<ImageFieldHandle>(null);

  const handleAddressBlur = async () => {
    const address = formData.address?.trim();
    if (!address) return;
    setGeocoding(true);
    setGeocodeMessage(null);
    try {
      const result = await geocodeAddress(address);
      if (!result) {
        setGeocodeMessage("Couldn't locate this address on the map.");
        return;
      }
      // Auto-fill: coords always update; city/country overwrite so they match
      // the new address. The admin can still edit them manually after.
      setFormData(prev => ({
        ...prev,
        coordinates: result.coordinates,
        location: result.city || prev.location,
        country: result.country || prev.country,
      }));
      setGeocodeMessage(`Location found: ${result.formattedAddress}`);
    } catch (err) {
      console.error(err);
      setGeocodeMessage("Geocoding failed. Try again later.");
    } finally {
      setGeocoding(false);
    }
  };
  // Mirrors the structure of the creator-side EditProfile so the admin form
  // edits a shop with the exact same nav: PROFILE (with USER / MY WORK /
  // CATEGORIES sub-tabs) → GALLERY → EVENTS.
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'GALLERY' | 'EVENTS'>('PROFILE');
  const [activeProfileSubTab, setActiveProfileSubTab] = useState<'USER' | 'MY WORK' | 'CATEGORIES'>('MY WORK');

  // No tabs are currently disabled — EVENTS was unblocked elsewhere.
  const DISABLED_TABS = [] as const;
  const [tappedSoonTab, setTappedSoonTab] = useState<string | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);
  const flashSoonTooltip = (tab: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTappedSoonTab(tab);
    tooltipTimerRef.current = setTimeout(() => {
      setTappedSoonTab(null);
      tooltipTimerRef.current = null;
    }, 2500);
  };
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    description: '',
    website: '',
    // Default to Worldwide so remote/no-address shops are categorized correctly.
    location: 'Worldwide',
    country: 'Worldwide',
    address: '',
    categories: [],
    subCategories: [],
    gallery: [],
    // Always start with the bundled defaults — admin can replace before saving.
    coverImage: CREATOR_DEFAULT_COVER,
    profileImage: CREATOR_DEFAULT_AVATAR,
    socials: { instagram: '', facebook: '', twitter: '' },
    events: [],
    isPublished: true,
    views: 0,
  });

  useEffect(() => {
    if (isNew) return;
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'creators', id!));
        let creatorObj: AdminFormData | null = null;
        if (docSnap.exists()) {
          creatorObj = { id: docSnap.id, ...docSnap.data() } as AdminFormData;
          setFormData(creatorObj);
        } else {
          alert('Creator not found');
          navigate('/admin/creators');
          return;
        }
        // Try to load the linked user account. Self-signed-up creators have
        // shop ids equal to their user uid; legacy seeded shops use slugs
        // and won't have a matching doc.
        const userSnap = await getDoc(doc(db, 'users', id!));
        let userObj: LinkedUser | null = null;
        if (userSnap.exists()) {
          userObj = userSnap.data() as LinkedUser;
          setUserData(userObj);
        }
        setUserDataLoaded(true);
        // Snapshot the loaded state so auto-save only fires on real edits.
        setLoadedSnapshot(JSON.stringify({ formData: creatorObj, userData: userObj }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isNew, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, socials: { ...prev.socials, [name]: value } }));
  };

  const toggleCategory = (category: Category) => {
    setFormData(prev => {
      const cats = prev.categories || [];
      if (cats.includes(category)) {
        const subcatsToRemove = getFlattenedSubcategories(category);
        return {
          ...prev,
          categories: cats.filter(c => c !== category),
          subCategories: (prev.subCategories || []).filter(s => !subcatsToRemove.includes(s)),
        };
      }
      return { ...prev, categories: [...cats, category] };
    });
  };

  const toggleSubCategory = (sub: SubCategory) => {
    setFormData(prev => {
      const list = prev.subCategories || [];
      if (list.includes(sub)) {
        const filtersToRemove = getFlattenedSubcategories(sub);
        return { ...prev, subCategories: list.filter(s => s !== sub && !filtersToRemove.includes(s)) };
      }
      return { ...prev, subCategories: [...list, sub] };
    });
  };

  const addGalleryUrl = () => {
    setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), { url: '', description: '' }] }));
  };

  const updateGalleryUrl = (idx: number, url: string) => {
    setFormData(prev => {
      const next = [...(prev.gallery || [])];
      next[idx] = typeof next[idx] === 'string' ? { url, description: '' } : { ...next[idx], url };
      return { ...prev, gallery: next };
    });
  };

  const removeGalleryItem = (idx: number) => {
    setFormData(prev => ({ ...prev, gallery: (prev.gallery || []).filter((_, i) => i !== idx) }));
  };

  const addEvent = () => {
    setFormData(prev => {
      const next = [...(prev.events || []), { title: '', startDate: '', endDate: '', location: '', description: '', category: '', isPublished: false }];
      // Auto-expand the brand-new event so the admin starts filling it in.
      setExpandedEventIdx(next.length - 1);
      return { ...prev, events: next };
    });
  };

  const updateEvent = (idx: number, patch: any) => {
    setFormData(prev => {
      const next = [...(prev.events || [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, events: next };
    });
  };

  const removeEvent = (idx: number) => {
    setFormData(prev => ({ ...prev, events: (prev.events || []).filter((_, i) => i !== idx) }));
  };

  // Same publish requirements as the creator-side EditProfile.
  const adminPublishMissing = (() => {
    const missing: string[] = [];
    if (!formData.profileImage) missing.push('Shop profile picture');
    if (!formData.coverImage) missing.push('Cover image');
    if (!(formData.description || '').trim()) missing.push('Shop description');
    const s = formData.socials || {};
    const hasContact = !!(formData.website || '').trim() || !!(s.instagram || '').trim() || !!(s.facebook || '').trim() || !!(s.twitter || '').trim();
    if (!hasContact) missing.push('At least one contact link');
    return missing;
  })();
  const adminCanPublish = adminPublishMissing.length === 0;

  // Pure write to Firestore. No navigation — used by both the manual Create
  // button (new shops) and the debounced auto-save (existing shops).
  const persist = async () => {
    const docId = isNew
      ? formData.name?.toLowerCase().replace(/\s+/g, '-') || Date.now().toString()
      : id!;
    // No address → categorize as Worldwide and drop coordinates so it won't pin on the map.
    const hasAddress = !!(formData.address || '').trim();
    const location = hasAddress ? (formData.location || 'Worldwide') : 'Worldwide';
    const country = hasAddress ? (formData.country || 'Worldwide') : 'Worldwide';
    const isPublished = formData.isPublished !== false && adminCanPublish;
    const { coordinates, ...rest } = formData;
    const payload: any = {
      ...rest,
      id: docId,
      location,
      country,
      isPublished,
      website: normalizeUrl(formData.website),
      socials: {
        instagram: normalizeUrl(formData.socials?.instagram),
        facebook: normalizeUrl(formData.socials?.facebook),
        twitter: normalizeUrl(formData.socials?.twitter),
      },
    };
    // Activity timestamps for the dashboard. `createdAt`/`createdBy` are
    // preserved (formData carries them via the loaded doc through ...rest) or
    // set now for brand-new shops, attributed to the admin who created it.
    const nowIso = new Date().toISOString();
    payload.updatedAt = nowIso;
    payload.createdAt = (formData as any).createdAt || nowIso;
    if (isNew) {
      const adminName = `${(userProfile as any)?.firstName || ''} ${(userProfile as any)?.lastName || ''}`.trim()
        || (userProfile as any)?.name || (userProfile as any)?.email || 'Admin';
      payload.createdBy = { id: currentUser?.uid || null, name: adminName, viaAdmin: true };
    }
    if (hasAddress && coordinates) payload.coordinates = coordinates;
    await setDoc(doc(db, 'creators', docId), stripUndefined(payload));

    // If a linked user account exists (USER sub-tab was populated), persist
    // the personal info edits too. Email and role are read-only here.
    if (userData) {
      const userPayload: any = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        bio: userData.bio || '',
        profileImage: userData.profileImage || '',
      };
      await setDoc(doc(db, 'users', docId), stripUndefined(userPayload), { merge: true });
    }
    // Sync the snapshot so isDirty resets after a successful write.
    setLoadedSnapshot(JSON.stringify({ formData, userData }));
  };

  // Manual save — only used to create a brand-new shop (its doc id derives from
  // the name, so we can't auto-save mid-typing). Navigates back on success.
  const handleSave = async () => {
    setSaving(true);
    try {
      await persist();
      navigate('/admin/creators');
    } catch (err) {
      console.error(err);
      alert('Error saving creator');
    } finally {
      setSaving(false);
    }
  };

  // Has anything changed since load / last save?
  const isDirty = loadedSnapshot !== null && JSON.stringify({ formData, userData }) !== loadedSnapshot;

  // ── Auto-save (existing shops only) ── persist ~1s after the last edit.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  useEffect(() => {
    if (isNew || loadedSnapshot === null || !isDirty || savingRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      savingRef.current = true;
      setSaveStatus('saving');
      try {
        await persist();
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed', err);
        setSaveStatus('error');
      } finally {
        savingRef.current = false;
      }
    }, 1000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // persist is recreated each render; it reads the latest formData via closure.
  }, [formData, userData, isDirty, isNew, loadedSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush a pending save on unmount (navigating away before the debounce fires).
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (!isNew && isDirtyRef.current && !savingRef.current) {
        persistRef.current().catch((e) => console.error('Flush save failed', e));
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="p-8">Loading...</div>;

  const inputClass = `w-full p-4 border-2 outline-none font-medium ${
    isDarkMode ? 'bg-black border-zinc-700 focus:border-white' : 'bg-gray-50 border-gray-300 focus:border-black'
  }`;
  const labelClass = `text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button
            onClick={() => navigate('/admin/creators')}
            className="p-2 border-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter truncate">
            {isNew ? 'Create Shop' : 'Edit Shop'}
          </h1>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {/* Auto-save status (existing shops). Sits left of Publish so it's
              always visible at the top while editing. */}
          {!isNew && (
            <div className="flex items-center gap-1.5 min-w-0">
              {saveStatus === 'saving' || (isDirty && saveStatus !== 'error') ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Saving…</span>
                </>
              ) : saveStatus === 'error' ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500" title="Auto-save failed — will retry on next edit">Save failed</span>
              ) : saveStatus === 'saved' ? (
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>✓ Saved</span>
              ) : null}
            </div>
          )}
          <button
            type="button"
            disabled={formData.isPublished === false && !adminCanPublish}
            onClick={() => setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))}
            title={
              formData.isPublished !== false
                ? 'Click to unpublish'
                : adminCanPublish
                ? 'Click to publish'
                : `Missing to publish: ${adminPublishMissing.join(', ')}`
            }
            className={`px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.isPublished !== false
                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600'
                : 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600'
            }`}
          >
            {formData.isPublished !== false ? 'Unpublish' : 'Publish'}
          </button>
          {/* New shops still need an explicit Create — the doc id is derived
              from the name, so we can't auto-save mid-typing. */}
          {isNew && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-red-500 text-white font-bold uppercase tracking-widest text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Creating…' : 'Create shop'}
            </button>
          )}
        </div>
      </div>

      <div className={`flex border-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
        {(['PROFILE', 'GALLERY', 'EVENTS'] as const).map((tab, i, all) => {
          const isDisabled = (DISABLED_TABS as readonly string[]).includes(tab);
          const showTooltip = isDisabled && tappedSoonTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (isDisabled) {
                  flashSoonTooltip(tab);
                  return;
                }
                setActiveTab(tab);
              }}
              onMouseEnter={() => {
                if (isDisabled) {
                  if (tooltipTimerRef.current) {
                    clearTimeout(tooltipTimerRef.current);
                    tooltipTimerRef.current = null;
                  }
                  setTappedSoonTab(tab);
                }
              }}
              onMouseLeave={() => {
                if (isDisabled) {
                  if (tooltipTimerRef.current) {
                    clearTimeout(tooltipTimerRef.current);
                    tooltipTimerRef.current = null;
                  }
                  setTappedSoonTab(null);
                }
              }}
              aria-disabled={isDisabled}
              className={`relative flex-1 py-3 px-4 text-xs font-bold uppercase tracking-widest transition-colors ${
                i < all.length - 1 ? `border-r-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}` : ''
              } ${
                activeTab === tab && !isDisabled
                  ? isDarkMode
                    ? 'bg-white text-black'
                    : 'bg-black text-white'
                  : isDarkMode
                  ? `text-gray-400 ${!isDisabled && 'hover:text-white hover:bg-zinc-900'}`
                  : `text-gray-500 ${!isDisabled && 'hover:text-black hover:bg-gray-50'}`
              }`}
            >
              <span className={isDisabled ? 'opacity-50' : ''}>{tab}</span>
              <AnimatePresence>
                {showTooltip && (
                  <motion.span
                    key="soon"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className={`pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest brutalist-border whitespace-nowrap z-30 ${
                      isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                    }`}
                  >
                    Soon
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Sub-tab strip — only visible when on the PROFILE tab. Mirrors the
          USER / MY WORK / CATEGORIES layout from EditProfile. */}
      {activeTab === 'PROFILE' && (
        <div className={`flex border-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
          {(['USER', 'MY WORK', 'CATEGORIES'] as const).map((sub, i, all) => (
            <button
              key={sub}
              type="button"
              onClick={() => setActiveProfileSubTab(sub)}
              className={`flex-1 py-2.5 px-4 text-[11px] md:text-xs font-bold uppercase tracking-widest transition-colors ${
                i < all.length - 1 ? `border-r-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}` : ''
              } ${
                activeProfileSubTab === sub
                  ? isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                  : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-zinc-900' : 'text-gray-500 hover:text-black hover:bg-gray-50'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      <div className={`p-4 md:p-8 border-2 space-y-6 ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
        {activeTab === 'PROFILE' && activeProfileSubTab === 'USER' && (
          <>
            <h2 className="text-xl font-bold uppercase tracking-wider mb-4 border-b-2 pb-2">User account</h2>
            {!userDataLoaded ? (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading user…</p>
            ) : !userData ? (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No linked user account for this shop. Either it's an admin-created shop without a registered owner, or a legacy seeded shop using a slug as id.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ImageField
                    label="Profile Avatar"
                    value={userData.profileImage || ''}
                    onChange={(url) => setUserData({ ...userData, profileImage: url })}
                    folder={`users/${id || 'new'}/avatar`}
                    isDarkMode={isDarkMode}
                    variant="spinner"
                    crop={{ aspect: 1, cropShape: 'round', title: 'Crop avatar', minWidth: 256 }}
                  />
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className={labelClass}>First name</label>
                      <input
                        type="text"
                        value={userData.firstName || ''}
                        onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Last name</label>
                      <input
                        type="text"
                        value={userData.lastName || ''}
                        onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={userData.email || ''}
                      readOnly
                      className={`${inputClass} opacity-70 cursor-not-allowed`}
                    />
                    <p className={`text-[10px] mt-1 font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Email is fixed at signup.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Account type</label>
                    <input
                      type="text"
                      value={userData.role || 'user'}
                      readOnly
                      className={`${inputClass} opacity-70 cursor-not-allowed`}
                    />
                    <p className={`text-[10px] mt-1 font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Manage role from <span className={isDarkMode ? 'text-white' : 'text-black'}>/admin/users</span>.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Bio</label>
                  <textarea
                    rows={3}
                    value={userData.bio || ''}
                    onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                    placeholder="Short personal bio (max 280 chars)."
                    maxLength={280}
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'PROFILE' && activeProfileSubTab === 'MY WORK' && (
          <>
            <h2 className="text-xl font-bold uppercase tracking-wider mb-4 border-b-2 pb-2">Basic information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>Shop/Creator Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Website</label>
                <input type="text" name="website" value={formData.website || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Description / Bio</label>
              <textarea name="description" rows={4} value={formData.description || ''} onChange={handleChange} className={inputClass} />
            </div>

            <h2 className="text-xl font-bold uppercase tracking-wider mb-4 border-b-2 pb-2 mt-8">Location</h2>
            <div className="space-y-2">
              <label className={labelClass}>Full Address</label>
              <div className="relative">
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  onBlur={handleAddressBlur}
                  placeholder="e.g. Via Roma 94, Marostica, Italy"
                  className={`${inputClass} pl-12`}
                />
                <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                {geocoding && (
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Locating...
                  </span>
                )}
              </div>
              {geocodeMessage && (
                <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {geocodeMessage}
                </p>
              )}
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                When you finish typing, we'll find the location on the map and auto-fill city + country.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>City</label>
                <input type="text" name="location" value={formData.location || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Country</label>
                <input type="text" name="country" value={formData.country || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <h2 className="text-xl font-bold uppercase tracking-wider mb-4 border-b-2 pb-2 mt-8">Social links</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>Instagram</label>
                <input type="text" name="instagram" value={formData.socials?.instagram || ''} onChange={handleSocialChange} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Facebook</label>
                <input type="text" name="facebook" value={formData.socials?.facebook || ''} onChange={handleSocialChange} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Twitter / X</label>
                <input type="text" name="twitter" value={formData.socials?.twitter || ''} onChange={handleSocialChange} className={inputClass} />
              </div>
            </div>

            <h2 className="text-xl font-bold uppercase tracking-wider mb-4 border-b-2 pb-2 mt-8">Media</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageField
                label="Profile Avatar"
                value={formData.profileImage || ''}
                onChange={(url) => setFormData(prev => ({ ...prev, profileImage: url }))}
                folder={`creators/${id || 'new'}/avatar`}
                isDarkMode={isDarkMode}
                variant="spinner"
                crop={{ aspect: 1, cropShape: 'round', title: 'Crop logo', minWidth: 256 }}
              />
              <ImageField
                ref={coverFieldRef}
                label="Cover Image"
                value={formData.coverImage || ''}
                onChange={(url) => setFormData(prev => ({ ...prev, coverImage: url }))}
                folder={`creators/${id || 'new'}/cover`}
                isDarkMode={isDarkMode}
                crop={{ aspect: 16 / 9, safeZoneWidthPct: 75, title: 'Crop cover', safeZoneLabel: 'Visible on cards', minWidth: 800 }}
              />
            </div>
          </>
        )}

        {activeTab === 'PROFILE' && activeProfileSubTab === 'CATEGORIES' && (
          <div className="space-y-6">
            <div>
              {/* Main categories — same structure as EditProfile so admin and
                  creator-side shop edits stay visually unified. */}
              <div className="mb-6">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>
                  Main categories
                </h3>
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Select the categories in which you want this shop to be featured.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mb-8">
                {SELECTABLE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                      formData.categories?.includes(c)
                        ? isDarkMode
                          ? "bg-white text-black border-white"
                          : "bg-black text-white border-black"
                        : isDarkMode
                        ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white"
                        : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* One subcategory section per main category, always visible.
                  Chips are disabled until the main category is toggled on. */}
              <div className="space-y-6">
                {SELECTABLE_CATEGORIES.map((category) => {
                  const group = SUBCATEGORIES[category];
                  if (!group) return null;
                  const isSelected = formData.categories?.includes(category) ?? false;
                  const description = SUBCATEGORY_DESCRIPTIONS[category as string] || "";
                  const categoryChipClass = `px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                    isSelected
                      ? isDarkMode
                        ? "bg-white text-black border-white hover:bg-gray-200"
                        : "bg-black text-white border-black hover:bg-gray-800"
                      : isDarkMode
                      ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white"
                      : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                  }`;
                  const chipClass = (selected: boolean) =>
                    `mr-3 mb-3 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? isDarkMode
                          ? "bg-white text-black border-white"
                          : "bg-black text-white border-black"
                        : isDarkMode
                        ? "bg-black text-gray-400 border-white/20 enabled:hover:border-white enabled:hover:text-white"
                        : "bg-white text-gray-500 border-black/20 enabled:hover:border-black enabled:hover:text-black"
                    }`;
                  return (
                    <div key={category}>
                      <h4 className={`flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>
                        <span>Subcategories of</span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          title={isSelected ? `Click to remove ${category}` : `Click to add ${category}`}
                          className={categoryChipClass}
                        >
                          {category}
                        </button>
                      </h4>
                      {description && (
                        <p className={`mt-2 mb-3 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                          {description}
                        </p>
                      )}
                      {group.map((item, idx) => {
                        if (typeof item === "string") {
                          return (
                            <button
                              key={item}
                              type="button"
                              disabled={!isSelected}
                              onClick={() => toggleSubCategory(item as SubCategory)}
                              className={chipClass(formData.subCategories?.includes(item as SubCategory) ?? false)}
                            >
                              {item}
                            </button>
                          );
                        }
                        return (
                          <div key={idx} className="mb-4">
                            {/* "Category" group title is redundant with the
                                "Subcategories of {category}" heading above —
                                hide it. Other group names (Build, Material…)
                                are kept since they group meaningfully. */}
                            {item.groupName !== "Category" && (
                              <h5 className={`text-[10px] font-light uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                {item.groupName}
                              </h5>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {item.options.map((sub) => (
                                <button
                                  key={sub}
                                  type="button"
                                  disabled={!isSelected}
                                  onClick={() => toggleSubCategory(sub as SubCategory)}
                                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                    formData.subCategories?.includes(sub as SubCategory)
                                      ? isDarkMode
                                        ? "bg-white text-black border-white"
                                        : "bg-black text-white border-black"
                                      : isDarkMode
                                      ? "bg-black text-gray-400 border-white/20 enabled:hover:border-white enabled:hover:text-white"
                                      : "bg-white text-gray-500 border-black/20 enabled:hover:border-black enabled:hover:text-black"
                                  }`}
                                >
                                  {sub}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Inline filters for selected subcategories of THIS main. */}
                      {(() => {
                        const directSubs = getFlattenedSubcategories(category);
                        const sections = directSubs
                          .filter((s) => (formData.subCategories || []).includes(s))
                          .map((sub) => {
                            const subGroups = SUBCATEGORIES[sub as string] || [];
                            // Include ALL groups so the shop form surfaces what
                            // the explorer's SubcategoryFilter shows. The
                            // "Category" header is hidden below for cleanliness.
                            const filterGroups = subGroups.filter(
                              (g) => typeof g !== "string",
                            ) as { groupName: string; options: SubCategory[] }[];
                            return { sub, filterGroups };
                          })
                          .filter((s) => s.filterGroups.length > 0);
                        if (sections.length === 0) return null;
                        return (
                          <div className={`mt-6 pt-6 border-t-2 space-y-5 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
                            {sections.map(({ sub, filterGroups }) => (
                              <div key={sub as string}>
                                <h5 className={`flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-white" : "text-black"}`}>
                                  <span>Filters for</span>
                                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border-2 ${
                                    isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
                                  }`}>
                                    {sub}
                                  </span>
                                </h5>
                                {filterGroups.map((g) => (
                                  <div key={g.groupName} className="mb-3">
                                    {g.groupName !== "Category" && (
                                      <h6 className={`text-[10px] font-light uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                        {g.groupName}
                                      </h6>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      {g.options.map((opt) => {
                                        const selected = formData.subCategories?.includes(opt as SubCategory) ?? false;
                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => toggleSubCategory(opt as SubCategory)}
                                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                                              selected
                                                ? isDarkMode
                                                  ? "bg-white text-black border-white"
                                                  : "bg-black text-white border-black"
                                                : isDarkMode
                                                ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white"
                                                : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'GALLERY' && (
          <>
            <h2 className="text-xl font-bold uppercase tracking-wider mb-4 border-b-2 pb-2">Gallery</h2>
            <GalleryManager
              items={formData.gallery || []}
              onChange={(items) => setFormData(prev => ({ ...prev, gallery: items }))}
              folder={`creators/${id || 'new'}/gallery`}
              isDarkMode={isDarkMode}
            />
          </>
        )}

        {activeTab === 'EVENTS' && (() => {
          const events = formData.events || [];
          const filtered = events
            .map((e: any, idx: number) => ({ e, idx }))
            .filter(({ e }: { e: any }) => {
              const q = eventsSearch.trim().toLowerCase();
              if (!q) return true;
              const hay = [e.title, e.category, e.location, e.description].filter(Boolean).join(' ').toLowerCase();
              return hay.includes(q);
            });
          const formatDateRange = (e: any) => {
            if (!e.startDate && !e.endDate) return 'No date';
            if (e.startDate && e.endDate && e.startDate !== e.endDate) return `${e.startDate} → ${e.endDate}`;
            return e.startDate || e.endDate;
          };
          return (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-2 border-b-2">
                <h2 className="text-xl font-bold uppercase tracking-wider">
                  Events <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>({events.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={addEvent}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                    isDarkMode ? 'bg-white text-black border-white hover:bg-zinc-200' : 'bg-black text-white border-black hover:bg-zinc-800'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Create event
                </button>
              </div>

              {events.length > 0 && (
                <div className="relative mb-4">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={eventsSearch}
                    onChange={(ev) => setEventsSearch(ev.target.value)}
                    placeholder="Search by title, category, location..."
                    className={`w-full pl-9 pr-9 py-2 text-sm font-medium border-2 outline-none ${
                      isDarkMode ? 'bg-black border-zinc-700 focus:border-white text-white placeholder-gray-600' : 'bg-white border-gray-300 focus:border-black text-black placeholder-gray-400'
                    }`}
                  />
                  {eventsSearch && (
                    <button
                      type="button"
                      onClick={() => setEventsSearch('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {events.length === 0 ? (
                <div className={`p-8 text-center text-sm font-bold uppercase tracking-widest border-2 border-dashed ${
                  isDarkMode ? 'border-zinc-700 text-gray-400' : 'border-gray-300 text-gray-500'
                }`}>
                  No events yet — click "Create event" to add one.
                </div>
              ) : filtered.length === 0 ? (
                <div className={`p-6 text-center text-xs font-bold uppercase tracking-widest border-2 ${
                  isDarkMode ? 'border-zinc-700 text-gray-400' : 'border-gray-300 text-gray-500'
                }`}>
                  No events match your search.
                </div>
              ) : (
                <div className={`border-2 ${isDarkMode ? 'border-zinc-700' : 'border-gray-300'}`}>
                  {filtered.map(({ e: event, idx }: { e: any; idx: number }) => {
                    const expanded = expandedEventIdx === idx;
                    // An event needs resolvable coordinates to publish: its own
                    // geocoded ones, or the shop's as a fallback.
                    const eventCanPin =
                      (Array.isArray(event.coordinates) && event.coordinates.length === 2) ||
                      (Array.isArray(formData.coordinates) && formData.coordinates.length === 2);
                    return (
                      <div key={idx} className={`border-b-2 last:border-b-0 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                        <div
                          onClick={() => setExpandedEventIdx(expanded ? null : idx)}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                          }`}
                        >
                          <div className={`w-10 h-10 shrink-0 flex items-center justify-center border-2 overflow-hidden ${
                            isDarkMode ? 'border-zinc-700' : 'border-gray-300'
                          }`}>
                            {event.coverImage ? (
                              <img src={event.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <CalIcon className="w-4 h-4 opacity-50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{event.title || 'Untitled event'}</div>
                            <div className={`text-[11px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDateRange(event)}{event.location ? ` · ${event.location}` : ''}{event.category ? ` · ${event.category}` : ''}
                            </div>
                          </div>
                          <span className={`hidden sm:inline-flex shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-2 ${
                            event.isPublished
                              ? isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200'
                              : isDarkMode ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          }`}>
                            {event.isPublished ? 'Published' : 'Draft'}
                          </span>
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); if (window.confirm('Delete this event? This cannot be undone.')) { removeEvent(idx); if (expandedEventIdx === idx) setExpandedEventIdx(null); } }}
                            aria-label="Delete event"
                            className={`p-1.5 border-2 transition-colors ${
                              isDarkMode ? 'border-zinc-700 text-red-400 hover:border-red-500 hover:bg-red-500/10' : 'border-gray-300 text-red-500 hover:border-red-500 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expanded ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
                        </div>
                        {expanded && (
                          <div className={`p-4 border-t-2 space-y-4 ${isDarkMode ? 'border-zinc-800 bg-white/[0.02]' : 'border-gray-200 bg-black/[0.02]'}`}>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                // Always allow unpublishing. Only allow publishing
                                // once the event has a resolvable location.
                                disabled={!event.isPublished && !eventCanPin}
                                title={
                                  event.isPublished
                                    ? 'Click to unpublish'
                                    : eventCanPin
                                    ? 'Click to publish this event'
                                    : 'Add an event location first — a published event needs a place to pin on the map.'
                                }
                                onClick={() => {
                                  // Source is set explicitly via the selector below,
                                  // so this just toggles isPublished. Default the
                                  // source to "shop" the first time a legacy event
                                  // (no publishedFrom field yet) is being published.
                                  const next: any = { isPublished: !event.isPublished };
                                  if (next.isPublished && !event.publishedFrom) {
                                    next.publishedFrom = 'shop';
                                  }
                                  updateEvent(idx, next);
                                }}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  event.isPublished ? 'bg-red-500 text-white border-red-500' : 'bg-green-500 text-white border-green-500'
                                }`}
                              >
                                {event.isPublished ? 'Unpublish' : 'Publish'}
                              </button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                              <input
                                type="text"
                                placeholder="Event Title"
                                value={event.title || ''}
                                onChange={(e) => updateEvent(idx, { title: e.target.value })}
                                className={`flex-1 ${inputClass}`}
                              />
                              <select
                                value={event.category || ''}
                                onChange={(e) => updateEvent(idx, { category: e.target.value })}
                                className={`w-full md:w-1/3 ${inputClass}`}
                              >
                                <option value="" disabled>Select Category</option>
                                {EVENT_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            {(() => {
                              const isMultiDay = !!(event.endDate && event.startDate && event.endDate !== event.startDate);
                              return (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {isMultiDay ? 'Start date' : 'Event date'}
                                      </label>
                                      <DatePicker
                                        value={event.startDate || ''}
                                        isDarkMode={isDarkMode}
                                        onChange={(val) => {
                                          if (isMultiDay) {
                                            updateEvent(idx, { startDate: val });
                                          } else {
                                            updateEvent(idx, { startDate: val, endDate: val });
                                          }
                                        }}
                                      />
                                    </div>
                                    {isMultiDay && (
                                      <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          End date
                                        </label>
                                        <DatePicker
                                          value={event.endDate || ''}
                                          min={event.startDate || undefined}
                                          isDarkMode={isDarkMode}
                                          onChange={(val) => updateEvent(idx, { endDate: val })}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <label className={`inline-flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <input
                                      type="checkbox"
                                      checked={isMultiDay}
                                      onChange={(e) => {
                                        if (!e.target.checked) {
                                          // Collapse: align endDate with startDate
                                          updateEvent(idx, { endDate: event.startDate || '' });
                                        } else {
                                          // Enable: seed endDate = startDate + 1 day
                                          if (event.startDate) {
                                            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(event.startDate);
                                            if (m) {
                                              const year = Number(m[1]);
                                              const month = Number(m[2]) - 1;
                                              const day = Number(m[3]);
                                              const d = new Date(year, month, day + 1);
                                              const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                              updateEvent(idx, { endDate: next });
                                            } else {
                                              const d = new Date(event.startDate);
                                              d.setDate(d.getDate() + 1);
                                              const next = d.toISOString().split('T')[0];
                                              updateEvent(idx, { endDate: next });
                                            }
                                          }
                                        }
                                      }}
                                      className="w-4 h-4 cursor-pointer accent-current"
                                    />
                                    Multi-day event
                                  </label>
                                </div>
                              );
                            })()}

                            {/* Optional time range. End time appears only once
                                a start time is set, same UX as creator-side. */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Start time (optional)
                                </label>
                                <input
                                  type="time"
                                  value={event.startTime || ''}
                                  onChange={(e) => updateEvent(idx, { startTime: e.target.value })}
                                  className={inputClass}
                                />
                              </div>
                              {event.startTime && (
                                <div>
                                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    End time (optional)
                                  </label>
                                  <input
                                    type="time"
                                    value={event.endTime || ''}
                                    onChange={(e) => updateEvent(idx, { endTime: e.target.value })}
                                    className={inputClass}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Recurrence — see EditProfile for behaviour. */}
                            <div>
                              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Repeats
                              </label>
                              <select
                                value={event.recurrence || 'none'}
                                onChange={(e) => updateEvent(idx, { recurrence: e.target.value === 'none' ? '' : e.target.value })}
                                className={inputClass}
                              >
                                <option value="none">Doesn't repeat</option>
                                <option value="weekly">Weekly (every same weekday)</option>
                                <option value="monthly">Monthly (every same date)</option>
                              </select>
                            </div>

                            {/* Publish source — same selector as the
                                creator-side EditProfile. Determines which
                                profile (shop vs the owner's user) the event
                                appears under in the calendar. */}
                            {(() => {
                              const currentSource = event.publishedFrom || 'shop';
                              const shopWillBePublished = formData.isPublished !== false && adminCanPublish;
                              const sources: { value: 'shop' | 'user'; label: string }[] = [
                                { value: 'shop', label: 'Shop profile' },
                                { value: 'user', label: 'User profile' },
                              ];
                              return (
                                <div className="space-y-2">
                                  <label className={`block text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Publish from
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {sources.map((s) => {
                                      const active = currentSource === s.value;
                                      return (
                                        <button
                                          key={s.value}
                                          type="button"
                                          onClick={() => updateEvent(idx, { publishedFrom: s.value })}
                                          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                                            active
                                              ? isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'
                                              : isDarkMode ? 'bg-black text-gray-400 border-white/20 hover:border-white hover:text-white' : 'bg-white text-gray-500 border-black/20 hover:border-black hover:text-black'
                                          }`}
                                        >
                                          {s.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {currentSource === 'shop' && !shopWillBePublished && (
                                    <p className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                      ⚠ This shop is in draft. The event won't appear in the calendar until the shop is published. Switch to "User profile" to publish without the shop.
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            <AdminEventLocation
                              event={event}
                              idx={idx}
                              updateEvent={updateEvent}
                              formData={formData}
                              isDarkMode={isDarkMode}
                              inputClass={inputClass}
                            />
                            <textarea rows={3} placeholder="Description" value={event.description || ''} onChange={(e) => updateEvent(idx, { description: e.target.value })} className={inputClass} />
                            <ImageField
                              label="Event Cover Image"
                              value={event.coverImage || ''}
                              onChange={(url) => updateEvent(idx, { coverImage: url })}
                              folder={`creators/${id || 'new'}/events/${idx}`}
                              isDarkMode={isDarkMode}
                              crop={{ aspect: 16 / 9, safeZoneWidthPct: 75, title: 'Crop cover', safeZoneLabel: 'Visible on cards', minWidth: 800 }}
                            />
                            <div>
                              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Event Gallery
                              </label>
                              <GalleryManager
                                items={event.gallery || []}
                                onChange={(items) => updateEvent(idx, { gallery: items })}
                                folder={`creators/${id || 'new'}/events/${idx}/gallery`}
                                isDarkMode={isDarkMode}
                                maxItems={5}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
