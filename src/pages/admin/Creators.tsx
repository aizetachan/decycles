import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import { Store, Plus, Edit, Trash2, Search, X, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Creator } from '../../types';

type ViewMode = "grid" | "list";

export function Creators() {
  const { isDarkMode } = useUI();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'creators'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Creator));
      setCreators(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this creator shop?")) return;
    try {
      await deleteDoc(doc(db, 'creators', id));
      setCreators(creators.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Error deleting creator');
    }
  };

  // Filter on name, location, country and categories. Case-insensitive.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter((c) => {
      const haystack = [
        c.name,
        c.location,
        c.country,
        ...(c.categories || []).map(String),
        ...(c.subCategories || []).map(String),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [creators, search]);

  const statusBadge = (creator: Creator) => {
    const draft = (creator as any).isPublished === false;
    return (
      <div className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-2 ${
        draft
          ? (isDarkMode ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-yellow-50 text-yellow-600 border-yellow-200")
          : (isDarkMode ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200")
      }`}>
        {draft ? "Draft" : "Published"}
      </div>
    );
  };

  const inputClass = `w-full pl-9 pr-9 py-2 text-sm font-medium border-2 outline-none ${
    isDarkMode ? "bg-black border-zinc-700 focus:border-white text-white placeholder-gray-600" : "bg-white border-gray-300 focus:border-black text-black placeholder-gray-400"
  }`;
  const toggleBtnBase = `p-2 transition-colors`;
  const toggleBtnActive = isDarkMode ? "bg-white text-black" : "bg-black text-white";
  const toggleBtnIdle = isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black";

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Creator Shops</h1>
          <p className={`mt-2 font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Manage platform creator stores and profiles.</p>
        </div>
        <Link
          to="/admin/creators/new"
          className="self-start md:self-auto flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-red-500 text-white font-black uppercase tracking-widest text-sm hover:bg-red-600 transition-colors brutalist-shadow"
        >
          <Plus className="w-5 h-5" />
          Create Shop
        </Link>
      </div>

      {/* Search + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, location, country, categories..."
            className={inputClass}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black"}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className={`inline-flex items-stretch border-2 self-start sm:self-auto shrink-0 ${isDarkMode ? "border-zinc-700" : "border-gray-300"}`}>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`${toggleBtnBase} ${viewMode === "list" ? toggleBtnActive : toggleBtnIdle}`}
            title="List view"
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`${toggleBtnBase} ${viewMode === "grid" ? toggleBtnActive : toggleBtnIdle}`}
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
        {loading ? "Loading..." : `${filtered.length} shop${filtered.length === 1 ? "" : "s"}${search ? " (filtered)" : ""}`}
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 ? (
        <div className={`p-8 text-center text-sm border-2 ${isDarkMode ? "border-zinc-800 bg-zinc-900 text-gray-400" : "border-gray-200 bg-white text-gray-500"}`}>
          {search ? "No shops match your search." : "No shops found. Create one to get started."}
        </div>
      ) : viewMode === "list" ? (
        // List view — compact rows. One line per shop on mobile, more breathing
        // room on desktop. Click row → edit page.
        <div className={`border-2 ${isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-gray-200 bg-white"} overflow-hidden`}>
          {filtered.map((creator) => (
            <div
              key={creator.id}
              className={`flex items-center gap-3 p-3 border-b-2 last:border-0 ${isDarkMode ? "border-zinc-800 hover:bg-zinc-800/50" : "border-gray-200 hover:bg-gray-50"} transition-colors`}
            >
              <Link
                to={`/admin/creators/edit/${creator.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {creator.coverImage ? (
                  <img src={creator.coverImage} alt="" className="w-10 h-10 md:w-12 md:h-12 object-cover border-2 border-current/20 shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate text-sm md:text-base">{creator.name}</div>
                  <div className={`text-[11px] md:text-xs truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {[creator.location, creator.country].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
                <div className="hidden sm:block shrink-0">{statusBadge(creator)}</div>
              </Link>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <Link
                  to={`/admin/creators/edit/${creator.id}`}
                  className={`p-1.5 md:p-2 border-2 transition-colors ${
                    isDarkMode ? "border-zinc-700 hover:border-white hover:bg-zinc-800" : "border-gray-300 hover:border-black hover:bg-gray-50"
                  }`}
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(creator.id)}
                  className={`p-1.5 md:p-2 border-2 transition-colors ${
                    isDarkMode ? "border-zinc-700 text-red-400 hover:border-red-500 hover:bg-red-500/10" : "border-gray-300 text-red-500 hover:border-red-500 hover:bg-red-50"
                  }`}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Grid view — cards with cover image. 2 cols on mobile, more on desktop.
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((creator) => (
            <div
              key={creator.id}
              className={`flex flex-col border-2 overflow-hidden ${isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-gray-200 bg-white"}`}
            >
              <Link
                to={`/admin/creators/edit/${creator.id}`}
                className="block aspect-[4/3] relative bg-gray-200 overflow-hidden"
              >
                {creator.coverImage ? (
                  <img src={creator.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <div className="absolute top-2 left-2">{statusBadge(creator)}</div>
              </Link>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="min-w-0">
                  <div className="font-bold truncate text-sm">{creator.name}</div>
                  <div className={`text-[10px] truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {[creator.location, creator.country].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-auto">
                  <Link
                    to={`/admin/creators/edit/${creator.id}`}
                    className={`p-2 border-2 transition-colors ${
                      isDarkMode ? "border-zinc-700 hover:border-white hover:bg-zinc-800" : "border-gray-300 hover:border-black hover:bg-gray-50"
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(creator.id)}
                    className={`p-2 border-2 transition-colors ${
                      isDarkMode ? "border-zinc-700 text-red-400 hover:border-red-500 hover:bg-red-500/10" : "border-gray-300 text-red-500 hover:border-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
