"use client";

import { useState } from "react";
import { Search, Moon, Sun, Plus, Map, Heart, Globe, X } from "lucide-react";
import type { Visit, WishlistItem } from "@/types/database";
import { clsx } from "clsx";

type FilterMode = "all" | "visited" | "wishlist";

interface Props {
  filterMode: FilterMode;
  setFilterMode: (m: FilterMode) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  visits: Visit[];
  wishlist: WishlistItem[];
  onFlyTo: (lat: number, lng: number) => void;
  onAddVisit: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function MapControls({
  filterMode, setFilterMode, isDark, setIsDark,
  visits, wishlist, onFlyTo, onAddVisit, searchQuery, setSearchQuery,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<(Visit | WishlistItem)[]>([]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const vResults = visits.filter(v =>
      v.place_name.toLowerCase().includes(lower) ||
      v.country_name?.toLowerCase().includes(lower)
    );
    const wResults = wishlist.filter(w =>
      w.place_name.toLowerCase().includes(lower) ||
      w.country_name?.toLowerCase().includes(lower)
    );
    setResults([...vResults, ...wResults].slice(0, 6));
  };

  const selectResult = (item: Visit | WishlistItem) => {
    if (item.lat && item.lng) onFlyTo(item.lat, item.lng);
    setSearchQuery("");
    setResults([]);
    setSearchOpen(false);
  };

  const isVisit = (item: Visit | WishlistItem): item is Visit => "rating" in item;

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          {searchOpen ? (
            <div className="glass rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3">
                <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search your places..."
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                />
                <button onClick={() => { setSearchOpen(false); setResults([]); setSearchQuery(""); }}>
                  <X className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                </button>
              </div>
              {results.length > 0 && (
                <div className="border-t border-[var(--surface-border)]">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectResult(item)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-base">{isVisit(item) ? "📍" : "💜"}</span>
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{item.place_name}</div>
                        {item.country_name && (
                          <div className="text-xs text-[var(--text-muted)]">{item.country_name}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 glass rounded-2xl px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg"
            >
              <Search className="w-4 h-4" />
              <span>Search places...</span>
            </button>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="glass rounded-xl p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Add button */}
        <button
          onClick={onAddVisit}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add place</span>
        </button>
      </div>

      {/* Filter pills */}
      <div className="absolute top-16 left-4 z-10 flex items-center gap-2">
        {([
          { value: "all", icon: Globe, label: "All" },
          { value: "visited", icon: Map, label: "Visited" },
          { value: "wishlist", icon: Heart, label: "Wishlist" },
        ] as const).map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setFilterMode(value)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 shadow-lg",
              filterMode === value
                ? value === "wishlist"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
