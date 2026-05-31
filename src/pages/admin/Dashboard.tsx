import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import {
  Users as UsersIcon,
  Store,
  Calendar as CalendarIcon,
  ChevronRight,
  Tag,
  SlidersHorizontal,
  ShieldAlert,
  Shield,
  User as UserIcon,
  Ban,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Heart,
  Eye,
  Loader2,
} from 'lucide-react';
import { useCategories } from '../../contexts/CategoriesContext';
import { FilterGroup } from '../../constants/categories';

// ── Date helpers ─────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;

function toDate(input: any): Date | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input?.toDate === 'function') return input.toDate(); // Firestore Timestamp
  if (input instanceof Date) return input;
  return null;
}

function timeAgo(input: any): string | null {
  const d = toDate(input);
  if (!d) return null;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Format a "YYYY-MM-DD" event date as e.g. "12 May".
function formatDay(iso: string | undefined): string | null {
  if (!iso) return null;
  const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!mm) return iso;
  return `${Number(mm[3])} ${SHORT_MONTHS[Number(mm[2]) - 1] || ''}`.trim();
}

function fullName(u: any): string {
  return u?.name || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Unknown';
}

// Who a shop belongs to / was created by: explicit createdBy (set going
// forward), else the owner's name, else the shop name.
function shopOwner(c: any): string {
  return c?.createdBy?.name || c?.creatorName || c?.name || 'Unknown';
}

const todayKey = () => {
  // Local YYYY-MM-DD — events store startDate as a date string.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function Dashboard() {
  const { isDarkMode } = useUI();
  const { selectableCategories, subcategories } = useCategories();
  const [users, setUsers] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  const filtersCount = Object.entries(subcategories).reduce((sum, [parent, groups]) => {
    const isMain = selectableCategories.includes(parent as any);
    const filterGroups = groups.filter((g) => {
      if (typeof g === 'string') return false;
      const fg = g as FilterGroup;
      if (isMain && fg.groupName === 'Category') return false;
      return true;
    });
    return sum + filterGroups.length;
  }, 0);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [usersSnap, creatorsSnap, rsvpsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'creators')),
        getDocs(collection(db, 'rsvps')),
      ]);
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCreators(creatorsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRsvps(rsvpsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // ── Derived metrics ────────────────────────────────────────────────────────
  const m = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * DAY;
    const monthAgo = now - 30 * DAY;

    // USERS
    const roleCount = { admin: 0, creator: 0, user: 0 };
    let blocked = 0;
    let newUsersWeek = 0;
    let newUsersMonth = 0;
    users.forEach((u) => {
      const role = u.role === 'admin' ? 'admin' : u.role === 'creator' ? 'creator' : 'user';
      roleCount[role] += 1;
      if (u.blocked) blocked += 1;
      const c = toDate(u.createdAt);
      if (c) {
        if (c.getTime() >= weekAgo) newUsersWeek += 1;
        if (c.getTime() >= monthAgo) newUsersMonth += 1;
      }
    });
    const recentUsers = [...users]
      .filter((u) => toDate(u.createdAt))
      .sort((a, b) => (toDate(b.createdAt)!.getTime() - toDate(a.createdAt)!.getTime()))
      .slice(0, 4);

    // CREATOR SHOPS
    const publishedShops = creators.filter((c) => c.isPublished === true).length;
    const draftShops = creators.length - publishedShops;
    const shopsWithEvents = creators.filter((c) => Array.isArray(c.events) && c.events.length > 0).length;
    let newShopsWeek = 0;
    creators.forEach((c) => {
      const cr = toDate(c.createdAt);
      if (cr && cr.getTime() >= weekAgo) newShopsWeek += 1;
    });
    const lastCreatedShop = [...creators]
      .filter((c) => toDate(c.createdAt))
      .sort((a, b) => toDate(b.createdAt)!.getTime() - toDate(a.createdAt)!.getTime())[0] || null;
    const lastEditedShop = [...creators]
      .filter((c) => toDate(c.updatedAt))
      .sort((a, b) => toDate(b.updatedAt)!.getTime() - toDate(a.updatedAt)!.getTime())[0] || null;
    const shopsMissingTimestamps = creators.filter((c) => !c.createdAt && !c.updatedAt).length;
    const recentShops = [...creators]
      .filter((c) => toDate(c.createdAt))
      .sort((a, b) => toDate(b.createdAt)!.getTime() - toDate(a.createdAt)!.getTime())
      .slice(0, 3);
    // Creators (by role) who haven't published a shop yet — a follow-up list
    // for the team to help onboard.
    const publishedShopIds = new Set(creators.filter((c) => c.isPublished === true).map((c) => c.id));
    const creatorsPendingShop = users.filter((u) => u.role === 'creator' && !publishedShopIds.has(u.id)).length;

    // EVENTS (aggregated across all creator docs)
    const today = todayKey();
    let totalEvents = 0;
    let activeEvents = 0;
    let draftEvents = 0;
    let upcomingEvents = 0;
    let nextUpcoming: { title: string; start: string; creator: string } | null = null;
    creators.forEach((c) => {
      (Array.isArray(c.events) ? c.events : []).forEach((e: any) => {
        if (!e) return;
        totalEvents += 1;
        if (e.isPublished) {
          activeEvents += 1;
          const start = e.startDate || e.date;
          if (start && String(start) >= today) {
            upcomingEvents += 1;
            // Track the soonest upcoming event.
            if (!nextUpcoming || String(start) < nextUpcoming.start) {
              nextUpcoming = { title: e.title || 'Untitled event', start: String(start), creator: c.name || shopOwner(c) };
            }
          }
        } else {
          draftEvents += 1;
        }
      });
    });

    // RSVPs
    let going = 0;
    let interested = 0;
    let rsvpsWeek = 0;
    const perEvent: Record<string, number> = {};
    rsvps.forEach((r) => {
      if (r.status === 'going') going += 1;
      else if (r.status === 'interested') interested += 1;
      const key = `${r.creatorId}_${r.eventIdx}`;
      perEvent[key] = (perEvent[key] || 0) + 1;
      const u = toDate(r.updatedAt);
      if (u && u.getTime() >= weekAgo) rsvpsWeek += 1;
    });
    const totalRsvps = going + interested;
    const avgRsvps = activeEvents > 0 ? totalRsvps / activeEvents : 0;
    // Most popular published event by RSVP count.
    let topKey: string | null = null;
    let topCount = 0;
    Object.entries(perEvent).forEach(([key, count]) => {
      if (count > topCount) {
        topCount = count;
        topKey = key;
      }
    });
    let topEvent: { title: string; count: number } | null = null;
    if (topKey) {
      const cid = (topKey as string).slice(0, (topKey as string).lastIndexOf('_'));
      const idxStr = (topKey as string).slice((topKey as string).lastIndexOf('_') + 1);
      const cr = creators.find((c) => c.id === cid);
      const ev = cr && Array.isArray(cr.events) ? cr.events[parseInt(idxStr, 10)] : null;
      if (ev) topEvent = { title: ev.title || 'Untitled event', count: topCount };
    }

    // ── Shop engagement ──────────────────────────────────────────────────────
    const nameOf = (cid: string) => creators.find((c) => c.id === cid)?.name || cid;
    // Favorites per shop (from users' favorites arrays).
    const favCount: Record<string, number> = {};
    users.forEach((u) =>
      (Array.isArray(u.favorites) ? u.favorites : []).forEach((id: string) => {
        if (id) favCount[id] = (favCount[id] || 0) + 1;
      }),
    );
    const topFav = Object.entries(favCount).sort((a, b) => b[1] - a[1])[0];
    const mostFavorited = topFav ? { name: nameOf(topFav[0]), count: topFav[1] } : null;
    // RSVPs received per shop (sum across their events) — reuse perEvent.
    const rsvpsPerCreator: Record<string, number> = {};
    Object.entries(perEvent).forEach(([key, count]) => {
      const cid = key.slice(0, key.lastIndexOf('_'));
      rsvpsPerCreator[cid] = (rsvpsPerCreator[cid] || 0) + count;
    });
    const topRsvpC = Object.entries(rsvpsPerCreator).sort((a, b) => b[1] - a[1])[0];
    const mostRsvpsShop = topRsvpC ? { name: nameOf(topRsvpC[0]), count: topRsvpC[1] } : null;
    // Page views (live counter, built up over time).
    const totalViews = creators.reduce((s, c) => s + (Number(c.views) || 0), 0);
    const mostViewedC = [...creators].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))[0];
    const mostViewed = mostViewedC && (Number(mostViewedC.views) || 0) > 0
      ? { name: mostViewedC.name || 'Unnamed', count: Number(mostViewedC.views) || 0 }
      : null;
    const neverViewedShops = creators.filter((c) => c.isPublished === true && !(Number(c.views) > 0)).length;

    return {
      roleCount,
      blocked,
      newUsersWeek,
      newUsersMonth,
      recentUsers,
      publishedShops,
      draftShops,
      shopsWithEvents,
      newShopsWeek,
      lastCreatedShop,
      lastEditedShop,
      shopsMissingTimestamps,
      recentShops,
      creatorsPendingShop,
      mostFavorited,
      mostRsvpsShop,
      mostViewed,
      neverViewedShops,
      totalViews,
      totalEvents,
      activeEvents,
      draftEvents,
      upcomingEvents,
      nextUpcoming: nextUpcoming as { title: string; start: string; creator: string } | null,
      going,
      interested,
      totalRsvps,
      avgRsvps,
      rsvpsWeek,
      topEvent,
    };
  }, [users, creators, rsvps]);

  // Taxonomy usage — how categories/filters are actually used across shops, so
  // the team sees what the directory is concentrated on and what's empty.
  const tax = useMemo(() => {
    const catUsage = selectableCategories
      .map((cat) => ({
        cat: cat as string,
        count: creators.filter((c) => Array.isArray(c.categories) && c.categories.includes(cat)).length,
      }))
      .sort((a, b) => b.count - a.count);
    const unusedCategories = catUsage.filter((x) => x.count === 0).length;

    // Tag usage across shops (subCategories holds both subcategories + filters).
    const subUsage: Record<string, number> = {};
    creators.forEach((c) =>
      (Array.isArray(c.subCategories) ? c.subCategories : []).forEach((s: string) => {
        if (!s) return;
        subUsage[s] = (subUsage[s] || 0) + 1;
      }),
    );
    const topFilters = Object.entries(subUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const usedFilterValues = Object.keys(subUsage).length;
    // Least-used main category (lowest shop count — may be 0).
    const leastUsedCategory = catUsage.length ? catUsage[catUsage.length - 1] : null;

    // The full universe of filter/subcategory tag values in the taxonomy, to
    // surface tags that NO shop uses (candidates to prune or promote).
    const allTagValues = new Set<string>();
    Object.values(subcategories).forEach((groups: any) => {
      (Array.isArray(groups) ? groups : []).forEach((g: any) => {
        if (typeof g === 'string') allTagValues.add(g);
        else if (g && Array.isArray(g.options)) g.options.forEach((o: string) => allTagValues.add(o));
      });
    });
    const unusedTags = [...allTagValues].filter((v) => !subUsage[v]).length;

    return { catUsage, unusedCategories, leastUsedCategory, topFilters, usedFilterValues, unusedTags };
  }, [creators, selectableCategories, subcategories]);

  // One-time: stamp createdAt/updatedAt onto shops that predate timestamp
  // tracking, so the "last created / edited" metrics have a baseline.
  const handleBackfill = async () => {
    const missing = creators.filter((c) => !c.createdAt && !c.updatedAt);
    if (missing.length === 0) {
      alert('All shops already have timestamps.');
      return;
    }
    if (!window.confirm(`Stamp createdAt/updatedAt on ${missing.length} shop(s) missing them? (Set to now — establishes a baseline; future edits track accurately.)`)) return;
    setBackfilling(true);
    try {
      const nowIso = new Date().toISOString();
      for (const c of missing) {
        await setDoc(doc(db, 'creators', c.id), { createdAt: nowIso, updatedAt: nowIso }, { merge: true });
      }
      alert(`Backfilled ${missing.length} shop(s).`);
      fetchStats();
    } catch (err) {
      console.error('Backfill failed:', err);
      alert('Backfill failed. Check console.');
    } finally {
      setBackfilling(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const cardBase = `border-2 ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`;
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const faint = isDarkMode ? 'text-gray-500' : 'text-gray-400';

  const Stat = ({ icon, value, label, accent }: { icon?: React.ReactNode; value: React.ReactNode; label: string; accent?: string }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`inline-flex items-center gap-1 text-lg md:text-xl font-black ${accent || ''}`}>
        {icon}
        {value}
      </span>
      <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest truncate ${faint}`}>{label}</span>
    </div>
  );

  const CardHeader = ({ label, icon, to, big }: { label: string; icon: React.ReactNode; to?: string | null; big: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 ${muted}`}>{label}</p>
        <p className="text-3xl md:text-5xl font-black leading-none">{big}</p>
      </div>
      <div className={`flex items-center gap-1 shrink-0 ${isDarkMode ? 'text-zinc-700' : 'text-gray-200'}`}>
        {icon}
        {to && <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-zinc-600' : 'text-gray-300'}`} />}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Dashboard</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-56 animate-pulse ${cardBase}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Dashboard</h1>
          <p className={`mt-2 font-medium ${muted}`}>Platform overview and statistics.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-auto">
          {m.shopsMissingTimestamps > 0 && (
            <button
              onClick={handleBackfill}
              disabled={backfilling}
              title={`Stamp creation/edit dates on ${m.shopsMissingTimestamps} older shop(s) that predate date tracking, so "last created/edited" works.`}
              className={`flex items-center justify-center gap-2 px-4 py-2 font-bold uppercase text-xs tracking-wider border-2 disabled:opacity-50 ${
                isDarkMode ? 'border-zinc-700 text-white hover:bg-white/10' : 'border-gray-300 text-black hover:bg-black/5'
              }`}
            >
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              {backfilling ? 'Backfilling…' : `Backfill dates (${m.shopsMissingTimestamps})`}
            </button>
          )}
        </div>
      </div>

      {/* Three feature cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* USERS */}
        <Link to="/admin/users" className={`p-5 md:p-6 flex flex-col gap-5 transition-colors ${cardBase} ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'}`}>
          <CardHeader label="Users" icon={<UsersIcon className="w-7 h-7" />} to="/admin/users" big={users.length} />
          {m.newUsersWeek > 0 && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-500">
              <TrendingUp className="w-3.5 h-3.5" /> +{m.newUsersWeek} this week · +{m.newUsersMonth} this month
            </div>
          )}
          <div className={`grid grid-cols-3 gap-3 py-3 border-y-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
            <Stat icon={<UserIcon className="w-3.5 h-3.5 opacity-60" />} value={m.roleCount.user} label="Regular" />
            <Stat icon={<Shield className="w-3.5 h-3.5 opacity-60" />} value={m.roleCount.creator} label="Creators" />
            <Stat icon={<ShieldAlert className="w-3.5 h-3.5 opacity-60" />} value={m.roleCount.admin} label="Admins" />
          </div>
          {m.creatorsPendingShop > 0 && (
            <div className="flex items-center justify-between -mt-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Creators without a published shop</span>
              <span className="text-xs font-bold text-yellow-500">{m.creatorsPendingShop}</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Latest signups</span>
              {m.blocked > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500">
                  <Ban className="w-3 h-3" /> {m.blocked} blocked
                </span>
              )}
            </div>
            {m.recentUsers.length === 0 ? (
              <span className={`text-xs ${faint}`}>No dated signups yet.</span>
            ) : (
              m.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 min-w-0">
                  {u.profileImage ? (
                    <img src={u.profileImage} alt="" className="w-6 h-6 rounded-full border border-current/20 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300/30 flex items-center justify-center shrink-0">
                      <UserIcon className="w-3 h-3 opacity-60" />
                    </div>
                  )}
                  <span className="text-xs font-medium truncate flex-1">{fullName(u)}</span>
                  <span className={`text-[10px] shrink-0 ${faint}`}>{timeAgo(u.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </Link>

        {/* CREATOR SHOPS */}
        <Link to="/admin/creators" className={`p-5 md:p-6 flex flex-col gap-5 transition-colors ${cardBase} ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'}`}>
          <CardHeader label="Creator Shops" icon={<Store className="w-7 h-7" />} to="/admin/creators" big={creators.length} />
          {m.newShopsWeek > 0 && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-500">
              <TrendingUp className="w-3.5 h-3.5" /> +{m.newShopsWeek} this week
            </div>
          )}
          <div className={`grid grid-cols-3 gap-3 py-3 border-y-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
            <Stat icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />} value={m.publishedShops} label="Published" accent="text-green-500" />
            <Stat icon={<FileText className="w-3.5 h-3.5 text-yellow-500" />} value={m.draftShops} label="Drafts" accent="text-yellow-500" />
            <Stat icon={<CalendarIcon className="w-3.5 h-3.5 opacity-60" />} value={m.shopsWithEvents} label="With events" />
          </div>
          {/* Engagement — favorites + RSVPs are live now; views build up over time. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${faint}`}>
                <Heart className="w-3 h-3" /> Most favorited
              </span>
              {m.mostFavorited ? (
                <span className="text-xs font-medium text-right min-w-0 truncate">{m.mostFavorited.name} <span className={faint}>· {m.mostFavorited.count}</span></span>
              ) : <span className={`text-xs ${faint}`}>—</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${faint}`}>
                <Eye className="w-3 h-3" /> Most visited
              </span>
              {m.mostViewed ? (
                <span className="text-xs font-medium text-right min-w-0 truncate">{m.mostViewed.name} <span className={faint}>· {m.mostViewed.count} views</span></span>
              ) : <span className={`text-xs ${faint}`}>No views yet</span>}
            </div>
            {(m.totalViews > 0 || m.neverViewedShops > 0) && (
              <span className={`text-[10px] ${faint}`}>{m.totalViews} total views · {m.neverViewedShops} published never visited</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Last edited</span>
              {m.lastEditedShop ? (
                <span className="text-xs font-medium text-right min-w-0 truncate">
                  {m.lastEditedShop.name || 'Unnamed'} <span className={faint}>· {timeAgo(m.lastEditedShop.updatedAt)}</span>
                </span>
              ) : <span className={`text-xs ${faint}`}>—</span>}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Latest created</span>
            {m.recentShops.length === 0 ? (
              <span className={`text-xs ${faint}`}>—</span>
            ) : (
              m.recentShops.map((c) => (
                <div key={c.id} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium truncate flex-1">
                    {c.name || 'Unnamed'} <span className={faint}>· by {shopOwner(c)}</span>
                  </span>
                  <span className={`text-[10px] shrink-0 ${faint}`}>{timeAgo(c.createdAt)}</span>
                </div>
              ))
            )}
            {m.shopsMissingTimestamps > 0 && (
              <span className={`text-[10px] ${faint}`}>{m.shopsMissingTimestamps} shop(s) without dates — use “Backfill dates”.</span>
            )}
          </div>
        </Link>

        {/* EVENTS */}
        <div className={`p-5 md:p-6 flex flex-col gap-5 ${cardBase}`}>
          <CardHeader label="Events" icon={<CalendarIcon className="w-7 h-7" />} big={m.totalEvents} />
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-500">
            <TrendingUp className="w-3.5 h-3.5" /> {m.upcomingEvents} upcoming{m.rsvpsWeek > 0 ? ` · +${m.rsvpsWeek} RSVPs this week` : ''}
          </div>
          <div className={`grid grid-cols-3 gap-3 py-3 border-y-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
            <Stat icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />} value={m.activeEvents} label="Active" accent="text-green-500" />
            <Stat icon={<FileText className="w-3.5 h-3.5 text-yellow-500" />} value={m.draftEvents} label="Drafts" accent="text-yellow-500" />
            <Stat icon={<Clock className="w-3.5 h-3.5 opacity-60" />} value={m.upcomingEvents} label="Upcoming" />
          </div>
          <div className="flex flex-col gap-2">
            <div className={`grid grid-cols-3 gap-3`}>
              <Stat icon={<Heart className="w-3.5 h-3.5 opacity-60" />} value={m.totalRsvps} label="Total RSVPs" />
              <Stat value={m.going} label="Going" accent="text-green-500" />
              <Stat value={m.interested} label="Interested" />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Avg / active event</span>
              <span className="text-xs font-bold">{m.avgRsvps.toFixed(1)}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Most popular</span>
              {m.topEvent ? (
                <span className="text-xs font-medium text-right min-w-0 truncate">
                  {m.topEvent.title} <span className={faint}>· {m.topEvent.count} RSVPs</span>
                </span>
              ) : <span className={`text-xs ${faint}`}>—</span>}
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Next up</span>
              {m.nextUpcoming ? (
                <span className="text-xs font-medium text-right min-w-0 truncate">
                  {m.nextUpcoming.title} <span className={faint}>· {formatDay(m.nextUpcoming.start)}</span>
                </span>
              ) : <span className={`text-xs ${faint}`}>—</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Taxonomy cards — now with usage stats so the team sees what the
          directory is concentrated on and what's unused. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* CATEGORIES */}
        <Link to="/admin/categories" className={`p-5 md:p-6 flex flex-col gap-4 transition-colors ${cardBase} ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'}`}>
          <CardHeader label="Categories" icon={<Tag className="w-7 h-7" />} to="/admin/categories" big={selectableCategories.length} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Top by shops</span>
              {tax.unusedCategories > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">{tax.unusedCategories} unused</span>
              )}
            </div>
            {tax.catUsage.slice(0, 3).map(({ cat, count }) => {
              const pct = creators.length ? Math.round((count / creators.length) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium truncate flex-1">{cat}</span>
                  <div className={`hidden sm:block w-24 h-1.5 ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} overflow-hidden`}>
                    <div className={`h-full ${isDarkMode ? 'bg-white' : 'bg-black'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-[10px] shrink-0 ${faint}`}>{count} shop{count === 1 ? '' : 's'}</span>
                </div>
              );
            })}
            {tax.leastUsedCategory && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Least used</span>
                <span className="text-xs font-medium text-right min-w-0 truncate">
                  {tax.leastUsedCategory.cat} <span className={faint}>· {tax.leastUsedCategory.count} shop{tax.leastUsedCategory.count === 1 ? '' : 's'}</span>
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* FILTERS */}
        <Link to="/admin/filters" className={`p-5 md:p-6 flex flex-col gap-4 transition-colors ${cardBase} ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'}`}>
          <CardHeader label="Filters" icon={<SlidersHorizontal className="w-7 h-7" />} to="/admin/filters" big={filtersCount} />
          <div className={`grid grid-cols-3 gap-3 py-2 border-y-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
            <Stat value={filtersCount} label="Filter groups" />
            <Stat value={tax.usedFilterValues} label="Tags in use" />
            <Stat value={tax.unusedTags} label="Unused tags" accent={tax.unusedTags > 0 ? 'text-yellow-500' : undefined} />
          </div>
          <div className="flex flex-col gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>Most used tags</span>
            {tax.topFilters.length === 0 ? (
              <span className={`text-xs ${faint}`}>No shops have tags yet.</span>
            ) : (
              tax.topFilters.map(([value, count]) => (
                <div key={value} className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium truncate flex-1">{value}</span>
                  <span className={`text-[10px] shrink-0 ${faint}`}>{count} shop{count === 1 ? '' : 's'}</span>
                </div>
              ))
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
