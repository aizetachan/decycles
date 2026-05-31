import React, { useMemo, useState } from "react";
import {
  doc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { db } from "../../firebase";
import { useUI } from "../../contexts/UIContext";
import { useCategories } from "../../contexts/CategoriesContext";
import { FilterItem, FilterGroup } from "../../constants/categories";

/**
 * Admin filter editor.
 *
 * Filters are FilterGroups inside a category or subcategory whose name is
 * NOT "Category" (the "Category" group is the direct subcategory list and
 * is managed from /admin/categories instead). Examples of real filters:
 *   subcategories["Bikes & Frames"] → Build, Material
 *   subcategories["Components"]    → Frameset, Cockpit, Wheels, ...
 *
 * This page lists every entry in `subcategories` that can host filters and
 * lets the admin add/rename/delete filter groups + their options. Renames
 * and deletes cascade to creator docs (creators/*.subCategories) so the
 * public site reflects the change immediately.
 */

type ConfirmAction =
  | { kind: "delete-group"; parent: string; groupIdx: number; groupName: string; usage: number }
  | { kind: "delete-option"; parent: string; groupIdx: number; name: string; usage: number }
  | { kind: "rename-option"; parent: string; groupIdx: number; oldName: string; newName: string; usage: number };

export function FiltersAdmin() {
  const { isDarkMode } = useUI();
  const { selectableCategories, subcategories, loading } = useCategories();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: string; key: string } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [newGroupName, setNewGroupName] = useState<{ [parent: string]: string }>({});
  const [newOption, setNewOption] = useState<{ [key: string]: string }>({});
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taxRef = doc(db, "taxonomy", "main");

  // Build a hierarchy: each main category maps to its direct children, taken
  // from the main's "Category" group's options. Children appear even when
  // they don't have a taxonomy entry yet — adding their first filter group
  // creates the entry on the fly. Subcategories no main references end up
  // in a separate "Other" bucket.
  type ParentEntry = { name: string; isMain: boolean };
  const groupedHierarchy = useMemo(() => {
    const taxonomyKeys = new Set(Object.keys(subcategories));

    // Children of each main (every option of its "Category" group, regardless
    // of whether they currently have an entry in subcategories).
    const childrenByMain: Record<string, string[]> = {};
    const claimedChildren = new Set<string>();
    for (const main of selectableCategories) {
      const groups = subcategories[main] || [];
      const catGroup = groups.find(
        (g) => typeof g !== "string" && (g as FilterGroup).groupName === "Category",
      ) as FilterGroup | undefined;
      const opts = (catGroup?.options || []).map((o) => String(o));
      childrenByMain[main] = opts;
      opts.forEach((c) => claimedChildren.add(c));
    }

    // Subcategories that have a taxonomy entry but no main references them.
    const orphanSubcategories = Array.from(taxonomyKeys)
      .filter((k) => !selectableCategories.includes(k as any) && !claimedChildren.has(k))
      .sort((a, b) => a.localeCompare(b));

    const sections: { main: string; entries: ParentEntry[] }[] = selectableCategories.map((main) => {
      const childEntries: ParentEntry[] = (childrenByMain[main] || []).map((name) => ({ name, isMain: false }));
      return {
        main,
        entries: [{ name: main, isMain: true }, ...childEntries],
      };
    });
    return { sections, orphans: orphanSubcategories };
  }, [subcategories, selectableCategories]);

  // ---- Cascade ----
  const cascade = async (oldName: string, newNameOrNull: string | null) => {
    const snap = await getDocs(collection(db, "creators"));
    const writes: Promise<any>[] = [];
    let batch = writeBatch(db);
    let opsInBatch = 0;
    snap.forEach((d) => {
      const data: any = d.data();
      const subs: string[] = Array.isArray(data.subCategories) ? data.subCategories : [];
      if (!subs.includes(oldName)) return;
      const next = newNameOrNull
        ? subs.map((s) => (s === oldName ? newNameOrNull : s))
        : subs.filter((s) => s !== oldName);
      batch.update(d.ref, { subCategories: next });
      opsInBatch++;
      if (opsInBatch >= 400) {
        writes.push(batch.commit());
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    });
    if (opsInBatch > 0) writes.push(batch.commit());
    await Promise.all(writes);
  };

  const countUsage = async (name: string): Promise<number> => {
    const snap = await getDocs(collection(db, "creators"));
    let n = 0;
    snap.forEach((d) => {
      const data: any = d.data();
      const subs: string[] = Array.isArray(data.subCategories) ? data.subCategories : [];
      if (subs.includes(name)) n++;
    });
    return n;
  };

  // ---- Mutations ----
  const writeTaxonomy = async (nextSubs: Record<string, FilterItem[]>) => {
    await setDoc(taxRef, {
      selectableCategories,
      subcategories: nextSubs,
      updatedAt: serverTimestamp(),
    });
  };

  const addGroup = async (parent: string) => {
    const name = (newGroupName[parent] || "").trim();
    if (!name) return;
    // "Category" only conflicts with the reserved subcategory list when the
    // parent is a main category — for everything else (Bikes & Frames,
    // Components, etc.) it's a regular filter group and is allowed.
    const isMainParent = selectableCategories.includes(parent as any);
    if (isMainParent && name.toLowerCase() === "category") {
      setError(`"Category" is reserved on main categories — manage that group from /admin/categories.`);
      return;
    }
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
      await writeTaxonomy(nextSubs);
      setNewGroupName({ ...newGroupName, [parent]: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to add filter group.");
    } finally {
      setBusy(false);
    }
  };

  const deleteGroup = async (parent: string, groupIdx: number) => {
    setBusy(true);
    setError(null);
    try {
      const groups = subcategories[parent] || [];
      const target = groups[groupIdx] as FilterGroup;
      const orphanedOptions = target?.options || [];
      const nextGroups = groups.filter((_, i) => i !== groupIdx);
      const nextSubs = { ...subcategories, [parent]: nextGroups };
      await writeTaxonomy(nextSubs);
      for (const opt of orphanedOptions) await cascade(opt as string, null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete filter group.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const addOption = async (parent: string, groupIdx: number) => {
    const key = `${parent}::${groupIdx}`;
    const name = (newOption[key] || "").trim();
    if (!name) return;
    const groups = [...(subcategories[parent] || [])];
    const target = { ...(groups[groupIdx] as FilterGroup) };
    if (target.options.includes(name as any)) {
      setError(`"${name}" already exists in this filter.`);
      return;
    }
    target.options = [...target.options, name as any];
    groups[groupIdx] = target;
    const nextSubs = { ...subcategories, [parent]: groups };
    setBusy(true);
    setError(null);
    try {
      await writeTaxonomy(nextSubs);
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
      await writeTaxonomy(nextSubs);
      await cascade(oldName, trimmed);
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "Rename failed.");
    } finally {
      setBusy(false);
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
      await writeTaxonomy(nextSubs);
      await cascade(name, null);
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // ---- Confirm triggers ----
  const askDeleteGroup = async (parent: string, groupIdx: number, groupName: string) => {
    setBusy(true);
    const target = (subcategories[parent] || [])[groupIdx] as FilterGroup;
    let usage = 0;
    for (const opt of target?.options || []) usage += await countUsage(opt as string);
    setBusy(false);
    setConfirm({ kind: "delete-group", parent, groupIdx, groupName, usage });
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

  // Single card for a category/subcategory. Used by both main sections and the
  // orphan section so the visual treatment stays consistent.
  const renderParentCard = (parent: string, isMain: boolean) => {
    const allGroups = (subcategories[parent] || []) as FilterItem[];
    const filterGroups: { idx: number; group: FilterGroup }[] = [];
    allGroups.forEach((g, i) => {
      if (typeof g === "string") return;
      const group = g as FilterGroup;
      // For main categories the "Category" group is the subcategory list,
      // managed from /admin/categories — hide here to avoid duplication.
      // For non-main entries every group is a filter and is shown.
      if (isMain && group.groupName === "Category") return;
      filterGroups.push({ idx: i, group });
    });
    const isOpen = expanded === parent;
    return (
      <div
        key={parent}
        className={`border-2 ${isDarkMode ? "border-white/20" : "border-black/20"} ${isMain ? "" : "ml-3 md:ml-6"}`}
      >
        <button
          type="button"
          onClick={() => setExpanded(isOpen ? null : parent)}
          className={`w-full flex flex-wrap items-center gap-2 p-3 text-left transition-colors ${isDarkMode ? "hover:bg-white/5 bg-white/5" : "hover:bg-black/5 bg-black/5"}`}
        >
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <span className="font-bold uppercase tracking-widest text-sm">{parent}</span>
          {isMain && (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${isDarkMode ? "border-white/20 text-gray-400" : "border-black/20 text-gray-500"}`}>
              main
            </span>
          )}
          <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            ({filterGroups.length} filter{filterGroups.length === 1 ? "" : "s"})
          </span>
        </button>

        {isOpen && (
          <div className="p-3 space-y-4">
            {filterGroups.length === 0 && (
              <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No filters yet. Add a filter group below.
              </p>
            )}
            {filterGroups.map(({ idx: gIdx, group }) => (
              <div key={gIdx} className={`border ${isDarkMode ? "border-white/10" : "border-black/10"} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {group.groupName} <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>({group.options.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => askDeleteGroup(parent, gIdx, group.groupName)}
                    disabled={busy}
                    className={`${btnDanger} disabled:opacity-50`}
                    title="Delete filter group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {group.options.map((opt) => {
                    const optStr = String(opt);
                    const isEditingOpt = editing?.kind === `opt:${parent}:${gIdx}` && editing.key === optStr;
                    if (isEditingOpt) {
                      return (
                        <span key={optStr} className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            className={`${inputClass} text-xs`}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              const usage = await countUsage(optStr);
                              if (usage > 0 && draftValue.trim() !== optStr) {
                                setConfirm({
                                  kind: "rename-option",
                                  parent,
                                  groupIdx: gIdx,
                                  oldName: optStr,
                                  newName: draftValue.trim(),
                                  usage,
                                });
                              } else {
                                await renameOption(parent, gIdx, optStr, draftValue);
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
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({ kind: `opt:${parent}:${gIdx}`, key: optStr });
                            setDraftValue(optStr);
                          }}
                          title="Rename"
                          className={`${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"} ml-1`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => askDeleteOption(parent, gIdx, optStr)}
                          title="Delete"
                          className={`${isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-500"}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newOption[`${parent}::${gIdx}`] || ""}
                    onChange={(e) => setNewOption({ ...newOption, [`${parent}::${gIdx}`]: e.target.value })}
                    placeholder="New option..."
                    className={`${inputClass} flex-1 min-w-[180px] text-xs`}
                  />
                  <button type="button" onClick={() => addOption(parent, gIdx)} disabled={busy} className={`${btnPrimary} disabled:opacity-50`}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className={`border border-dashed ${isDarkMode ? "border-white/20" : "border-black/20"} p-3 flex flex-wrap gap-2`}>
              <input
                type="text"
                value={newGroupName[parent] || ""}
                onChange={(e) => setNewGroupName({ ...newGroupName, [parent]: e.target.value })}
                placeholder="New filter group name..."
                className={`${inputClass} flex-1 min-w-[180px] text-xs`}
              />
              <button type="button" onClick={() => addGroup(parent)} disabled={busy} className={`${btnPrimary} disabled:opacity-50`}>
                <Plus className="w-4 h-4 mr-1 inline" /> Add filter
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Filters</h1>
        <p className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Manage filter groups inside categories and subcategories. Filters power the home sidebar and let visitors narrow down results. Renames cascade to every creator using them.
        </p>
      </div>

      {error && (
        <div className={`px-3 py-2 text-xs font-bold border-2 ${isDarkMode ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-red-500/50 text-red-600 bg-red-50"}`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm">Loading taxonomy...</div>
      ) : (
        <div className="space-y-8">
          {groupedHierarchy.sections.map(({ main, entries }) => (
            <section key={main} className="space-y-2">
              {/* Section header — visually delineates the main category. */}
              <h2 className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 ${isDarkMode ? "text-gray-400 border-white/10" : "text-gray-500 border-black/10"}`}>
                {main}
              </h2>
              <div className="space-y-2">
                {entries.map((entry) => renderParentCard(entry.name, entry.isMain))}
              </div>
            </section>
          ))}

          {groupedHierarchy.orphans.length > 0 && (
            <section className="space-y-2">
              <h2 className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 ${isDarkMode ? "text-gray-400 border-white/10" : "text-gray-500 border-black/10"}`}>
                Other
              </h2>
              <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                Subcategories that aren't linked to a main category. Edit the parent's "Category" group from <a href="/admin/categories" className="underline">Categories</a> to fix the link.
              </p>
              <div className="space-y-2">
                {groupedHierarchy.orphans.map((name) => renderParentCard(name, false))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`relative w-full max-w-md p-6 brutalist-border brutalist-shadow ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
            <h3 className="text-lg font-bold uppercase tracking-widest mb-3">
              {confirm.kind === "rename-option" ? "Rename option" : `Delete ${confirm.kind === "delete-group" ? "filter group" : "option"}?`}
            </h3>
            <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              {confirm.kind === "delete-group" && (
                <>
                  Filter group <strong>{(confirm as any).groupName}</strong> will be removed from {(confirm as any).parent}, along with all its options.
                  {confirm.usage > 0 && <> <strong>{confirm.usage}</strong> creator{confirm.usage === 1 ? "" : "s"} will lose options from this filter.</>}
                </>
              )}
              {confirm.kind === "delete-option" && (
                <>
                  <strong>{(confirm as any).name}</strong> will be removed from this filter.
                  {confirm.usage > 0 && <> <strong>{confirm.usage}</strong> creator{confirm.usage === 1 ? "" : "s"} currently use it — they will lose this filter value.</>}
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
                  if (confirm.kind === "delete-group") await deleteGroup(confirm.parent, confirm.groupIdx);
                  else if (confirm.kind === "delete-option") await deleteOption(confirm.parent, confirm.groupIdx, confirm.name);
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
