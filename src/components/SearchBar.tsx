import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchAll, type SearchResult } from "../lib/queries";
import { navigate } from "../lib/router";

type Props = {
  onNavigate?: () => void;
};

export function SearchBar({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    guides: [],
    equipment: [],
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults({ guides: [], equipment: [] });
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(q);
        setResults(r);
        setOpen(true);
      } catch {
        setResults({ guides: [], equipment: [] });
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults =
    results.guides.length > 0 || results.equipment.length > 0;

  function go(fn: () => void) {
    fn();
    setQuery("");
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search symptoms, guides, equipment..."
          className="w-full rounded-lg bg-white border border-slate-200 pl-9 pr-9 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 transition"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (query.trim() || loading) && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 overflow-hidden animate-slide-down">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-400">
              Searching...
            </div>
          )}
          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-slate-400">
              No matches for "{query}".
            </div>
          )}
          {!loading && hasResults && (
            <div className="max-h-96 overflow-y-auto scrollbar-marine">
              {results.equipment.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Equipment
                  </div>
                  {results.equipment.map((eq) => (
                    <button
                      key={eq.id}
                      onClick={() => go(() => navigate({ name: "equipment", id: eq.id }))}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition text-sm"
                    >
                      <div className="font-medium text-slate-800">{eq.name}</div>
                      {eq.description && (
                        <div className="text-xs text-slate-400 line-clamp-1">
                          {eq.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {results.guides.length > 0 && (
                <div className="p-2 border-t border-slate-200">
                  <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Troubleshooting Guides
                  </div>
                  {results.guides.slice(0, 8).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => go(() => navigate({ name: "guide", id: g.id }))}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition text-sm"
                    >
                      <div className="font-medium text-slate-800 line-clamp-1">
                        {g.title}
                      </div>
                      {g.equipment && (
                        <div className="text-xs text-blue-600">
                          {g.equipment.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
