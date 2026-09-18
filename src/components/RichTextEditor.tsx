import { useEffect, useRef } from "react";
import { Bold, List, ListOrdered, RemoveFormatting } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeRichTextHtml(value: string): string {
  const raw = String(value || "");
  if (!raw.trim()) return "";

  // Legacy guides contain plain text. Preserve their line breaks safely.
  if (!/<\/?(strong|b|ul|ol|li|br|p)\b/i.test(raw)) {
    return escapeHtml(raw).replace(/\r?\n/g, "<br />");
  }

  if (typeof DOMParser === "undefined") return escapeHtml(raw);

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const allowed = new Set(["STRONG", "B", "UL", "OL", "LI", "BR", "P"]);

  const clean = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!allowed.has(el.tagName)) {
          el.replaceWith(...Array.from(el.childNodes));
          return;
        }
        Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
        clean(el);
      }
    });
  };

  clean(doc.body);
  return doc.body.innerHTML;
}

function prepareEditorHtml(value: string): string {
  return sanitizeRichTextHtml(value);
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = "120px" }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = prepareEditorHtml(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [value]);

  function runCommand(command: "bold" | "insertUnorderedList" | "insertOrderedList" | "removeFormat") {
    editorRef.current?.focus();
    document.execCommand(command, false);
    const html = editorRef.current?.innerHTML || "";
    onChange(html);
  }

  return (
    <div className="rounded-xl border border-marine-border bg-marine-dark/40 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-marine-border bg-marine-card/60">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("bold")} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-marine-text hover:bg-marine-accent/10 hover:text-marine-accent transition cursor-pointer" title="Bold">
          <Bold className="h-4 w-4" /> Bold
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertUnorderedList")} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-marine-text hover:bg-marine-accent/10 hover:text-marine-accent transition cursor-pointer" title="Bullet points">
          <List className="h-4 w-4" /> Bullets
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertOrderedList")} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-marine-text hover:bg-marine-accent/10 hover:text-marine-accent transition cursor-pointer" title="Numbered points">
          <ListOrdered className="h-4 w-4" /> Numbered
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("removeFormat")} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-marine-muted hover:bg-marine-accent/10 hover:text-marine-accent transition cursor-pointer" title="Clear formatting">
          <RemoveFormatting className="h-4 w-4" /> Clear
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Write the procedure..."}
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        className="w-full px-3.5 py-3 text-sm text-marine-text leading-relaxed outline-none overflow-auto [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-marine-muted/60 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5"
        style={{ minHeight }}
      />
    </div>
  );
}
