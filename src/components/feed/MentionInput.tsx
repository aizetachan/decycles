import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";
import { useMentionables, type Mentionable } from "../../hooks/useMentionables";
import type { PostMention } from "../../types";

/**
 * Rich text input for the composer: a contentEditable that renders @mentions as
 * bold, atomic (non-editable) inline spans, so tagged people stand out while
 * typing with no caret drift. Reports the plain text + mentions via onChange.
 */
export function MentionInput({
  isDarkMode,
  placeholder,
  resetKey,
  onChange,
  initialText,
  initialMentions,
}: {
  isDarkMode: boolean;
  placeholder: string;
  resetKey: number;
  onChange: (text: string, mentions: PostMention[]) => void;
  initialText?: string;
  initialMentions?: PostMention[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const { items, load } = useMentionables();
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [empty, setEmpty] = useState(true);

  const suggestions =
    query !== null
      ? items.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : [];

  // Build initial content (edit mode) / clear when the parent bumps resetKey.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    if (initialText) {
      buildInitial(ref.current, initialText, initialMentions || []);
      const { text, mentions } = parseEditor(ref.current);
      setEmpty(text.trim().length === 0);
      onChange(text, mentions);
    } else {
      setEmpty(true);
    }
    setQuery(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const emit = () => {
    if (!ref.current) return;
    const { text, mentions } = parseEditor(ref.current);
    setEmpty(text.trim().length === 0 && !/\S/.test(text));
    onChange(text, mentions);
  };

  const detectMention = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setQuery(null);
      return;
    }
    const r = sel.getRangeAt(0);
    const node = r.endContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      setQuery(null);
      return;
    }
    const before = (node.textContent || "").slice(0, r.endOffset);
    const m = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (!m) {
      setQuery(null);
      return;
    }
    const q = m[1];
    const mr = document.createRange();
    mr.setStart(node, r.endOffset - q.length - 1);
    mr.setEnd(node, r.endOffset);
    rangeRef.current = mr;
    load();
    setQuery(q);
    setActive(0);
  };

  const onInput = () => {
    emit();
    detectMention();
  };

  const insertMention = (c: Mentionable) => {
    const mr = rangeRef.current;
    if (!mr) return;
    mr.deleteContents();
    const el = createMentionEl(c);
    mr.insertNode(el);
    const space = document.createTextNode(" ");
    el.after(space);
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.setStartAfter(space);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    setQuery(null);
    ref.current?.focus();
    emit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (query !== null && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[Math.min(active, suggestions.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery(null);
        return;
      }
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      r.deleteContents();
      const node = document.createTextNode(text);
      r.insertNode(node);
      r.setStartAfter(node);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    emit();
  };

  return (
    <div className="relative">
      <div
        className={`relative border-2 transition-colors ${
          isDarkMode
            ? "bg-black border-zinc-700 focus-within:border-white"
            : "bg-gray-50 border-gray-300 focus-within:border-black"
        }`}
      >
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => setTimeout(() => setQuery(null), 120)}
          className={`min-h-[3rem] whitespace-pre-wrap break-words p-3 text-sm md:text-base outline-none ${
            isDarkMode ? "text-white caret-white" : "text-black caret-black"
          }`}
        />
        {empty && (
          <div
            className={`pointer-events-none absolute left-0 top-0 p-3 text-sm md:text-base ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
          >
            {placeholder}
          </div>
        )}
      </div>

      {query !== null && suggestions.length > 0 && (
        <div
          className={`absolute left-0 top-full z-20 mt-1 w-full max-w-sm overflow-hidden brutalist-border ${isDarkMode ? "bg-black border-zinc-700" : "bg-white"}`}
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.id}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                i === active ? (isDarkMode ? "bg-zinc-800" : "bg-gray-100") : ""
              }`}
            >
              {s.image ? (
                <img src={s.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-300 shrink-0" />
              )}
              <span className="truncate text-sm font-bold">{s.name}</span>
              <span className={`ml-auto text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                {s.type === "creator" ? "Shop" : "User"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Build the editor DOM from text + mentions (edit mode), inverse of parseEditor. */
function buildInitial(root: HTMLElement, text: string, mentions: PostMention[]) {
  if (!mentions.length) {
    root.appendChild(document.createTextNode(text));
    return;
  }
  const byLength = [...mentions].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp("@(" + byLength.map((m) => escapeRegex(m.name)).join("|") + ")", "g");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) root.appendChild(document.createTextNode(text.slice(last, match.index)));
    const name = match[1];
    const m = mentions.find((x) => x.name === name);
    if (m) root.appendChild(createMentionEl({ id: m.id, type: m.type, name: m.name }));
    else root.appendChild(document.createTextNode(`@${name}`));
    last = pattern.lastIndex;
  }
  if (last < text.length) root.appendChild(document.createTextNode(text.slice(last)));
}

function createMentionEl(c: Mentionable): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.mention = "1";
  span.dataset.mentionType = c.type;
  span.dataset.mentionId = c.id;
  span.dataset.mentionName = c.name;
  span.contentEditable = "false";
  span.className = "font-extrabold";
  span.textContent = `@${c.name}`;
  return span;
}

/** Walk the editor DOM into plain text + the mentions it contains. */
function parseEditor(root: HTMLElement): { text: string; mentions: PostMention[] } {
  const mentions: PostMention[] = [];
  let text = "";
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += (child.textContent || "").replace(/​/g, "");
      } else if (child instanceof HTMLElement) {
        if (child.dataset.mention) {
          const name = child.dataset.mentionName || "";
          text += `@${name}`;
          mentions.push({
            type: (child.dataset.mentionType as "creator" | "user") || "user",
            id: child.dataset.mentionId || "",
            name,
          });
        } else if (child.tagName === "BR") {
          text += "\n";
        } else {
          const block = child.tagName === "DIV" || child.tagName === "P";
          if (block && text && !text.endsWith("\n")) text += "\n";
          walk(child);
        }
      }
    });
  };
  walk(root);
  return { text, mentions };
}
