import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import { Users, Store, Calendar as CalendarIcon, UploadCloud, ChevronRight, Tag, SlidersHorizontal } from 'lucide-react';
import { creators as staticCreators } from '../../data';
import { useCategories } from '../../contexts/CategoriesContext';
import { FilterGroup } from '../../constants/categories';

export function Dashboard() {
  const { isDarkMode } = useUI();
  const { selectableCategories, subcategories } = useCategories();
  const [stats, setStats] = useState({ users: 0, creators: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  // Total number of filter groups across the taxonomy. For main categories
  // the "Category" group is the subcategory list (not a filter) — exclude
  // those from the count. For non-main entries every group is a filter.
  const filtersCount = Object.entries(subcategories).reduce((sum, [parent, groups]) => {
    const isMain = selectableCategories.includes(parent as any);
    const filterGroups = groups.filter((g) => {
      if (typeof g === "string") return false;
      const fg = g as FilterGroup;
      if (isMain && fg.groupName === "Category") return false;
      return true;
    });
    return sum + filterGroups.length;
  }, 0);

  const fetchStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const creatorsSnap = await getDocs(collection(db, 'creators'));
      setStats({
        users: usersSnap.size,
        creators: creatorsSnap.size,
        events: 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleMigrate = async () => {
    if (!window.confirm("This will migrate all data from data.ts to Firestore. Proceed?")) return;
    setMigrating(true);
    try {
      let count = 0;
      for (const creator of staticCreators) {
        await setDoc(doc(db, 'creators', creator.id), { ...creator, isPublished: true });
        count++;
      }
      alert(`Successfully migrated ${count} creators!`);
      fetchStats();
    } catch (err) {
      console.error("Migration failed:", err);
      alert("Migration failed. Check console.");
    } finally {
      setMigrating(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: <Users className="w-8 h-8" />, to: '/admin/users' as string | null },
    { label: 'Creator Shops', value: stats.creators, icon: <Store className="w-8 h-8" />, to: '/admin/creators' as string | null },
    { label: 'Active Events', value: stats.events, icon: <CalendarIcon className="w-8 h-8" />, to: null as string | null },
    { label: 'Categories', value: selectableCategories.length, icon: <Tag className="w-8 h-8" />, to: '/admin/categories' as string | null },
    { label: 'Filters', value: filtersCount, icon: <SlidersHorizontal className="w-8 h-8" />, to: '/admin/filters' as string | null },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Dashboard</h1>
          <p className={`mt-2 font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Platform overview and statistics.</p>
        </div>
        <button
          onClick={handleMigrate}
          disabled={migrating}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold uppercase text-xs tracking-wider disabled:opacity-50 self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          {migrating ? "Migrating..." : "Migrate Data"}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[1,2,3].map(i => (
             <div key={i} className={`h-28 md:h-32 border-2 animate-pulse ${isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-gray-200 bg-gray-50"}`}></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {statCards.map((stat, i) => {
            const cardClass = `p-4 md:p-6 border-2 flex items-center justify-between transition-colors ${
              isDarkMode ? "border-zinc-800 bg-zinc-900 hover:bg-zinc-800" : "border-gray-200 bg-white hover:bg-gray-50"
            }`;
            const inner = (
              <>
                <div className="min-w-0">
                  <p className={`text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2 truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
                  <p className="text-2xl md:text-4xl font-black">{stat.value}</p>
                </div>
                <div className={`flex items-center gap-2 ${isDarkMode ? "text-zinc-700" : "text-gray-200"}`}>
                  {stat.icon}
                  {stat.to && <ChevronRight className={`w-5 h-5 ${isDarkMode ? "text-zinc-600" : "text-gray-300"}`} />}
                </div>
              </>
            );
            return stat.to ? (
              <Link key={i} to={stat.to} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <div key={i} className={cardClass.replace('hover:bg-zinc-800', '').replace('hover:bg-gray-50', '')}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
