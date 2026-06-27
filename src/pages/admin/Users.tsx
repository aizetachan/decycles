import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useDropzone } from 'react-dropzone';
import { db, functions } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage } from '../../lib/upload';
import { useCropper } from '../../components/ui/ImageCropperProvider';
import { Shield, User, ShieldAlert, Search, X, Trash2, Ban, Loader2, Plus, UserX, AlertTriangle, RefreshCw, Pencil } from 'lucide-react';

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

  // Orphaned Auth accounts (exist in Authentication but have no Firestore
  // profile — e.g. from an earlier failed delete). Listed on demand; the admin
  // deletes them deliberately.
  const [orphans, setOrphans] = useState<any[] | null>(null);
  const [orphansLoading, setOrphansLoading] = useState(false);
  const [orphansError, setOrphansError] = useState<string | null>(null);
  const [deletingOrphan, setDeletingOrphan] = useState<string | null>(null);

  const scanOrphans = async () => {
    setOrphansLoading(true);
    setOrphansError(null);
    try {
      const list = httpsCallable(functions, 'adminListOrphanedUsers');
      const res: any = await list({});
      setOrphans(res?.data?.orphans || []);
    } catch (err: any) {
      console.error(err);
      setOrphansError(err?.message || 'Failed to scan orphaned accounts');
    } finally {
      setOrphansLoading(false);
    }
  };

  const deleteOrphan = async (uid: string, label: string) => {
    if (!window.confirm(`Permanently delete the orphaned Auth account ${label}? This removes it from Firebase Authentication.`)) return;
    setDeletingOrphan(uid);
    setOrphansError(null);
    try {
      const del = httpsCallable(functions, 'adminDeleteUser');
      await del({ uid });
      setOrphans((prev) => (prev ? prev.filter((o) => o.uid !== uid) : prev));
    } catch (err: any) {
      console.error(err);
      setOrphansError(err?.message || 'Failed to delete account');
    } finally {
      setDeletingOrphan(null);
    }
  };

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
    setDraftFirstName(user.firstName || '');
    setDraftLastName(user.lastName || '');
    setDraftEmail(user.email || '');
    setDraftProfileImage(user.profileImage || '');
    setDraftBlocked(!!user.blocked);
    setSaveError(null);
  };
  const closeEdit = () => {
    if (saving || deleting) return;
    setEditing(null);
    setSaveError(null);
  };

  // The admin's own row — block/delete on yourself is disabled to avoid lockout.
  const isSelf = !!editing && !!currentUser && editing.id === currentUser.uid;
  const cropImage = useCropper();

  const AVATAR_CROP = { aspect: 1, cropShape: 'round' as const, title: 'Crop avatar', minWidth: 256 };
  const uploadAvatar = async (file: File) => {
    if (!editing) return;
    setSaveError(null);
    setAvatarUploading(true);
    try {
      const url = await uploadImage(file, `users/${editing.id}/avatar`);
      setDraftProfileImage(url);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };
  const onAvatarDrop = async (files: File[]) => {
    if (!files.length || !editing) return;
    const cropped = await cropImage(files[0], AVATAR_CROP);
    if (cropped) await uploadAvatar(cropped);
  };
  const editAvatar = async () => {
    if (!draftProfileImage) return;
    const cropped = await cropImage(draftProfileImage, AVATAR_CROP);
    if (cropped) await uploadAvatar(cropped);
  };
  const { getRootProps: getAvatarRootProps, getInputProps: getAvatarInputProps, isDragActive: isAvatarDragActive } =
    useDropzone({ onDrop: onAvatarDrop, accept: { 'image/*': [] }, maxFiles: 1 } as any);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const fullName = `${draftFirstName} ${draftLastName}`.trim();
      // 1. Firestore profile fields (name, avatar, role, blocked flag).
      const patch: any = {
        firstName: draftFirstName,
        lastName: draftLastName,
        name: fullName,
        profileImage: draftProfileImage,
        role: draftRole,
        // Don't let an admin lock themselves out.
        blocked: isSelf ? false : draftBlocked,
      };
      await updateDoc(doc(db, 'users', editing.id), patch);

      // 2. Email change → real login email via Cloud Function (Admin SDK). The
      // function also mirrors it onto the Firestore doc.
      const emailChanged = draftEmail.trim() && draftEmail.trim() !== (editing.email || '');
      if (emailChanged) {
        const updateEmail = httpsCallable(functions, 'adminUpdateUserEmail');
        await updateEmail({ uid: editing.id, email: draftEmail.trim() });
      }

      setUsers(users.map(u => (u.id === editing.id ? { ...u, ...patch, email: draftEmail.trim() || u.email } : u)));
      setEditing(null);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || 'Error saving user');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!editing || isSelf) return;
    const label = editing.name || `${editing.firstName || ''} ${editing.lastName || ''}`.trim() || editing.email || 'this user';
    if (!window.confirm(`Permanently delete ${label}? This removes their account and profile from the database and cannot be undone.`)) return;
    setDeleting(true);
    setSaveError(null);
    try {
      const del = httpsCallable(functions, 'adminDeleteUser');
      await del({ uid: editing.id });
      setUsers(users.filter(u => u.id !== editing.id));
      setEditing(null);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || 'Error deleting user');
    } finally {
      setDeleting(false);
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
  // Plain (no icon padding) input for the edit-modal form fields.
  const fieldClass = `w-full px-3 py-2 text-sm font-medium border-2 outline-none ${
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
        <p className={`mt-2 font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Click a user to edit their avatar, name, email, role, block or delete them.</p>
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

      {/* Orphaned Auth accounts — exist in Authentication but have no Firestore
          profile (e.g. an earlier failed delete). Review and clean up here. */}
      <div className={`border-2 ${isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-gray-200 bg-white"}`}>
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 min-w-0">
            <UserX className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-widest">Orphaned auth accounts</div>
              <div className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                Accounts in Authentication with no profile — usually a failed delete. Delete them when ready.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={scanOrphans}
            disabled={orphansLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 shrink-0 ${
              isDarkMode ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-black hover:bg-black/5"
            }`}
          >
            {orphansLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {orphansLoading ? "Scanning…" : orphans === null ? "Scan" : "Rescan"}
          </button>
        </div>

        {orphansError && (
          <div className="px-4 pb-3 text-xs font-bold text-red-500">{orphansError}</div>
        )}

        {orphans !== null && (
          orphans.length === 0 ? (
            <div className={`px-4 pb-4 text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
              ✓ No orphaned accounts — Auth and profiles are in sync.
            </div>
          ) : (
            <div className={`border-t-2 ${isDarkMode ? "border-zinc-800" : "border-gray-200"}`}>
              <div className={`px-4 py-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
                <AlertTriangle className="w-3.5 h-3.5" /> {orphans.length} orphaned account{orphans.length === 1 ? "" : "s"} found
              </div>
              {orphans.map((o) => (
                <div key={o.uid} className={`flex items-center gap-3 px-4 py-3 border-t-2 ${isDarkMode ? "border-zinc-800" : "border-gray-100"}`}>
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <UserX className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{o.email || o.displayName || "(no email)"}</div>
                    <div className={`text-[10px] truncate ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      {o.provider || "—"}{o.creationTime ? ` · created ${new Date(o.creationTime).toLocaleDateString()}` : ""} · {o.uid}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOrphan(o.uid, o.email || o.uid)}
                    disabled={deletingOrphan === o.uid}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 shrink-0 ${
                      isDarkMode ? "border-red-500/50 text-red-400 hover:bg-red-500/10" : "border-red-500/50 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {deletingOrphan === o.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )
        )}
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
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown"}</span>
                            {user.blocked && (
                              <span className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest border-2 border-red-500/40 text-red-500">
                                <Ban className="w-2.5 h-2.5" /> Blocked
                              </span>
                            )}
                          </div>
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

            <h3 className="text-lg font-bold uppercase tracking-widest mb-4 pr-6">Edit user</h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 -mr-1">
              {/* Avatar — click / drop to replace. */}
              <div className="flex items-center gap-4">
                <div
                  {...getAvatarRootProps()}
                  className={`relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed cursor-pointer shrink-0 group ${
                    isAvatarDragActive ? 'border-blue-500' : isDarkMode ? 'border-zinc-600 hover:border-white' : 'border-gray-300 hover:border-black'
                  }`}
                >
                  <input {...getAvatarInputProps()} />
                  {draftProfileImage ? (
                    <img src={draftProfileImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={draftProfileImage && !avatarUploading ? (e) => { e.stopPropagation(); editAvatar(); } : undefined}
                  >
                    {avatarUploading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : draftProfileImage ? (
                      <Pencil className="w-5 h-5 text-white" />
                    ) : (
                      <Plus className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Avatar<br />
                  <span className="normal-case tracking-normal font-medium">Click or drop an image</span>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>First name</label>
                  <input type="text" value={draftFirstName} onChange={(e) => setDraftFirstName(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last name</label>
                  <input type="text" value={draftLastName} onChange={(e) => setDraftLastName(e.target.value)} className={fieldClass} />
                </div>
              </div>

              {/* Email — real login email (changed via Cloud Function). */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email (login)</label>
                <input type="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} className={fieldClass} />
                <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Changing this updates the real login email. The user signs in with the new address.
                </p>
              </div>

              {/* Role */}
              <div>
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
                <p className={`text-[10px] uppercase tracking-widest mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Role changes propagate via syncAdminClaim. Affected user must refresh / re-login.
                </p>
              </div>

              {/* Block — Firestore flag the app enforces (blocked user sees a
                  locked screen and can't act, but can still sign in). */}
              <div className={`flex items-start justify-between gap-3 p-3 border-2 ${draftBlocked ? (isDarkMode ? 'border-red-500/50 bg-red-500/5' : 'border-red-500/50 bg-red-50') : (isDarkMode ? 'border-zinc-700' : 'border-gray-200')}`}>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5" /> Blocked
                  </div>
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {isSelf ? "You can't block your own account." : 'Blocks the user from doing anything in the app (they see a locked screen). They can still sign in.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => setDraftBlocked(v => !v)}
                  className={`shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    draftBlocked
                      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                      : isDarkMode ? 'border-zinc-700 text-gray-300 hover:border-white' : 'border-gray-300 text-gray-600 hover:border-black'
                  }`}
                >
                  {draftBlocked ? 'Blocked' : 'Block user'}
                </button>
              </div>

              {/* Danger zone — permanent delete (Firestore docs + Auth account). */}
              <div className={`pt-3 border-t-2 ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                <button
                  type="button"
                  disabled={isSelf || deleting || saving}
                  onClick={deleteUser}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDarkMode ? 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500' : 'border-red-500/50 text-red-600 hover:bg-red-50 hover:border-red-500'
                  }`}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Deleting…' : isSelf ? "Can't delete yourself" : 'Delete user permanently'}
                </button>
              </div>
            </div>

            {saveError && (
              <div className={`mt-3 px-3 py-2 text-xs font-bold border-2 ${isDarkMode ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-red-500/50 text-red-600 bg-red-50"}`}>
                {saveError}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving || deleting}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 ${
                  isDarkMode ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-black hover:bg-black/5"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || deleting || avatarUploading}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black hover:bg-gray-800"
                }`}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
