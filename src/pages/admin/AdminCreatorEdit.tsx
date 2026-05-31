import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import { Creator, Category, SubCategory } from '../../types';
import { Save, ArrowLeft, Plus, Trash2, Upload, MapPin, Loader2, ChevronDown, ChevronUp, Search, X, Calendar as CalIcon } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { uploadImage, stripUndefined, normalizeUrl } from '../../lib/upload';
import { CREATOR_DEFAULT_AVATAR, CREATOR_DEFAULT_COVER } from '../../lib/defaultAvatars';
import { CoverPreviewModal } from '../../components/modals/CoverPreviewModal';
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
  { label, value, onChange, folder, isDarkMode, variant = 'progress', onAfterUpload, onImageClick },
  ref,
) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot of the URL when the manual text input got focus. Used to detect
  // whether the user actually pasted/edited a NEW URL (vs. just clicking in
  // and out without changes), so we don't spam onAfterUpload.
  const urlOnFocusRef = useRef<string>('');

  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setUploading(true);
    if (variant === 'progress') setProgress(0);
    try {
      const url = await uploadImage(
        files[0],
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
        <div className="relative">
          <img
            src={value}
            alt=""
            className={`w-full h-32 object-cover border-2 border-current/20 ${onImageClick ? 'cursor-pointer' : ''}`}
            onClick={onImageClick}
            referrerPolicy="no-referrer"
          />
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

interface GalleryFieldProps {
  items: any[];
  onChange: (items: any[]) => void;
  folder: string;
  isDarkMode: boolean;
}

function GalleryField({ items, onChange, folder, isDarkMode }: GalleryFieldProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    const perFile = files.map(() => 0);
    setProgress(0);
    try {
      const uploaded = await Promise.all(
        files.map((f, i) =>
          uploadImage(f, folder, (pct) => {
            perFile[i] = pct;
            setProgress(perFile.reduce((a, b) => a + b, 0) / perFile.length);
          }),
        ),
      );
      const newItems = uploaded.map((url) => ({ url, description: '' }));
      onChange([...items, ...newItems]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Upload failed');
    } finally {
      setProgress(null);
    }
  };
  const uploading = progress !== null;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
  } as any);

  const inputClass = `w-full p-4 border-2 outline-none font-medium ${
    isDarkMode ? 'bg-black border-zinc-700 focus:border-white' : 'bg-gray-50 border-gray-300 focus:border-black'
  }`;

  const updateUrl = (idx: number, url: string) => {
    const next = [...items];
    next[idx] = typeof next[idx] === 'string' ? { url, description: '' } : { ...next[idx], url };
    onChange(next);
  };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const addBlank = () => onChange([...items, { url: '', description: '' }]);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const url = typeof item === 'string' ? item : item?.url || '';
        return (
          <div key={idx} className="flex items-start gap-3">
            {url && <img src={url} alt="" className="w-16 h-16 object-cover border-2 border-current/20 shrink-0" referrerPolicy="no-referrer" />}
            <input
              type="text"
              value={url}
              onChange={(e) => updateUrl(idx, e.target.value)}
              placeholder="https://..."
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className={`p-3 border-2 shrink-0 ${isDarkMode ? 'border-zinc-700 text-red-400 hover:border-red-500' : 'border-gray-300 text-red-500 hover:border-red-500'}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <div
        {...getRootProps()}
        className={`relative w-full p-6 border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${
          isDragActive
            ? isDarkMode ? 'border-white bg-white/10 text-white' : 'border-black bg-black/10 text-black'
            : isDarkMode ? 'border-zinc-700 text-gray-400 hover:border-white hover:text-white' : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {uploading
            ? `Uploading ${Math.round(progress!)}%`
            : 'Drag & drop images, or click to upload'}
        </div>
        {uploading && (
          <div className="w-full max-w-[260px] h-1.5 bg-current/20 overflow-hidden">
            <div
              className={`h-full ${isDarkMode ? 'bg-white' : 'bg-black'} transition-[width] duration-150 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={addBlank}
        className={`w-full py-2 border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest ${
          isDarkMode ? 'border-zinc-700 text-gray-400 hover:border-white hover:text-white' : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
        }`}
      >
        <Plus className="w-4 h-4" /> Add image URL manually
      </button>
      {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
    </div>
  );
}

type AdminFormData = Partial<Creator> & {
  isPublished?: boolean;
  events?: any[];
};

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
  const { selectableCategories: SELECTABLE_CATEGORIES, subcategories: SUBCATEGORIES, getFlattenedSubcategories } = useCategories();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  // Events tab: search + which row is expanded.
  const [eventsSearch, setEventsSearch] = useState("");
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);

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
        if (docSnap.exists()) {
          setFormData({ id: docSnap.id, ...docSnap.data() } as AdminFormData);
        } else {
          alert('Creator not found');
          navigate('/admin/creators');
          return;
        }
        // Try to load the linked user account. Self-signed-up creators have
        // shop ids equal to their user uid; legacy seeded shops use slugs
        // and won't have a matching doc.
        const userSnap = await getDoc(doc(db, 'users', id!));
        if (userSnap.exists()) {
          setUserData(userSnap.data() as LinkedUser);
        }
        setUserDataLoaded(true);
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

  const handleSave = async () => {
    setSaving(true);
    try {
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

      navigate('/admin/creators');
    } catch (err) {
      console.error(err);
      alert('Error saving creator');
    } finally {
      setSaving(false);
    }
  };

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
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-red-500 text-white font-bold uppercase tracking-widest text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
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
              />
              <ImageField
                ref={coverFieldRef}
                label="Cover Image"
                value={formData.coverImage || ''}
                onChange={(url) => setFormData(prev => ({ ...prev, coverImage: url }))}
                folder={`creators/${id || 'new'}/cover`}
                isDarkMode={isDarkMode}
                onAfterUpload={() => setCoverPreviewOpen(true)}
                onImageClick={() => setCoverPreviewOpen(true)}
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
            <GalleryField
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
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-2 ${
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
                            <input type="text" placeholder="City" value={event.location || ''} onChange={(e) => updateEvent(idx, { location: e.target.value })} className={inputClass} />
                            <textarea rows={3} placeholder="Description" value={event.description || ''} onChange={(e) => updateEvent(idx, { description: e.target.value })} className={inputClass} />
                            <ImageField
                              label="Event Cover Image"
                              value={event.coverImage || ''}
                              onChange={(url) => updateEvent(idx, { coverImage: url })}
                              folder={`creators/${id || 'new'}/events/${idx}`}
                              isDarkMode={isDarkMode}
                            />
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

      <CoverPreviewModal
        open={coverPreviewOpen}
        imageUrl={formData.coverImage || null}
        isDarkMode={isDarkMode}
        onClose={() => setCoverPreviewOpen(false)}
        onReplace={() => coverFieldRef.current?.openPicker()}
        onDelete={() => setFormData(prev => ({ ...prev, coverImage: CREATOR_DEFAULT_COVER }))}
        isDefault={formData.coverImage === CREATOR_DEFAULT_COVER}
      />
    </div>
  );
}
