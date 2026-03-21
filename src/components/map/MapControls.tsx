"use client";

import { useState, useRef } from "react";
import { Search, Moon, Sun, Plus, Map, Heart, Globe, Building2, Home, X, Zap } from "lucide-react";
import type { Visit, WishlistItem } from "@/types/database";
import { clsx } from "clsx";
import { useLocale } from "@/hooks/useLocale";

export type FilterMode = "auto" | "countries" | "cities" | "neighborhoods" | "wishlist";

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
  const { t } = useLocale();

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
    setSearchQuery(""); setResults([]); setSearchOpen(false);
  };

  const isVisit = (item: Visit | WishlistItem): item is Visit => "rating" in item;

  const filters = [
    { value: "auto" as FilterMode, label: "⚡", title: "Auto", color: "amber" },
    { value: "countries" as FilterMode, label: t.filterCountries, color: "emerald" },
    { value: "cities" as FilterMode, label: t.filterCities, color: "emerald" },
    { value: "neighborhoods" as FilterMode, label: t.filterNeighborhoods, color: "emerald" },
    { value: "wishlist" as FilterMode, label: t.filterWishlist, color: "violet" },
  ];

  const activeStyle = (value: FilterMode, color: string) => {
    if (filterMode !== value) return "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]";
    if (color === "violet") return "bg-violet-500/25 text-violet-200 border border-violet-400/40 shadow-[0_0_10px_rgba(139,92,246,0.3)]";
    if (color === "amber") return "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    return "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
  };

  return (
    <>
      {/* Top bar — search + dark mode + add (desktop) */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">

        {/* Search bar */}
        <div className="relative flex-1 min-w-0">
          {searchOpen ? (
            <div className="glass rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onKeyDown={e => e.key === "Escape" && setSearchOpen(false)}
                  placeholder={t.searchPlaces}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none min-w-0"
                />
                <button onClick={() => { setSearchOpen(false); setResults([]); setSearchQuery(""); }}>
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
              {results.length > 0 && (
                <div className="border-t border-[var(--surface-border)]">
                  {results.map(item => (
                    <button key={item.id} onClick={() => selectResult(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                      <span>{isVisit(item) ? "📍" : "💜"}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.place_name}</div>
                        {item.country_name && <div className="text-xs text-[var(--text-muted)]">{item.country_name}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg w-full"
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-xs">{t.searchPlaces}</span>
            </button>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="glass rounded-xl p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg flex-shrink-0"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Add button — desktop only */}
        <button
          onClick={onAddVisit}
          className="hidden lg:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-lg flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addPlace}</span>
        </button>
      </div>

      {/* Filter bar — scrollable, all visible */}
      <div className="absolute top-14 left-0 right-0 z-10 px-3">
        <div
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filters.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setFilterMode(value)}
              className={clsx(
                "flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex-shrink-0 active:scale-95 whitespace-nowrap",
                activeStyle(value, color)
              )}
            >
              {label}
            </button>
          ))}
          <div className="w-2 flex-shrink-0" />
        </div>
      </div>

      {/* FAB — mobile floating add button */}
      <button
        onClick={onAddVisit}
        className="absolute bottom-24 right-4 z-20 lg:hidden w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>
    </>
  );
}
