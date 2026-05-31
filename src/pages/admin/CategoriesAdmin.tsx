import React, { useState, useMemo } from "react";
import {
  doc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { db } from "../../firebase";
import { useUI } from "../../contexts/UIContext";
import { useCategories } from "../../contexts/CategoriesContext";
import { FilterItem, FilterGroup } from "../../constants/categories";

/**
 * Admin taxonomy editor.
 *
 * Stored in Firestore at `taxonomy/main`:
 *   { selectableCategories: string[], subcategories: Record<string, FilterItem[]> }
 *
 * Renames cascade to every creators/* doc that has the old value in its
 * `categories` or `subCategories` arrays. Deletes do the same — remove the
 * value from any creator that had it. Confirmation modals warn the admin
 * when destructive operations affect existing data.
 */

type ConfirmAction =
  | { kind: "delete-main"; name: string; usage: number }
  | { kind: "delete-option"; parent: string; groupIdx: number; name: string; usage: number }
  | { kind: "rename-main"; oldName: string; newName: string; usage: number }
  | { kind: "rename-option"; parent: string; groupIdx: number; oldName: string; newName: string; usage: number };

export function CategoriesAdmin() {
  const { isDarkMode } = useUI();
  const { selectableCategories, subcategories, loading } = useCategories();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: string; key: string } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [newMainName, setNewMainName] = useState("");
  const [newGroupName, setNewGroupName] = useState<{ [parent: string]: string }>({});
  const [newOption, setNewOption] = useState<{ [key: string]: string }>({});
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taxRef = doc(db, "taxonomy", "main");

  // Cascade: find every creators/* doc that uses `name` in either
  // `categories` or `subCategories`, and either rename or remove it.
  const cascade = async (oldName: string, newNameOrNull: string | null) => {
    const snap = await getDocs(collection(db, "creators"));
    const writes: Promise<any>[] = [];
    let batches = 0;
    let batch = writeBatch(db);
    let opsInBatch = 0;
    snap.forEach((d) => {
      const data: any = d.data();
      const cats: string[] = Array.isArray(data.categories) ? data.categories : [];
      const subs: string[] = Array.isArray(data.subCategories) ? data.subCategories : [];
      const hadInCats = cats.includes(oldName);
      const hadInSubs = subs.includes(oldName);
      if (!hadInCats && !hadInSubs) return;
      const update: any = {};
      if (hadInCats) {
        update.categories = newNameOrNull
          ? cats.map((c) => (c === oldName ? newNameOrNull : c))
          : cats.filter((c) => c !== oldName);
      }
      if (hadInSubs) {
        update.subCategories = newNameOrNull
          ? subs.map((s) => (s === oldName ? newNameOrNull : s))
          : subs.filter((s) => s !== oldName);
      }
      batch.update(d.ref, update);
      opsInBatch++;
      if (opsInBatch >= 400) {
        writes.push(batch.commit());
        batches++;
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    });
    if (opsInBatch > 0) {
      writes.push(batch.commit());
      batches++;
    }
    await Promise.all(writes);
    return batches;
  };

  // Count creators currently using `name`. Used by confirm modals so the
  // admin sees the impact before confirming.
  const countUsage = async (name: string): Promise<number> => {
    const snap = await getDocs(collection(db, "creators"));
    let n = 0;
    snap.forEach((d) => {
      const data: any = d.data();
      const cats: string[] = Array.isArray(data.categories) ? data.categories : [];
      const subs: string[] = Array.isArray(data.subCategories) ? data.subCategories : [];
      if (cats.includes(name) || subs.includes(name)) n++;
    });
    return n;
  };

  // ---- Mutations on `taxonomy/main` ----

  const writeTaxonomy = async (
    nextSelectable: string[],
    nextSubcats: Record<string, FilterItem[]>,
  ) => {
    await setDoc(taxRef, {
      selectableCategories: nextSelectable,
      subcategories: nextSubcats,
      updatedAt: serverTimestamp(),
    });
  };

  const addMainCategory = async () => {
    const name = newMainName.trim();
    if (!name) return;
    if (selectableCategories.includes(name)) {
      setError(`"${name}" already exists.`);
      return;
    }
    const nextSubs = { ...subcategories, [name]: [{ groupName: "Category", options: [] }] };
    setBusy(true);
    setError(null);
    try {
      await writeTaxonomy([...selectableCategories, name], nextSubs);
      setNewMainName("");
    } catch (e: any) {
      setError(e?.message || "Failed to add main category.");
    } finally {
      setBusy(false);
    }
  };

  const moveMain = async (idx: number, dir: -1 | 1) => {
    const next = [...selectableCategories];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setBusy(true);
    setError(null);
    try {
      await writeTaxonomy(next, subcategories);
    } catch (e: any) {
      setError(e?.message || "Failed to reorder.");
    } finally {
      setBusy(false);
    }
  };

  const renameMain = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditing(null);
      return;
    }
    if (selectableCategories.includes(trimmed)) {
      setError(`"${trimmed}" already exists.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Update taxonomy doc — rename in selectable + rename the key in subcategories.
      const nextSelectable = selectableCategories.map((c) => (c === oldName ? trimmed : c));
      const nextSubs: Record<string, FilterItem[]> = {};
      for (const [k, v] of Object.entries(subcategories)) {
        nextSubs[k === oldName ? trimmed : k] = v.map((item) => {
          if (typeof item === "string") return item === oldName ? trimmed : item;
          // Replace within group options too — the parent name might appear as
          // an option somewhere else in the tree (e.g. "Bikes & Frames" is an
          // option inside Products' Category group).
          const g = item as FilterGroup;
          return {
            ...g,
            options: g.options.map((o) => (o === oldName ? (trimmed as any) : o)),
          };
        });
      }
      await writeTaxonomy(nextSelectable, nextSubs);
      // 2. Cascade to creators/*.
      await cascade(oldName, trimmed);
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "Rename failed.");
    } finally {
      setBusy(false);
      // Close the confirm modal if the rename was triggered from there.
      // Harmless no-op when invoked from the inline edit field.
      setConfirm(null);
    }
  };

  const deleteMain = async (name: string) => {
    setBusy(true);
    setError(null);
    try {
      const nextSelectable = selectableCategories.filter((c) => c !== name);
      const nextSubs: Record<string, FilterItem[]> = {};
      for (const [k, v] of Object.entries(subcategories)) {
        if (k === name) continue; // drop its own entry
        nextSubs[k] = v.map((item) => {
          if (typeof item === "string") return item;
          const g = item as FilterGroup;
          // Remove the deleted name from any group's options.
          return { ...g, options: g.options.filter((o) => o !== name) };
        });
      }
      await writeTaxonomy(nextSelectable, nextSubs);
      await cascade(name, null);
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const addGroup = async (parent: string) => {
    const name = (newGroupName[parent] || "").trim();
    if (!name) return;
    const groups = subcategories[parent] || [];
    if (groups.some((g) => typeof g !== "string" && (g as FilterGroup).groupName === name)) {
      setError(`Group "${name}" already exists in ${parent}.`);
      return;
    }
    const nextSubs = {
      ...subcategories,
      [parent]: [...groups, { groupName: name, options: [] }],
    };
    setBusy(true);
    setError(null);
    try {
      await writeTaxonomy(selectableCategories, nextSubs);
      setNewGroupName({ ...newGroupName, [parent]: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to add group.");
    } finally {
      setBusy(false);
    }
  };

  const deleteGroup = async (parent: string, groupIdx: number) => {
    const groups = subcategories[parent] || [];
    const target = groups[groupIdx] as FilterGroup;
    // Cascade: any options inside this group disappear from creators.
    const orphanedOptions = target?.options || [];
    setBusy(true);
    setError(null);
    try {
      const nextGroups = groups.filter((_, i) => i !== groupIdx);
      const nextSubs = { ...subcategories, [parent]: nextGroups };
      await writeTaxonomy(selectableCategories, nextSubs);
      // Remove each option from creators.
      for (const opt of orphanedOptions) await cascade(opt, null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete group.");
    } finally {
      setBusy(false);
    }
  };

  const addOption = async (parent: string, groupIdx: number) => {
    const key = `${parent}::${groupIdx}`;
    const name = (newOption[key] || "").trim();
    if (!name) return;
    const groups = [...(subcategories[parent] || [])];
    const target = { ...(groups[groupIdx] as FilterGroup) };
    if (target.options.includes(name as any)) {
      setError(`"${name}" already exists in this group.`);
      return;
    }
    target.options = [...target.options, name as any];
    groups[groupIdx] = target;
    const nextSubs = { ...subcategories, [parent]: groups };
    setBusy(true);
    setError(null);
    try {
      await writeTaxonomy(selectableCategories, nextSubs);
      setNewOption({ ...newOption, [key]: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to add option.");
    } finally {
      setBusy(false);
    }
  };

  const renameOption = async (parent: string, groupIdx: number, oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditing(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Update inside the group's options. Also update any other place where
      // this name appears as an option (it might be referenced in multiple
      // groups in the future). We iterate the whole subcategories record.
      const nextSubs: Record<string, FilterItem[]> = {};
      for (const [k, v] of Object.entries(subcategories)) {
        nextSubs[k === oldName ? trimmed : k] = v.map((item) => {
          if (typeof item === "string") return item === oldName ? trimmed : item;
          const g = item as FilterGroup;
          return {
            ...g,
            options: g.options.map((o) => (o === oldName ? (trimmed as any) : o)),
          };
        });
      }
      // Also rename in selectableCategories if the option happened to be a top-level main.
      const nextSelectable = selectableCategories.map((c) => (c === oldName ? trimmed : c));
      await writeTaxonomy(nextSelectable, nextSubs);
      await cascade(oldName, trimmed);
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "Rename failed.");
    } finally {
      setBusy(false);
      // Close the confirm modal if the rename was triggered from there.
      setConfirm(null);
    }
  };

  const deleteOption = async (parent: string, groupIdx: number, name: string) => {
    setBusy(true);
    setError(null);
    try {
      const groups = [...(subcategories[parent] || [])];
      const target = { ...(groups[groupIdx] as FilterGroup) };
      target.options = target.options.filter((o) => o !== name);
      groups[groupIdx] = target;
      const nextSubs = { ...subcategories, [parent]: groups };
      await writeTaxonomy(selectableCategories, nextSubs);
      await cascade(name, null);
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // ---- Confirm modal triggers ----

  const askDeleteMain = async (name: string) => {
    setBusy(true);
    const usage = await countUsage(name);
    setBusy(false);
    setConfirm({ kind: "delete-main", name, usage });
  };
  const askDeleteOption = async (parent: string, groupIdx: number, name: string) => {
    setBusy(true);
    const usage = await countUsage(name);
    setBusy(false);
    setConfirm({ kind: "delete-option", parent, groupIdx, name, usage });
  };

  // ---- UI ----

  const inputClass = `px-3 py-2 text-sm font-medium border-2 outline-none ${
    isDarkMode ? "bg-black border-zinc-700 focus:border-white text-white" : "bg-white border-gray-300 focus:border-black text-black"
  }`;
  const btnPrimary = `px-3 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
    isDarkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black hover:bg-gray-800"
  }`;
  const btnGhost = `px-3 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
    isDarkMode ? "border-white/30 text-white hover:bg-white/10" : "border-black/30 text-black hover:bg-black/5"
  }`;
  const btnDanger = `inline-flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
    isDarkMode ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-red-500/40 text-red-600 hover:bg-red-50"
  }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Categories</h1>
        <p className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Manage main categories, groups and options. Renames cascade to every creator using them.
        </p>
      </div>

      {error && (
        <div className={`px-3 py-2 text-xs font-bold border-2 ${isDarkMode ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-red-500/50 text-red-600 bg-red-50"}`}>
          {error}
        </div>
      )}

      {/* Add new main category */}
      <div className={`p-4 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3">Add main category</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newMainName}
            onChange={(e) => setNewMainName(e.target.value)}
            placeholder="e.g. Tours"
            className={`${inputClass} flex-1 min-w-[200px]`}
          />
          <button type="button" onClick={addMainCategory} disabled={busy || !newMainName.trim()} className={`${btnPrimary} disabled:opacity-50`}>
            <Plus className="inline w-4 h-4 mr-1" /> Add
          </button>
        </div>
      </div>

      {/* List of main categories */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-sm">Loading taxonomy...</div>
        ) : selectableCategories.map((cat, idx) => {
          const groups = (subcategories[cat] || []) as FilterItem[];
          const isOpen = expanded === cat;
          const isEditingMain = editing?.kind === "main" && editing.key === cat;
          return (
            <div key={cat} className={`border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
              {/* Header row */}
              <div className={`flex flex-wrap items-center gap-2 p-3 ${isDarkMode ? "bg-white/5" : "bg-black/5"}`}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : cat)}
                  className={`p-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                  title={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                {isEditingMain ? (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className={`${inputClass} flex-1 min-w-[200px]`}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const usage = await countUsage(cat);
                        if (usage > 0 && draftValue.trim() !== cat) {
                          setConfirm({ kind: "rename-main", oldName: cat, newName: draftValue.trim(), usage });
                        } else {
                          await renameMain(cat, draftValue);
                        }
                      }}
                      className={`${btnPrimary} disabled:opacity-50`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-bold uppercase tracking-widest text-sm">{cat}</span>
                    <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      ({groups.length} group{groups.length === 1 ? "" : "s"})
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button type="button" onClick={() => moveMain(idx, -1)} disabled={busy || idx === 0} className={`${btnGhost} disabled:opacity-30`} title="Move up">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => moveMain(idx, 1)} disabled={busy || idx === selectableCategories.length - 1} className={`${btnGhost} disabled:opacity-30`} title="Move down">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditing({ kind: "main", key: cat }); setDraftValue(cat); }}
                        className={btnGhost}
                        title="Rename"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => askDeleteMain(cat)} disabled={busy} className={`${btnDanger} disabled:opacity-50`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded body — groups + options */}
              {isOpen && (
                <div className="p-3 space-y-4">
                  {groups.length === 0 && (
                    <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>No groups yet.</p>
                  )}
                  {groups.map((g, gIdx) => {
                    if (typeof g === "string") return null;
                    const group = g as FilterGroup;
                    return (
                      <div key={gIdx} className={`border ${isDarkMode ? "border-white/10" : "border-black/10"} p-3`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-widest">
                            {group.groupName} <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>({group.options.length})</span>
                          </span>
                          <button type="button" onClick={() => deleteGroup(cat, gIdx)} disabled={busy} className={`${btnDanger} disabled:opacity-50`} title="Delete group">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {group.options.map((opt) => {
                            const optStr = String(opt);
                            const isEditingOpt = editing?.kind === `opt:${cat}:${gIdx}` && editing.key === optStr;
                            if (isEditingOpt) {
                              return (
                                <span key={optStr} className="inline-flex items-center gap-1">
                                  <input type="text" autoFocus value={draftValue} onChange={(e) => setDraftValue(e.target.value)} className={`${inputClass} text-xs`} />
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={async () => {
                                      const usage = await countUsage(optStr);
                                      if (usage > 0 && draftValue.trim() !== optStr) {
                                        setConfirm({ kind: "rename-option", parent: cat, groupIdx: gIdx, oldName: optStr, newName: draftValue.trim(), usage });
                                      } else {
                                        await renameOption(cat, gIdx, optStr, draftValue);
                                      }
                                    }}
                                    className={btnPrimary}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                                    <X className="w-4 h-4" />
                                  </button>
                                </span>
                              );
                            }
                            return (
                              <span key={optStr} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-widest border-2 ${isDarkMode ? "border-white/20 text-white" : "border-black/20 text-black"}`}>
                                {optStr}
                                <button type="button" onClick={() => { setEditing({ kind: `opt:${cat}:${gIdx}`, key: optStr }); setDraftValue(optStr); }} title="Rename" className={`${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"} ml-1`}>
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => askDeleteOption(cat, gIdx, optStr)} className={`${isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-500"}`} title="Delete">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            value={newOption[`${cat}::${gIdx}`] || ""}
                            onChange={(e) => setNewOption({ ...newOption, [`${cat}::${gIdx}`]: e.target.value })}
                            placeholder="New option..."
                            className={`${inputClass} flex-1 min-w-[180px] text-xs`}
                          />
                          <button type="button" onClick={() => addOption(cat, gIdx)} disabled={busy} className={`${btnPrimary} disabled:opacity-50`}>
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add new group inside this main category */}
                  <div className={`border border-dashed ${isDarkMode ? "border-white/20" : "border-black/20"} p-3 flex flex-wrap gap-2`}>
                    <input
                      type="text"
                      value={newGroupName[cat] || ""}
                      onChange={(e) => setNewGroupName({ ...newGroupName, [cat]: e.target.value })}
                      placeholder="New group name..."
                      className={`${inputClass} flex-1 min-w-[180px] text-xs`}
                    />
                    <button type="button" onClick={() => addGroup(cat)} disabled={busy} className={`${btnPrimary} disabled:opacity-50`}>
                      <Plus className="w-4 h-4 mr-1 inline" /> Add group
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation modal for destructive ops */}
      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`relative w-full max-w-md p-6 brutalist-border brutalist-shadow ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
            <h3 className="text-lg font-bold uppercase tracking-widest mb-3">
              {confirm.kind.startsWith("delete") ? "Delete" : "Rename"}
              {" "}
              {confirm.kind.includes("main") ? "main category" : "option"}?
            </h3>
            <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              {confirm.kind === "delete-main" && (
                <>
                  <strong>{(confirm as any).name}</strong> will be removed from the taxonomy.
                  {confirm.usage > 0 && <> It is currently used by <strong>{confirm.usage}</strong> creator{confirm.usage === 1 ? "" : "s"} — they will lose this category.</>}
                </>
              )}
              {confirm.kind === "delete-option" && (
                <>
                  <strong>{(confirm as any).name}</strong> will be removed from the taxonomy.
                  {confirm.usage > 0 && <> It is currently used by <strong>{confirm.usage}</strong> creator{confirm.usage === 1 ? "" : "s"} — they will lose this subcategory.</>}
                </>
              )}
              {confirm.kind === "rename-main" && (
                <>
                  Rename <strong>{(confirm as any).oldName}</strong> → <strong>{(confirm as any).newName}</strong>.
                  {confirm.usage > 0 && <> This will update <strong>{confirm.usage}</strong> creator{confirm.usage === 1 ? "" : "s"} that reference it.</>}
                </>
              )}
              {confirm.kind === "rename-option" && (
                <>
                  Rename <strong>{(confirm as any).oldName}</strong> → <strong>{(confirm as any).newName}</strong>.
                  {confirm.usage > 0 && <> This will update <strong>{confirm.usage}</strong> creator{confirm.usage === 1 ? "" : "s"} that reference it.</>}
                </>
              )}
            </p>
            {confirm.kind.startsWith("delete") && (
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                ⚠ This cannot be undone.
              </p>
            )}
            <div className="flex flex-col-reverse md:flex-row gap-3 justify-end">
              <button type="button" onClick={() => setConfirm(null)} disabled={busy} className={`${btnGhost} disabled:opacity-50`}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (confirm.kind === "delete-main") await deleteMain(confirm.name);
                  else if (confirm.kind === "delete-option") await deleteOption(confirm.parent, confirm.groupIdx, confirm.name);
                  else if (confirm.kind === "rename-main") await renameMain(confirm.oldName, confirm.newName);
                  else if (confirm.kind === "rename-option") await renameOption(confirm.parent, confirm.groupIdx, confirm.oldName, confirm.newName);
                }}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 ${
                  confirm.kind.startsWith("delete")
                    ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                    : btnPrimary
                }`}
              >
                {busy ? "Working..." : confirm.kind.startsWith("delete") ? "Delete" : "Rename & cascade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
