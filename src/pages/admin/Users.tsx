import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useDropzone } from 'react-dropzone';
import { db, functions } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage } from '../../lib/upload';
import { Shield, User, ShieldAlert, Search, X, Trash2, Ban, Loader2, Plus } from 'lucide-react';

type Role = 'user' | 'creator' | 'admin';

export function Users() {
  const { isDarkMode } = useUI();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  // Editable drafts for the open user.
  const [draftRole, setDraftRole] = useState<Role>("user");
  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftProfileImage, setDraftProfileImage] = useState("");
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (user: any) => {
    setEditing(user);
    setDraftRole((user.role as Role) || 'user');
    setSaveError(null);
  };
  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (draftRole === editing.role) {
      closeEdit();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, 'users', editing.id), { role: draftRole });
      setUsers(users.map(u => u.id === editing.id ? { ...u, role: draftRole } : u));
      setEditing(null);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || 'Error updating role');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [u.name, u.firstName, u.lastName, u.email, u.role || 'user']
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  const inputClass = `w-full pl-9 pr-9 py-2 text-sm font-medium border-2 outline-none ${
    isDarkMode ? "bg-black border-zinc-700 focus:border-white text-white placeholder-gray-600" : "bg-white border-gray-300 focus:border-black text-black placeholder-gray-400"
  }`;

  const roleBadge = (role: string | undefined) => (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-widest border-2 ${
      role === 'admin'
        ? (isDarkMode ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200")
        : role === 'creator'
        ? (isDarkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200")
        : (isDarkMode ? "bg-zinc-800 text-gray-300 border-zinc-700" : "bg-gray-100 text-gray-600 border-gray-200")
    }`}>
      {role === 'admin' ? <ShieldAlert className="w-3 h-3" /> : role === 'creator' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {role || 'user'}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">User Management</h1>
        <p className={`mt-2 font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Click a user to edit their role.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or role..."
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

      {/* Result count */}
      <div className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
        {loading ? "Loading..." : `${filtered.length} user${filtered.length === 1 ? "" : "s"}${search ? " (filtered)" : ""}`}
      </div>

      {/* Table — read-only. Click any row to open the edit modal. */}
      <div className={`border-2 ${isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-gray-200 bg-white"} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-xs uppercase tracking-wider font-bold border-b-2 ${isDarkMode ? "border-zinc-800 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                <th className="p-4">Name</th>
                <th className="p-4 hidden sm:table-cell">Email</th>
                <th className="p-4">Role</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {!loading && filtered.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center">{search ? "No users match your search." : "No users yet."}</td></tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openEdit(user)}
                    className={`border-b-2 last:border-0 cursor-pointer transition-colors ${
                      isDarkMode ? "border-zinc-800 hover:bg-zinc-800/60" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt="" className="w-8 h-8 rounded-full border-2 border-current/20 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate">{user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown"}</div>
                          <div className={`text-[11px] truncate sm:hidden ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">{user.email}</td>
                    <td className="p-4">{roleBadge(user.role)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeEdit}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md p-6 brutalist-border brutalist-shadow ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}
          >
            <button
              type="button"
              onClick={closeEdit}
              aria-label="Close"
              className={`absolute top-3 right-3 p-1 transition-colors ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold uppercase tracking-widest mb-4">Edit user</h3>

            <div className="flex items-center gap-3 mb-4">
              {editing.profileImage ? (
                <img src={editing.profileImage} alt="" className="w-12 h-12 rounded-full border-2 border-current/20 shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold truncate">{editing.name || `${editing.firstName || ""} ${editing.lastName || ""}`.trim() || "Unknown"}</div>
                <div className={`text-xs truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{editing.email}</div>
              </div>
            </div>

            {editing.bio && (
              <div className="mb-4">
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Bio</label>
                <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{editing.bio}</p>
              </div>
            )}

            <div className="mb-4">
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(["user", "creator", "admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDraftRole(r)}
                    className={`px-3 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                      draftRole === r
                        ? r === "admin"
                          ? "bg-red-500 text-white border-red-500"
                          : r === "creator"
                          ? "bg-blue-500 text-white border-blue-500"
                          : isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
                        : isDarkMode ? "border-zinc-700 text-gray-300 hover:border-white" : "border-gray-300 text-gray-600 hover:border-black"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <p className={`text-[10px] uppercase tracking-widest mb-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              Role changes propagate via the syncAdminClaim Cloud Function. Affected user must refresh / re-login.
            </p>

            {saveError && (
              <div className={`mb-3 px-3 py-2 text-xs font-bold border-2 ${isDarkMode ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-red-500/50 text-red-600 bg-red-50"}`}>
                {saveError}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 ${
                  isDarkMode ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-black hover:bg-black/5"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || draftRole === (editing.role || 'user')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black hover:bg-gray-800"
                }`}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
